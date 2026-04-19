/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Gemeinsame Konstanten und Typen fuer den Keel-Einstellungen-Bereich
 * (Welle 11).
 *
 * Keine Abhaengigkeiten zu Workbench/Browser-APIs, damit die Konstanten auch
 * aus dem Core-Layer oder aus Tests genutzt werden koennen.
 */

/**
 * Command-ID fuer das Oeffnen des Settings-Flyouts.
 *
 * Wird vom Gear-Icon-Klick-Handler (D-026) aufgerufen, wenn in der product.json
 * das Flag `keelReplaceManageWithSettings === true` gesetzt ist.
 */
export const KEEL_SETTINGS_SHOW_COMMAND_ID = 'keel.settings.showFlyout';

/**
 * Command-ID zum Schliessen des Settings-Flyouts (intern vom Flyout selbst
 * und von Esc/Klick-ausserhalb-Handlern aufgerufen).
 */
export const KEEL_SETTINGS_HIDE_COMMAND_ID = 'keel.settings.hideFlyout';

/**
 * CSS-Klasse des Flyout-Root-Elements. Wird im Behavior-Test
 * (`scripts/verify-settings-flyout.mjs`) als Selektor verwendet.
 */
export const KEEL_SETTINGS_FLYOUT_CLASS = 'keel-settings-flyout';

/**
 * CSS-Klasse eines einzelnen Settings-Items (Zeile im Flyout). Dient als
 * Hook-Selektor fuer Tests, um die Anzahl der Items zu pruefen.
 */
export const KEEL_SETTINGS_ITEM_CLASS = 'keel-settings-item';

/**
 * Keys der 7 Whitelist-Otto-Settings, die im Flyout angezeigt werden. Jede
 * Abweichung gegen diese Liste rendert NICHT — Whitelist-Prinzip (siehe
 * Welle-11-Spec, Negativ-Liste-Schutz, Abschnitt A).
 *
 * Reihenfolge entspricht der Anzeige-Reihenfolge im Flyout.
 */
export const KEEL_SETTINGS_KEYS = {
	language: 'language',
	brightness: 'brightness',
	dataLocation: 'dataLocation',
	notifications: 'notifications',
	telemetry: 'telemetry',
	assistant: 'assistant',
	about: 'about',
} as const;

/**
 * Zulaessige Werte fuer die Sprache-Einstellung (Welle 11: nur `de` aktiv,
 * `en` kommt in Welle 12).
 */
export type KeelSettingsLanguage = 'de' | 'en';

/**
 * Zulaessige Werte fuer die Helligkeit-Einstellung.
 */
export type KeelSettingsBrightness = 'light' | 'dark' | 'system';

/**
 * Persistierbare Otto-Einstellungen (File-First: `~/Keel/config/settings.json`).
 *
 * Die Struktur ist bewusst flach und nur die 7 Whitelist-Items. Upstream-
 * VSCode-Settings werden in einem SEPARATEN Storage-Mechanismus gehalten und
 * vom Flyout ignoriert (Whitelist-Prinzip).
 */
export interface IKeelSettingsData {
	readonly language: KeelSettingsLanguage;
	readonly brightness: KeelSettingsBrightness;
	readonly notifications: boolean;
	readonly telemetry: boolean;
}

/**
 * Defaults fuer die Otto-Einstellungen. Wird angewendet, wenn
 * `~/Keel/config/settings.json` nicht existiert oder beschaedigt ist.
 *
 * Privacy-First:
 * - `telemetry` default `false` (Dr. Bernhards Kern-Prueffrage)
 * - `notifications` default `true` (Regina will Feedback)
 * - `brightness` default `system` (folgt OS-Setting)
 * - `language` default `de` (Welle 11 ist nur Deutsch vollstaendig)
 */
export const KEEL_SETTINGS_DEFAULTS: IKeelSettingsData = {
	language: 'de',
	brightness: 'system',
	notifications: true,
	telemetry: false,
};

/**
 * Pfad zur Settings-Datei relativ zum Home-Verzeichnis des Users. Die Datei
 * ist File-First (git-able, auditierbar) und kein VSCode-Storage-Key.
 */
export const KEEL_SETTINGS_FILE_REL_PATH = 'Keel/config/settings.json';

/**
 * Pfad zum Daten-Ordner des Users (`~/Keel/`). Wird in Item 3 ("Wo liegen
 * meine Daten?") angezeigt und als Target fuer den
 * `[Im Datei-Explorer oeffnen]`-Button verwendet.
 */
export const KEEL_DATA_FOLDER_REL_PATH = 'Keel';
