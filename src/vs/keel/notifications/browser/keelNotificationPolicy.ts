/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Keel-Notification-Policy (Welle 10, Vorbereitung).
 *
 * Diese Datei ist aktuell ein reines Dokumentations- und Registrier-Modul:
 * sie listet alle VSCode-Upstream-Toasts, die in der Keel-Oberflaeche fuer
 * Otto NICHT sichtbar sein duerfen, und erklaert, wo sie heute unterdrueckt
 * werden.
 *
 * Welle 10 unterdrueckt genau einen Toast (den Extension-Host-Startup-Toast)
 * via chirurgischem Upstream-Patch in `localProcessExtensionHost.ts` mit dem
 * Flag `product.json.keelSilenceExtensionHostToasts`. Weitere Eintraege in
 * diesem Modul sind **vorbereitend**: sobald der Keel-Notification-Filter
 * (Welle 11+) gebaut wird, wird er genau diese Keys gegen die Blocked-Liste
 * matchen und dropen.
 *
 * WICHTIG:
 * - Neue Eintraege bitte nur hinzufuegen, wenn auch die Dokumentation in
 *   `docs/FORK-DIVERGENCE.md` und das Otto-UX-Prinzip in
 *   `otto-ux-principles.md` mitgepflegt werden.
 * - Die Suppression darf NICHT dynamisch "Keel-interne" Toasts dropen -
 *   nur Upstream-Strings mit `extensionHost.*`, `workspace.*`-Prefix oder
 *   vergleichbarer Dev-Jargon-Domaene.
 */

/**
 * NLS-IDs, die wir vollstaendig unterdruecken.
 *
 * Die IDs entsprechen den `nls.localize(id, ...)`-Aufrufen im Upstream.
 * Welle-10-Eintraege sind die beiden Startup-Timeout-Strings aus dem
 * Local- und Debug-Extension-Host.
 */
export const KEEL_SUPPRESSED_NOTIFICATION_IDS: readonly string[] = [
	'extensionHost.startupFail',
	'extensionHost.startupFailDebug',
];

/**
 * Fallback-Patterns fuer String-basierte Unterdrueckung. Wird erst ab
 * Welle 11 aktiv, wenn der Keel-Notification-Filter steht.
 */
export const KEEL_SUPPRESSED_NOTIFICATION_PATTERNS: readonly RegExp[] = [
	/Extension host did not start in \d+ seconds/i,
];
