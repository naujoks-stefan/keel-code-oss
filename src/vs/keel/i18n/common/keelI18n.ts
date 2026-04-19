/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Gemeinsame Konstanten und Typen fuer das Keel-i18n-Modul (Welle 12, D-030).
 *
 * Keine Abhaengigkeiten zu Workbench/Browser-APIs, damit die Konstanten auch
 * aus Services (vor vollstaendiger Workbench-Boot) konsumiert werden koennen.
 *
 * Scope-Begrenzung: Der Service verwaltet AUSSCHLIESSLICH Keel-eigene
 * User-facing-Strings (Welcome / Cockpit / Settings / Help / Notifications).
 * VSCode-Upstream-Strings bleiben unberuehrt und laufen weiterhin ueber
 * `nls.localize` mit dem Default-Locale des Forks (Deutsch).
 */

/**
 * Zulaessige Werte fuer die Sprache-Einstellung. Default `de` (DACH-Markt).
 */
export type KeelI18nLanguage = 'de' | 'en';

/**
 * Default-Sprache, wenn noch keine Einstellung vorliegt. Entspricht dem
 * Default in `KeelSettingsService`.
 */
export const KEEL_I18N_DEFAULT_LANGUAGE: KeelI18nLanguage = 'de';

/**
 * Tupel fuer ein einzelnes uebersetztes Paar: Deutscher Original-Text + die
 * englische Uebersetzung. Der Service gibt je nach aktueller Sprache einen der
 * beiden Werte zurueck.
 */
export interface IKeelI18nBilingualString {
	readonly de: string;
	readonly en: string;
}
