/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import {
	InstantiationType,
	registerSingleton,
} from '../../../platform/instantiation/common/extensions.js';
import { IKeelSettingsService } from '../../settings/browser/keelSettingsService.js';
import {
	KEEL_I18N_DEFAULT_LANGUAGE,
	KeelI18nLanguage,
} from '../common/keelI18n.js';

/**
 * Service-Dekorator fuer den Keel-i18n-Service (Welle 12, D-030).
 *
 * Der Service liefert synchron die aktive Sprache (`de` | `en`) und feuert
 * `onDidChangeLanguage`, sobald der `KeelSettingsService` eine Sprache-
 * Aenderung persistiert. Strings-Bundles (pro Modul) lesen diese Sprache
 * einmal beim Render — ein Live-Switch ohne Reload ist nicht vorgesehen
 * (Welle 12 nutzt Reload-Window-Mechanik, siehe
 * `keelLanguageSwitchCommand.ts`).
 */
export const IKeelI18nService = createDecorator<IKeelI18nService>('keelI18nService');

/**
 * Public-API des Keel-i18n-Service.
 */
export interface IKeelI18nService {
	readonly _serviceBrand: undefined;

	/**
	 * Event, das bei Sprache-Aenderung feuert. Neue Sprache als Payload.
	 * Consumer koennen damit ihre gecacheten Strings re-rendern — in Welle 12
	 * wird ein Reload-Window getriggert, also ist dieser Event primaer fuer
	 * Debugging/Tests.
	 */
	readonly onDidChangeLanguage: Event<KeelI18nLanguage>;

	/**
	 * Liefert die aktuell aktive Sprache. Synchron — basiert auf dem
	 * In-Memory-Snapshot des `KeelSettingsService`.
	 */
	getLanguage(): KeelI18nLanguage;

	/**
	 * Konvenienz-Helper: waehlt aus einem DE/EN-Paar den passenden String.
	 * Wird von den `*Strings.ts`-Modulen genutzt, wo fuer jeden User-facing
	 * String ein Paar vorliegt.
	 */
	pick(de: string, en: string): string;
}

/**
 * Default-Implementation des `IKeelI18nService`.
 */
export class KeelI18nService extends Disposable implements IKeelI18nService {
	declare readonly _serviceBrand: undefined;

	private readonly _onDidChangeLanguage = this._register(new Emitter<KeelI18nLanguage>());
	readonly onDidChangeLanguage: Event<KeelI18nLanguage> = this._onDidChangeLanguage.event;

	private currentLanguage: KeelI18nLanguage = KEEL_I18N_DEFAULT_LANGUAGE;

	constructor(
		@IKeelSettingsService private readonly settingsService: IKeelSettingsService,
	) {
		super();

		// Initialer Snapshot. `getSettings()` liefert immer den aktuellen
		// Stand — der Settings-Service wird vom Flyout und vom i18n-Consumer
		// ohnehin beim ersten Zugriff initialisiert.
		const lang = this.settingsService.getSettings().language;
		this.currentLanguage = lang === 'en' ? 'en' : 'de';

		// Auf Settings-Aenderung reagieren. Der Service feuert nur nach
		// erfolgreicher Persistenz — wir duerfen den Wert direkt uebernehmen.
		this._register(this.settingsService.onDidChange(key => {
			if (key !== 'language') {
				return;
			}
			const next = this.settingsService.getSettings().language === 'en' ? 'en' : 'de';
			if (next !== this.currentLanguage) {
				this.currentLanguage = next;
				this._onDidChangeLanguage.fire(next);
			}
		}));
	}

	getLanguage(): KeelI18nLanguage {
		return this.currentLanguage;
	}

	pick(de: string, en: string): string {
		return this.currentLanguage === 'en' ? en : de;
	}
}

/**
 * Singleton-Registrierung. Delayed — der Service wird lazy beim ersten Zugriff
 * instanziert.
 */
registerSingleton(IKeelI18nService, KeelI18nService, InstantiationType.Delayed);

/**
 * Globaler Lookup-Helper fuer `*Strings.ts`-Module, die ausserhalb der
 * Instantiation-Service-Kette arbeiten (reine String-Maps). Der Helper liest
 * den Service beim Aufruf aus einem eingeschleusten Getter — das ist ein
 * bewusstes kleines Global, das nur vom Bootstrap (contribution.ts) gesetzt
 * wird, damit Strings-Module synchron uebersetzen koennen, ohne selbst
 * DI-Clients zu werden.
 *
 * Vor dem Bootstrap-Aufruf (oder in Tests ohne DI) liefert der Helper die
 * Default-Sprache (Deutsch) — damit funktioniert er defensiv.
 */
let globalLanguageGetter: (() => KeelI18nLanguage) | undefined;

/**
 * Wird vom Contribution-Bootstrap aufgerufen, sobald der Service verfuegbar
 * ist. Ueberschreibt den Default-Getter.
 */
export function registerKeelI18nLanguageGetter(getter: () => KeelI18nLanguage): void {
	globalLanguageGetter = getter;
}

/**
 * Konvenienz-Helper fuer `*Strings.ts`-Module. Gibt das passende Pair-Element
 * zurueck, ohne dass der Aufrufer den Service selbst halten muss.
 *
 * Umlaute sind in beiden Sprachen bewusst erhalten — der Hygiene-Unicode-Check
 * wird von den `*Strings.ts`-Konsumenten ueber `allow-any-unicode-next-line`
 * bewusst respektiert.
 */
export function keelPickLanguage(de: string, en: string): string {
	const lang = globalLanguageGetter ? globalLanguageGetter() : KEEL_I18N_DEFAULT_LANGUAGE;
	return lang === 'en' ? en : de;
}
