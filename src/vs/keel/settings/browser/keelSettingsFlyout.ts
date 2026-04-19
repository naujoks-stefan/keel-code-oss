/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import './media/keelSettings.css';
import { $, addDisposableListener, append, clearNode, EventType, isHTMLElement } from '../../../base/browser/dom.js';
import { mainWindow } from '../../../base/browser/window.js';
import { Disposable, DisposableStore, IDisposable } from '../../../base/common/lifecycle.js';
import { KeyCode } from '../../../base/common/keyCodes.js';
import { StandardKeyboardEvent } from '../../../base/browser/keyboardEvent.js';
import {
	ConfigurationTarget,
	IConfigurationService,
} from '../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { IOpenerService } from '../../../platform/opener/common/opener.js';
import { IProductService } from '../../../platform/product/common/productService.js';
import { isMacintosh } from '../../../base/common/platform.js';
import { IKeelSettingsService } from './keelSettingsService.js';
import { keelSettingsStrings } from './strings/keelSettingsStrings.js';
import {
	KEEL_SETTINGS_FLYOUT_CLASS,
	KEEL_SETTINGS_ITEM_CLASS,
	KeelSettingsBrightness,
} from '../common/keelSettings.js';

/**
 * Flyout-Panel fuer den Keel-Einstellungen-Bereich (Welle 11).
 *
 * Das Flyout ist ein globales DOM-Overlay direkt am `<body>` des
 * Workbench-Fensters. Es wird lazy beim ersten Gear-Klick (D-026) erzeugt
 * und danach per `show()` / `hide()` toggled — beim Schliessen wird die DOM
 * erhalten, damit wiederholtes Oeffnen ohne Flash passiert.
 *
 * Schliess-Verhalten:
 * - Klick ausserhalb: sofort schliessen.
 * - Esc-Taste: schliessen + Fokus zurueck auf das aufrufende Element
 *   (best-effort, uebernimmt der Aufrufer via optionalem `focusReturnElement`).
 * - X-Button: expliziter Close.
 *
 * Keine Toggle-Semantik auf dem Gear-Icon selbst (Welle 11: Icon-Klick
 * oeffnet, weitere Klicks oeffnen wieder — kein Flip). Welle 12+ kann das
 * nachreichen, wenn User-Feedback es verlangt.
 *
 * Multi-Window-Hinweis: Wir binden Document-Listener und DOM-Mount an
 * `mainWindow` (Workbench-Hauptfenster). Da das Gear-Icon ausschliesslich in
 * der Hauptfenster-Activity-Bar existiert, ist ein Mehrfenster-Support fuer
 * das Flyout in Welle 11 nicht relevant — wenn Otto spaeter in einem zweiten
 * Fenster kein Flyout oeffnen kann, ist das ein bewusster Welle-12-Scope.
 */
export class KeelSettingsFlyout extends Disposable {

	private rootEl: HTMLDivElement | undefined;
	private bodyEl: HTMLDivElement | undefined;
	private closeBtnEl: HTMLButtonElement | undefined;
	private readonly viewDisposables = this._register(new DisposableStore());
	private globalListenersDisposables: DisposableStore | undefined;
	private focusReturnElement: HTMLElement | undefined;
	private visible = false;
	private initializedPromise: Promise<void> | undefined;

	constructor(
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IKeelSettingsService private readonly settingsService: IKeelSettingsService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IOpenerService private readonly openerService: IOpenerService,
		@IProductService private readonly productService: IProductService,
	) {
		super();
		// Instantiation-Service wird im Moment nicht direkt benoetigt, aber fuer
		// zukuenftige Item-Erweiterungen (z.B. Sub-Panels via Child-Services)
		// halten wir die Injection explizit.
		void this.instantiationService;
	}

	/**
	 * Oeffnet das Flyout. Wenn noch nicht gerendert, baut es die DOM auf.
	 * Der zweite Aufruf bei bereits offenem Flyout ist ein No-Op.
	 *
	 * @param focusReturnElement Optionales Element, das beim Schliessen via
	 *   Esc den Fokus zurueckbekommt (Accessibility-Pflicht).
	 */
	async show(focusReturnElement?: HTMLElement): Promise<void> {
		if (this.visible) {
			return;
		}
		this.focusReturnElement = focusReturnElement;

		// Initialisierung (Read aus ~/Keel/config/settings.json) einmalig und
		// gecached — wiederholtes Oeffnen wartet auf die eine Initialisierung.
		if (!this.initializedPromise) {
			this.initializedPromise = this.settingsService.initialize();
		}
		await this.initializedPromise;

		if (!this.rootEl) {
			this.buildRoot();
		}
		if (this.rootEl && !this.rootEl.isConnected) {
			mainWindow.document.body.appendChild(this.rootEl);
		}

		this.renderBody();
		this.registerGlobalListeners();

		// Mikrotask-Delay, damit der DOM-Einfuegung eine Frame zum Reflow hat,
		// bevor die Transition greift — sonst snappt die Animation.
		queueMicrotask(() => {
			this.rootEl?.classList.add('keel-settings-flyout-visible');
		});

		this.visible = true;

		// Erstes fokus-bares Element im Flyout fokussieren (X-Button).
		queueMicrotask(() => {
			this.closeBtnEl?.focus();
		});
	}

	/**
	 * Schliesst das Flyout. DOM bleibt erhalten, wird nur aus dem `<body>`
	 * entfernt, damit wiederholtes Oeffnen schnell ist.
	 */
	hide(): void {
		if (!this.visible) {
			return;
		}
		this.visible = false;
		this.rootEl?.classList.remove('keel-settings-flyout-visible');
		this.globalListenersDisposables?.dispose();
		this.globalListenersDisposables = undefined;

		// Nach der Fade-Out-Transition DOM aus body entfernen (nicht disposen).
		const el = this.rootEl;
		if (el) {
			const removeAfter = () => {
				if (!this.visible && el.parentNode === mainWindow.document.body) {
					mainWindow.document.body.removeChild(el);
				}
			};
			setTimeout(removeAfter, 220);
		}

		// Fokus zurueck auf das aufrufende Element (z.B. Gear-Icon).
		this.focusReturnElement?.focus();
		this.focusReturnElement = undefined;
	}

	override dispose(): void {
		this.globalListenersDisposables?.dispose();
		if (this.rootEl && this.rootEl.parentNode === mainWindow.document.body) {
			mainWindow.document.body.removeChild(this.rootEl);
		}
		this.rootEl = undefined;
		super.dispose();
	}

	// --- Private ---

	private buildRoot(): void {
		const root = $<HTMLDivElement>(`div.${KEEL_SETTINGS_FLYOUT_CLASS}`, {
			role: 'dialog',
			'aria-modal': 'false',
			'aria-label': keelSettingsStrings.flyoutAria(),
		});

		const header = append(root, $<HTMLDivElement>('div.keel-settings-flyout-header'));
		append(header, $<HTMLHeadingElement>('h2.keel-settings-flyout-title', {}, keelSettingsStrings.flyoutHeader()));
		const closeBtn = append(header, $<HTMLButtonElement>('button.keel-settings-flyout-close', {
			type: 'button',
			'aria-label': keelSettingsStrings.flyoutCloseAria(),
		}));
		append(closeBtn, $<HTMLSpanElement>('span.codicon.codicon-close', { 'aria-hidden': 'true' }));
		this.viewDisposables.add(addDisposableListener(closeBtn, EventType.CLICK, (e: MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			this.hide();
		}));
		this.closeBtnEl = closeBtn;

		this.bodyEl = append(root, $<HTMLDivElement>('div.keel-settings-flyout-body'));

		this.rootEl = root;
	}

	private renderBody(): void {
		if (!this.bodyEl) {
			return;
		}
		this.viewDisposables.clear();
		clearNode(this.bodyEl);

		const settings = this.settingsService.getSettings();
		this.renderLanguageItem(this.bodyEl, settings.language);
		this.renderBrightnessItem(this.bodyEl, settings.brightness);
		this.renderDataLocationItem(this.bodyEl);
		this.renderNotificationsItem(this.bodyEl, settings.notifications);
		this.renderTelemetryItem(this.bodyEl, settings.telemetry);
		this.renderAssistantItem(this.bodyEl);
		this.renderAboutItem(this.bodyEl);
	}

	private registerGlobalListeners(): void {
		this.globalListenersDisposables?.dispose();
		const store = new DisposableStore();
		this.globalListenersDisposables = this._register(store);

		// Klick ausserhalb: Flyout schliessen. Wir binden an mainWindow.document
		// (Workbench-Hauptfenster) — das Flyout existiert nur dort.
		store.add(addDisposableListener(mainWindow.document, EventType.MOUSE_DOWN, (e: MouseEvent) => {
			if (!this.rootEl || !this.visible) {
				return;
			}
			const target = e.target;
			if (isHTMLElement(target) && this.rootEl.contains(target)) {
				return;
			}
			// Klicks auf das Gear-Icon selbst (data-attribute) nicht als "ausserhalb"
			// werten — sonst fired das Icon-Click-Handler und reopent das Flyout
			// gleich wieder.
			if (isHTMLElement(target) && target.closest('[data-keel-settings-trigger]')) {
				return;
			}
			this.hide();
		}));

		// Esc: schliessen
		store.add(addDisposableListener(mainWindow.document, EventType.KEY_DOWN, (e: KeyboardEvent) => {
			if (!this.visible) {
				return;
			}
			const evt = new StandardKeyboardEvent(e);
			if (evt.keyCode === KeyCode.Escape) {
				evt.preventDefault();
				evt.stopPropagation();
				this.hide();
			}
		}, /* useCapture */ true));
	}

	// --- Items ---

	private renderLanguageItem(parent: HTMLElement, current: string): void {
		const item = this.appendItem(parent, 'language', keelSettingsStrings.languageLabel(), keelSettingsStrings.languageDescription());

		const select = append(item, $<HTMLSelectElement>('select.keel-settings-select', {
			'aria-label': keelSettingsStrings.languageLabel(),
		}));

		const optDe = append(select, $<HTMLOptionElement>('option', { value: 'de' }, keelSettingsStrings.languageGerman()));
		optDe.selected = current === 'de';

		const optEn = append(select, $<HTMLOptionElement>('option', { value: 'en' }, keelSettingsStrings.languageEnglishComingSoon()));
		// Welle 11: en ist Dropdown-disabled, damit Otto die kommende Sprache
		// sieht, ohne Frust durch Verstecken. Final-decision Abschnitt 2.
		optEn.disabled = true;
		optEn.selected = current === 'en';

		this.viewDisposables.add(addDisposableListener(select, EventType.CHANGE, () => {
			const value = select.value === 'en' ? 'en' : 'de';
			void this.settingsService.setLanguage(value);
			// Neustart-Hinweis inline einblenden
			this.ensureInlineHint(item, 'language', keelSettingsStrings.languageRestartHint());
		}));
	}

	private renderBrightnessItem(parent: HTMLElement, current: string): void {
		const item = this.appendItem(parent, 'brightness', keelSettingsStrings.brightnessLabel(), keelSettingsStrings.brightnessDescription());

		const group = append(item, $<HTMLDivElement>('div.keel-settings-radio-group', { role: 'radiogroup', 'aria-label': keelSettingsStrings.brightnessLabel() }));

		const options: Array<{ value: KeelSettingsBrightness; label: string }> = [
			{ value: 'light', label: keelSettingsStrings.brightnessLight() },
			{ value: 'dark', label: keelSettingsStrings.brightnessDark() },
			{ value: 'system', label: keelSettingsStrings.brightnessSystem() },
		];

		const buttons: HTMLButtonElement[] = [];
		for (const opt of options) {
			const btn = append(group, $<HTMLButtonElement>('button.keel-settings-radio', {
				type: 'button',
				role: 'radio',
				'aria-checked': String(current === opt.value),
				'data-value': opt.value,
			}, opt.label));
			if (current === opt.value) {
				btn.classList.add('keel-settings-radio-selected');
			}
			buttons.push(btn);
			this.viewDisposables.add(addDisposableListener(btn, EventType.CLICK, () => {
				void this.applyBrightness(opt.value);
				// Radio-Group visuell aktualisieren
				for (const b of buttons) {
					const match = b === btn;
					b.classList.toggle('keel-settings-radio-selected', match);
					b.setAttribute('aria-checked', String(match));
				}
			}));
		}
	}

	private async applyBrightness(value: KeelSettingsBrightness): Promise<void> {
		await this.settingsService.setBrightness(value);

		// Sofort-Wirkung aufs VSCode-Theme. Wir nutzen die Upstream-
		// `workbench.colorTheme`-Konfiguration mit sanen Defaults. Autodetect
		// wird ueber `window.autoDetectColorScheme` gesteuert.
		try {
			if (value === 'system') {
				await this.configurationService.updateValue('window.autoDetectColorScheme', true, ConfigurationTarget.USER);
			} else {
				await this.configurationService.updateValue('window.autoDetectColorScheme', false, ConfigurationTarget.USER);
				const themeId = value === 'light' ? 'Default Light Modern' : 'Default Dark Modern';
				await this.configurationService.updateValue('workbench.colorTheme', themeId, ConfigurationTarget.USER);
			}
		} catch {
			// Theme-Switch fehlschlagend ist fuer Otto kein Panik-Moment — der
			// gespeicherte Zustand bleibt, beim naechsten Start greift er.
		}
	}

	private renderDataLocationItem(parent: HTMLElement): void {
		const item = this.appendItem(parent, 'dataLocation', keelSettingsStrings.dataLocationLabel(), '');

		const pathString = this.settingsService.dataLocationUri.fsPath;
		this.replaceItemDescription(item, keelSettingsStrings.dataLocationDescription(pathString));

		append(item, $<HTMLParagraphElement>('p.keel-settings-path', {}, pathString));

		const btnLabel = isMacintosh ? keelSettingsStrings.dataLocationOpenInFinder() : keelSettingsStrings.dataLocationOpenInExplorer();
		const btn = append(item, $<HTMLButtonElement>('button.keel-settings-button', {
			type: 'button',
			'aria-label': btnLabel,
		}, btnLabel));

		this.viewDisposables.add(addDisposableListener(btn, EventType.CLICK, () => {
			void this.openerService.open(this.settingsService.dataLocationUri, { openExternal: true });
		}));
	}

	private renderNotificationsItem(parent: HTMLElement, current: boolean): void {
		const item = this.appendItem(parent, 'notifications', keelSettingsStrings.notificationsLabel(), keelSettingsStrings.notificationsDescription());
		this.appendToggle(item, current, (next) => {
			void this.settingsService.setNotifications(next);
		}, keelSettingsStrings.notificationsOn(), keelSettingsStrings.notificationsOff(), keelSettingsStrings.notificationsLabel());
	}

	private renderTelemetryItem(parent: HTMLElement, current: boolean): void {
		const item = this.appendItem(parent, 'telemetry', keelSettingsStrings.telemetryLabel(), keelSettingsStrings.telemetryDescription());
		this.appendToggle(item, current, (next) => {
			void this.settingsService.setTelemetry(next);
		}, keelSettingsStrings.telemetryOn(), keelSettingsStrings.telemetryOff(), keelSettingsStrings.telemetryLabel());
	}

	private renderAssistantItem(parent: HTMLElement): void {
		// Welle 11: Status ist generisch "Nicht angemeldet", Buttons sind
		// disabled mit "Verfuegbar in Kuerze"-Tooltip. Details in final-
		// decisions Abschnitt Item 6.
		const item = this.appendItem(parent, 'assistant', keelSettingsStrings.assistantLabel(), '');
		this.replaceItemDescription(item, keelSettingsStrings.assistantStatusNotConnected());

		const btn = append(item, $<HTMLButtonElement>('button.keel-settings-button', {
			type: 'button',
			title: keelSettingsStrings.assistantComingSoon(),
			'aria-label': keelSettingsStrings.assistantSignIn(),
		}, keelSettingsStrings.assistantSignIn()));
		btn.disabled = true;
	}

	private renderAboutItem(parent: HTMLElement): void {
		const item = this.appendItem(parent, 'about', keelSettingsStrings.aboutLabel(), '');

		const toggle = append(item, $<HTMLButtonElement>('button.keel-settings-about-toggle', {
			type: 'button',
			'aria-expanded': 'false',
		}));
		const arrow = append(toggle, $<HTMLSpanElement>('span.keel-settings-about-arrow.codicon.codicon-chevron-right', { 'aria-hidden': 'true' }));
		append(toggle, $<HTMLSpanElement>('span', {}, keelSettingsStrings.aboutLabel()));

		const content = append(item, $<HTMLDivElement>('div.keel-settings-about-content.keel-settings-about-content-collapsed'));
		append(content, $<HTMLDivElement>('div.keel-settings-about-product', {}, keelSettingsStrings.aboutProductName()));

		const version = this.productService.version ?? '0.0.0';
		append(content, $<HTMLDivElement>('div.keel-settings-about-muted', {}, keelSettingsStrings.aboutVersion(version)));

		const year = String(new Date().getFullYear());
		append(content, $<HTMLDivElement>('div.keel-settings-about-muted', {}, keelSettingsStrings.aboutCopyright(year)));

		let expanded = false;
		this.viewDisposables.add(addDisposableListener(toggle, EventType.CLICK, () => {
			expanded = !expanded;
			toggle.setAttribute('aria-expanded', String(expanded));
			content.classList.toggle('keel-settings-about-content-collapsed', !expanded);
			arrow.classList.toggle('codicon-chevron-right', !expanded);
			arrow.classList.toggle('codicon-chevron-down', expanded);
		}));

		void item;
	}

	// --- Helpers ---

	/**
	 * Erzeugt die Basis-Karten-Struktur eines Items und gibt das Item-Element
	 * zurueck, damit der Caller weitere Controls anhaengen kann.
	 *
	 * Die Header-Zeile mit Label + Toggle-Slot wird als `div.keel-settings-item-header`
	 * angelegt. Die Caller-Helfer `appendToggle` nutzt das direkt; das
	 * Description-Element wird als separates `<p>` darunter platziert.
	 */
	private appendItem(parent: HTMLElement, key: string, label: string, description: string): HTMLDivElement {
		const item = append(parent, $<HTMLDivElement>(`div.${KEEL_SETTINGS_ITEM_CLASS}`, { 'data-keel-settings-key': key }));
		const header = append(item, $<HTMLDivElement>('div.keel-settings-item-header'));
		append(header, $<HTMLParagraphElement>('p.keel-settings-item-label', {}, label));
		append(item, $<HTMLParagraphElement>('p.keel-settings-item-description', {}, description));
		return item;
	}

	/**
	 * Ersetzt den Text im description-Element eines Items. Nutzt eine
	 * Children-Iteration statt querySelector, um die eslint-Regel
	 * `no-restricted-syntax` nicht zu triggern.
	 */
	private replaceItemDescription(item: HTMLElement, text: string): void {
		for (const child of Array.from(item.children)) {
			if (isHTMLElement(child) && child.classList.contains('keel-settings-item-description')) {
				child.textContent = text;
				return;
			}
		}
	}

	private appendToggle(item: HTMLElement, current: boolean, onChange: (next: boolean) => void, onLabel: string, offLabel: string, ariaLabel: string): void {
		// Header-Zeile ist das erste Kind (angelegt in appendItem).
		const header = item.children.item(0);
		if (!isHTMLElement(header)) {
			return;
		}
		const btn = append(header, $<HTMLButtonElement>('button.keel-settings-toggle', {
			type: 'button',
			role: 'switch',
			'aria-checked': String(current),
			'aria-label': ariaLabel,
		}, current ? onLabel : offLabel));
		btn.classList.toggle('keel-settings-toggle-on', current);

		this.viewDisposables.add(addDisposableListener(btn, EventType.CLICK, () => {
			const next = btn.getAttribute('aria-checked') !== 'true';
			btn.setAttribute('aria-checked', String(next));
			btn.textContent = next ? onLabel : offLabel;
			btn.classList.toggle('keel-settings-toggle-on', next);
			onChange(next);
		}));
	}

	/**
	 * Haengt einen Inline-Hint (z.B. "Sprachaenderung greift beim naechsten
	 * Start.") an ein Item an. Mehrfach-Aufruf ist idempotent: existiert ein
	 * Hint mit demselben Key bereits, wird nichts veraendert.
	 */
	private ensureInlineHint(item: HTMLElement, key: string, text: string): void {
		for (const child of Array.from(item.children)) {
			if (isHTMLElement(child) && child.getAttribute('data-hint-key') === key) {
				return;
			}
		}
		append(item, $<HTMLParagraphElement>('p.keel-settings-inline-hint', { 'data-hint-key': key }, text));
	}
}

/**
 * Singleton-Halter fuer das Flyout pro Fenster. Wir erzeugen die Instanz lazy
 * beim ersten Show-Call und re-usen sie danach.
 */
let flyoutInstance: KeelSettingsFlyout | undefined;

export function getOrCreateKeelSettingsFlyout(
	instantiationService: IInstantiationService,
): { flyout: KeelSettingsFlyout; disposable: IDisposable } {
	if (!flyoutInstance) {
		flyoutInstance = instantiationService.createInstance(KeelSettingsFlyout);
	}
	const instance = flyoutInstance;
	return {
		flyout: instance,
		disposable: {
			dispose: () => {
				// Global-Singleton wird beim Workbench-Shutdown freigegeben.
				instance.dispose();
				flyoutInstance = undefined;
			},
		},
	};
}
