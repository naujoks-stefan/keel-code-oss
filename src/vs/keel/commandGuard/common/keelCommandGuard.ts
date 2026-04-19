/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';

/**
 * Gemeinsame Konstanten und Service-Interface fuer den Keel-Command-
 * Blacklist-Service (Welle 12, D-033).
 *
 * Keine Abhaengigkeiten zu Workbench/Browser-APIs, damit der Decorator auch
 * aus `common`-Dateien (z.B. dem Upstream-CommandService) importiert werden
 * darf, ohne einen Cross-Layer-Violation-Fehler auszuloesen.
 */

/**
 * Explizite Command-IDs, die wir blockieren. Die Liste entstammt den
 * Welle-12-final-decisions ("Command-Blacklist-Bootstrap-Liste"). Alles, was
 * Otto ueber die Command-Palette oder einen Power-User-Chord-Shortcut in
 * einen Dev-Jargon-Workflow bringen wuerde.
 *
 * Die Liste ist eine `ReadonlySet<string>`-Quelle — der Service nutzt sie
 * als schnellen Lookup.
 */
export const KEEL_COMMAND_BLACKLIST: readonly string[] = [
	'workbench.action.openSettings',
	'workbench.action.openSettings2',
	'workbench.action.openSettingsJson',
	'workbench.action.openGlobalSettings',
	'workbench.action.openWorkspaceSettings',
	'workbench.action.openFolderSettings',
	'workbench.action.configureLanguage',
	'workbench.action.openApplicationSettingsJson',
	'workbench.action.openRawDefaultSettings',
	'workbench.action.openDefaultKeybindingsFile',
	'workbench.action.openGlobalKeybindings',
	'workbench.action.openGlobalKeybindingsFile',
	'workbench.action.openKeyboardShortcutsJson',
	'workbench.action.openUserSnippets',
	'workbench.action.openSnippets',
	'workbench.action.openExtensionsFolder',
	'workbench.extensions.action.showInstalledExtensions',
	'workbench.extensions.action.showRecommendedExtensions',
	'workbench.view.extensions',
	'workbench.action.openRecent',
	'workbench.action.openFolder',
	'workbench.action.addRootFolder',
	'workbench.action.files.openFile',
	'workbench.action.files.openFolder',
	'workbench.action.files.openFileFolder',
	'workbench.action.openWorkspace',
	'workbench.action.newWindow',
	'workbench.action.duplicateWorkspaceInNewWindow',
	'workbench.action.openIssueReporter',
	'workbench.action.openProcessExplorer',
];

/**
 * Prefix-Pattern: Alles, was mit einem dieser Strings beginnt, wird
 * zusaetzlich zur expliziten Liste blockiert. Faengt z.B. neue Varianten
 * von `workbench.action.openSettings<X>`-Commands auf, die Upstream im
 * Laufe der Zeit hinzufuegt.
 */
export const KEEL_COMMAND_BLACKLIST_PREFIXES: readonly string[] = [
	'workbench.action.openSettings',
	'workbench.action.configureLanguage',
	'workbench.extensions.',
];

/**
 * Keel-Whitelist: Commands mit diesem Prefix werden NIE blockiert. Damit
 * bleibt der komplette `keel.*`-Namespace (inkl. zukuenftiger Erweiterungen)
 * fuer Keel-interne Flows frei.
 */
export const KEEL_COMMAND_WHITELIST_PREFIX = 'keel.';

/**
 * Internal storage-key fuer "der letzte Command-Execute kam von einem
 * Chord-Shortcut" — wird vom Keybinding-Service gesetzt, damit der
 * Blacklist-Toast nur bei bewussten Shortcuts feuert und nicht bei Auto-
 * Tab-Navigation (z.B. `workbench.action.nextEditor`).
 *
 * In Welle 12 MVP ist die Chord-Erkennung pragmatisch: Der Toast feuert
 * immer — Otto-Experience ist dabei akzeptabel, weil die blockierten
 * Commands ohnehin keinen Otto-freundlichen Flow triggern. Welle 13 kann
 * die Chord-Heuristik verfeinern.
 */
export const KEEL_COMMAND_BLOCKED_REASON = 'keel.commandGuard.blocked';

/**
 * Service-Dekorator fuer den Keel-Command-Blacklist-Service.
 *
 * Der Service beantwortet die Frage "darf dieser Command ausgefuehrt
 * werden?" und zeigt bei Blockierung einen Otto-tauglichen Toast. Der
 * Decorator lebt in `common/`, damit Upstream-Files wie
 * `src/vs/workbench/services/commands/common/commandService.ts` ihn ohne
 * Cross-Layer-Violation importieren koennen — die Implementation dazu
 * liegt in `browser/`.
 */
export const IKeelCommandBlacklistService = createDecorator<IKeelCommandBlacklistService>('keelCommandBlacklistService');

/**
 * Public-API. Deklariert in `common/`, implementiert in `browser/`.
 */
export interface IKeelCommandBlacklistService {
	readonly _serviceBrand: undefined;

	/**
	 * `true`, wenn der Command ausgefuehrt werden DARF, `false` wenn er
	 * blockiert ist.
	 */
	isAllowed(commandId: string): boolean;

	/**
	 * Zeigt den Otto-tauglichen Blocked-Toast an.
	 */
	notifyBlocked(commandId: string): void;
}
