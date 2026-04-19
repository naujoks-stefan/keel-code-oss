/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Gemeinsame Konstanten fuer den Keel-Help-Editor (Welle 11).
 *
 * Keine Abhaengigkeiten zu Workbench/Browser-APIs. Der Editor landet als
 * Landeplatz fuer den `[Hilfe]`-Button des Stufe-2-Toasts (D-027) und steht
 * generell als MVP-Landeplatz fuer alle "Ich brauche Hilfe"-Gesten zur
 * Verfuegung.
 */

/**
 * ID des Help-EditorPane. Wird bei der Registry-Registrierung und zur
 * Identifikation des Editors in Command-Handlern verwendet.
 */
export const KEEL_HELP_EDITOR_ID = 'keel.help.editor';

/**
 * Type-ID der EditorInput. Wird bei der Serializer-Registrierung genutzt.
 */
export const KEEL_HELP_INPUT_TYPE_ID = 'keel.help.input';

/**
 * Command-ID zum expliziten Oeffnen des Help-Editors. Wird u.a. vom
 * Toast-Stufe-2-Button `[Hilfe]` aufgerufen.
 */
export const KEEL_HELP_OPEN_SUPPORT_COMMAND_ID = 'keel.help.openSupport';

/**
 * Command-ID fuer den Retry-Start-Pfad (Toast-Stufe-2-Button
 * `[Erneut versuchen]`). Leitet auf `workbench.action.reloadWindow` weiter —
 * damit bleibt die Otto-Seite von Dev-Jargon wie "Extension-Host-Restart"
 * verschont.
 */
export const KEEL_PLATFORM_RETRY_START_COMMAND_ID = 'keel.platform.retryStart';

/**
 * URI-Authority fuer die Help-Resource. Damit wird der Help-Editor eindeutig
 * identifizierbar, ohne eine echte Datei-Resource zu benoetigen.
 */
export const KEEL_HELP_RESOURCE_AUTHORITY = 'keel_help';
