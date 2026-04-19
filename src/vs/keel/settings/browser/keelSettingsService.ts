/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { joinPath } from '../../../base/common/resources.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import {
	InstantiationType,
	registerSingleton,
} from '../../../platform/instantiation/common/extensions.js';
import { IFileService } from '../../../platform/files/common/files.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { IPathService } from '../../../workbench/services/path/common/pathService.js';
import {
	IKeelSettingsData,
	KEEL_SETTINGS_DEFAULTS,
	KEEL_SETTINGS_FILE_REL_PATH,
	KEEL_DATA_FOLDER_REL_PATH,
	KeelSettingsBrightness,
	KeelSettingsLanguage,
} from '../common/keelSettings.js';

/**
 * Service-Dekorator fuer den Keel-Settings-Service. Ausschliesslich die 7
 * Whitelist-Otto-Settings werden verwaltet — der Service kennt keine
 * VSCode-Default-Settings (Whitelist-Prinzip, siehe Welle-11-Spec, Abschnitt
 * "Negativ-Liste-Schutz").
 */
export const IKeelSettingsService = createDecorator<IKeelSettingsService>('keelSettingsService');

/**
 * Public-API des Keel-Settings-Service.
 *
 * File-First: alle Otto-Settings werden in `~/Keel/config/settings.json`
 * persistiert — auditierbar, git-able, backup-bar. Kein Datenbank-State, kein
 * VSCode-Storage-Key-Namespace.
 *
 * @invariant Der Service arbeitet rein asynchron. `getSettings()` liefert den
 *   aktuellen In-Memory-Snapshot (nach `initialize()`), `updateSetting()`
 *   persistiert und feuert `onDidChange` erst nach erfolgreichem Schreiben.
 */
export interface IKeelSettingsService {
	readonly _serviceBrand: undefined;

	/**
	 * Event, das bei jeder erfolgreichen Aenderung einer der 4
	 * persistierbaren Settings feuert (Sprache, Helligkeit, Benachrichtigungen,
	 * Nutzungs-Daten). Item 3 "Wo liegen meine Daten?" und Item 7 "Ueber Keel"
	 * sind read-only und feuern nicht. Item 6 "Zugang zu deinem Assistenten"
	 * ist in Welle 11 disabled.
	 */
	readonly onDidChange: Event<keyof IKeelSettingsData>;

	/**
	 * Liefert den URI des Otto-Daten-Ordners (`~/Keel/`). Wird im Settings-
	 * Flyout-Item 3 angezeigt und als Target fuer den
	 * `[Im Datei-Explorer oeffnen]`-Button verwendet.
	 */
	readonly dataLocationUri: URI;

	/**
	 * Wird vom Contribution-Code beim Startup aufgerufen. Liest die
	 * Settings-Datei, bei Fehler werden die Defaults uebernommen (defensiver
	 * Fallback — Otto soll nie auf ein Settings-Problem auflaufen).
	 */
	initialize(): Promise<void>;

	/**
	 * Liefert einen unveraenderlichen Snapshot der aktuellen Settings.
	 */
	getSettings(): IKeelSettingsData;

	/**
	 * Setzt die Sprache. Welle 11 akzeptiert nur `'de'`; `'en'` wird
	 * angenommen, wird aber erst in Welle 12 wirksam (Bundle-Thema).
	 */
	setLanguage(value: KeelSettingsLanguage): Promise<void>;

	/**
	 * Setzt die Helligkeit. Sofortige Wirkung wird vom Aufrufer getrennt
	 * erledigt (Theme-Switch im Flyout-Handler).
	 */
	setBrightness(value: KeelSettingsBrightness): Promise<void>;

	/**
	 * Setzt den Benachrichtigungen-Toggle.
	 */
	setNotifications(value: boolean): Promise<void>;

	/**
	 * Setzt den Nutzungs-Daten-Toggle. Default ist `false` (Privacy-First).
	 */
	setTelemetry(value: boolean): Promise<void>;
}

/**
 * Default-Implementation des `IKeelSettingsService`.
 *
 * Schreibt atomar via `IFileService.writeFile` — bei Fehler bleibt die
 * bestehende Datei unveraendert (VSCode-FileService kapselt die Atomizitaet
 * plattform-spezifisch).
 */
export class KeelSettingsService extends Disposable implements IKeelSettingsService {
	declare readonly _serviceBrand: undefined;

	private readonly _onDidChange = this._register(new Emitter<keyof IKeelSettingsData>());
	readonly onDidChange: Event<keyof IKeelSettingsData> = this._onDidChange.event;

	readonly dataLocationUri: URI;
	private readonly settingsFileUri: URI;

	private current: IKeelSettingsData = KEEL_SETTINGS_DEFAULTS;
	private initialized = false;

	constructor(
		@IFileService private readonly fileService: IFileService,
		@ILogService private readonly logService: ILogService,
		@IPathService pathService: IPathService,
	) {
		super();

		// IPathService.userHome({ preferLocal: true }) ist die sync-Variante;
		// wir wollen den lokalen Home-Pfad unabhaengig von einem moeglichen
		// Remote-Kontext, weil `~/Keel/config/settings.json` eine Otto-lokale
		// Ressource ist.
		const userHome = pathService.userHome({ preferLocal: true });
		this.dataLocationUri = joinPath(userHome, KEEL_DATA_FOLDER_REL_PATH);
		this.settingsFileUri = joinPath(userHome, KEEL_SETTINGS_FILE_REL_PATH);
	}

	async initialize(): Promise<void> {
		if (this.initialized) {
			return;
		}

		try {
			const exists = await this.fileService.exists(this.settingsFileUri);
			if (!exists) {
				this.current = KEEL_SETTINGS_DEFAULTS;
				this.initialized = true;
				return;
			}

			const content = await this.fileService.readFile(this.settingsFileUri);
			const raw = content.value.toString();
			const parsed = JSON.parse(raw) as Partial<IKeelSettingsData>;

			// Whitelist-Filter: nur die 4 bekannten Keys, alles andere wird
			// ignoriert. Damit kann keine alte/fremde Datei unbeabsichtigte
			// Settings einschleusen.
			this.current = {
				language: this.normalizeLanguage(parsed.language),
				brightness: this.normalizeBrightness(parsed.brightness),
				notifications: typeof parsed.notifications === 'boolean' ? parsed.notifications : KEEL_SETTINGS_DEFAULTS.notifications,
				telemetry: typeof parsed.telemetry === 'boolean' ? parsed.telemetry : KEEL_SETTINGS_DEFAULTS.telemetry,
			};
			this.initialized = true;
		} catch (err) {
			// Beschaedigte Datei: Defaults uebernehmen, Fehler loggen.
			// Otto sieht keine Toast-Meldung (waere Panik-Signal), der
			// Keel-Team-Log reicht.
			this.logService.warn('[KeelSettingsService] Einstellungs-Datei konnte nicht gelesen werden, Defaults werden genutzt.', err);
			this.current = KEEL_SETTINGS_DEFAULTS;
			this.initialized = true;
		}
	}

	getSettings(): IKeelSettingsData {
		return this.current;
	}

	async setLanguage(value: KeelSettingsLanguage): Promise<void> {
		if (this.current.language === value) {
			return;
		}
		this.current = { ...this.current, language: value };
		await this.persist();
		this._onDidChange.fire('language');
	}

	async setBrightness(value: KeelSettingsBrightness): Promise<void> {
		if (this.current.brightness === value) {
			return;
		}
		this.current = { ...this.current, brightness: value };
		await this.persist();
		this._onDidChange.fire('brightness');
	}

	async setNotifications(value: boolean): Promise<void> {
		if (this.current.notifications === value) {
			return;
		}
		this.current = { ...this.current, notifications: value };
		await this.persist();
		this._onDidChange.fire('notifications');
	}

	async setTelemetry(value: boolean): Promise<void> {
		if (this.current.telemetry === value) {
			return;
		}
		this.current = { ...this.current, telemetry: value };
		await this.persist();
		this._onDidChange.fire('telemetry');
	}

	/**
	 * Schreibt die aktuellen Settings nach `~/Keel/config/settings.json`.
	 * Bei Fehler wird der Fehler geloggt und der In-Memory-State bleibt
	 * erhalten — Otto sieht kein Error-Toast (Panik-Signal).
	 */
	private async persist(): Promise<void> {
		try {
			const json = JSON.stringify(this.current, null, 2);
			await this.fileService.writeFile(this.settingsFileUri, VSBuffer.fromString(json));
		} catch (err) {
			this.logService.error('[KeelSettingsService] Einstellungen konnten nicht gespeichert werden.', err);
		}
	}

	private normalizeLanguage(value: string | undefined): KeelSettingsLanguage {
		return value === 'en' ? 'en' : 'de';
	}

	private normalizeBrightness(value: string | undefined): KeelSettingsBrightness {
		if (value === 'light' || value === 'dark' || value === 'system') {
			return value;
		}
		return KEEL_SETTINGS_DEFAULTS.brightness;
	}
}

/**
 * Registriere den Service als Singleton. Delayed, damit er erst instanziert
 * wird, wenn er tatsaechlich angefordert wird — das Flyout konsumiert ihn
 * lazy beim ersten Gear-Klick.
 */
registerSingleton(IKeelSettingsService, KeelSettingsService, InstantiationType.Delayed);
