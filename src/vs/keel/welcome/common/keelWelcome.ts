/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Gemeinsame Konstanten fuer den Keel-Welcome-Editor.
 *
 * Diese Datei enthaelt nur Identifier - keine Abhaengigkeiten zu Workbench/Browser-APIs,
 * damit sie unabhaengig importiert werden kann (z.B. von einer spaeteren Test-Suite).
 */

/**
 * ID des Welcome-EditorPane. Wird bei Registry-Registrierung und zum Identifizieren
 * des Editors in Command-Handlern verwendet.
 */
export const KEEL_WELCOME_EDITOR_ID = 'keel.welcome.editor';

/**
 * Type-ID der EditorInput. Wird bei der Serializer-Registrierung genutzt.
 */
export const KEEL_WELCOME_INPUT_TYPE_ID = 'keel.welcome.input';

/**
 * Command-ID zum expliziten Oeffnen des Welcome (z.B. aus den Einstellungen).
 */
export const KEEL_WELCOME_SHOW_COMMAND_ID = 'keel.welcome.show';

/**
 * Storage-Key fuer das First-Run-Flag. Wird gesetzt, sobald der User den ersten Auftrag
 * erfolgreich abgesetzt hat. Fehlt der Key im Storage, gilt der Launch als First-Run.
 */
export const KEEL_WELCOME_SHOWN_STORAGE_KEY = 'keel.welcome.shown';

/**
 * Konfigurations-Key (Einstellungen - Allgemein) fuer den Opt-in, das Welcome beim
 * naechsten Start wieder zu zeigen.
 */
export const KEEL_WELCOME_SHOW_ON_STARTUP_CONFIG_KEY = 'keel.welcome.showOnStartup';

/**
 * URI-Authority fuer die Welcome-Resource. Damit wird der Welcome-Editor eindeutig
 * identifizierbar, ohne eine echte Datei-Resource zu benoetigen.
 */
export const KEEL_WELCOME_RESOURCE_AUTHORITY = 'keel_welcome';
