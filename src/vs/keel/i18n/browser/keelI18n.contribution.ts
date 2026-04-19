/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../base/common/lifecycle.js';
import { Action2, registerAction2 } from '../../../platform/actions/common/actions.js';
import { ServicesAccessor } from '../../../platform/instantiation/common/instantiation.js';
import {
	IWorkbenchContribution,
	registerWorkbenchContribution2,
	WorkbenchPhase,
} from '../../../workbench/common/contributions.js';
import { IDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { IHostService } from '../../../workbench/services/host/browser/host.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { localize, localize2 } from '../../../nls.js';
import { IKeelSettingsService } from '../../settings/browser/keelSettingsService.js';
import { IKeelCockpitService } from '../../cockpit/browser/keelCockpitService.js';
// Kombinierter Named-Import + Side-Effect: der Import registriert zugleich
// den Singleton ueber den `registerSingleton`-Call auf Top-Level von
// keelI18nService.ts. Ein separater Side-Effect-Import ist daher nicht
// noetig (und loest eslint/hygiene-Duplicate-Imports aus).
import {
	IKeelI18nService,
	registerKeelI18nLanguageGetter,
} from './keelI18nService.js';
import { KeelI18nLanguage } from '../common/keelI18n.js';

/**
 * Command-ID fuer den Sprache-Switch inklusive Reload-Window-Confirm (Welle 12,
 * D-030). Wird vom Settings-Flyout-Language-Item ausgeloest, kann aber auch
 * programmatisch genutzt werden.
 */
export const KEEL_I18N_SWITCH_LANGUAGE_COMMAND_ID = 'keel.i18n.switchLanguage';

/**
 * Bootstrap-Contribution: verdrahtet den globalen Language-Getter (fuer
 * `keelPickLanguage(de, en)`) mit dem laufenden `IKeelI18nService`. Sobald
 * diese Contribution geladen wurde, liefert `keelPickLanguage` den aktuellen
 * Sprachwert aus dem Service.
 */
class KeelI18nBootstrapContribution extends Disposable implements IWorkbenchContribution {

	static readonly ID = 'keel.i18n.bootstrap';

	constructor(
		@IKeelI18nService i18nService: IKeelI18nService,
	) {
		super();
		registerKeelI18nLanguageGetter(() => i18nService.getLanguage());
	}
}

registerWorkbenchContribution2(
	KeelI18nBootstrapContribution.ID,
	KeelI18nBootstrapContribution,
	WorkbenchPhase.BlockStartup,
);

/**
 * Action: Sprache wechseln. Der Aufrufer uebergibt das Target-Language als
 * erstes Argument (Typ `KeelI18nLanguage`).
 *
 * Ablauf:
 *  1. Wenn Target == aktuelle Sprache → No-Op.
 *  2. Wenn `IKeelCockpitService` einen laufenden Task meldet → Confirm-Dialog
 *     mit Otto-Wortlaut. Default-Button: "Spaeter" (Abbruch).
 *  3. Sprache persistieren via `IKeelSettingsService.setLanguage`.
 *  4. `IHostService.reload()` um das neue Bundle zu laden.
 */
registerAction2(class KeelSwitchLanguageAction extends Action2 {
	constructor() {
		super({
			id: KEEL_I18N_SWITCH_LANGUAGE_COMMAND_ID,
			title: localize2('keel.i18n.command.switchLanguage', "Sprache wechseln"),
			f1: false,
		});
	}

	async run(accessor: ServicesAccessor, ...args: unknown[]): Promise<void> {
		const target = normalizeTarget(args[0]);
		if (!target) {
			return;
		}

		const settingsService = accessor.get(IKeelSettingsService);
		const dialogService = accessor.get(IDialogService);
		const hostService = accessor.get(IHostService);
		const cockpitService = accessor.get(IKeelCockpitService);
		const logService = accessor.get(ILogService);

		// Settings-Service stellt sicher, dass `getSettings()` den aktuellen
		// Stand liefert.
		await settingsService.initialize();
		const current = settingsService.getSettings().language;
		if (current === target) {
			return;
		}

		// Confirm bei laufendem Auftrag. `hasRunningTasks()` ist defensiv —
		// wenn der Cockpit-Service aus irgendeinem Grund keinen Running-State
		// liefert, springen wir ohne Dialog durch.
		if (hasRunningTasks(cockpitService)) {
			const confirmed = await confirmSwitchWhileRunning(dialogService);
			if (!confirmed) {
				return;
			}
		}

		try {
			await settingsService.setLanguage(target);
		} catch (err) {
			logService.error('[KeelI18n] Sprache-Setting konnte nicht gespeichert werden.', err);
			return;
		}

		// Reload-Window laedt den Fork neu — Keel-Strings rendern dann mit
		// neuer Sprache. Upstream-Strings bleiben unveraendert (siehe
		// Welle-12-Scope: "MVP").
		await hostService.reload();
	}
});

function normalizeTarget(value: unknown): KeelI18nLanguage | undefined {
	if (value === 'de' || value === 'en') {
		return value;
	}
	return undefined;
}

/**
 * Defensive Abfrage: Hat der Cockpit-Service mindestens einen noch nicht
 * abgeschlossenen Auftrag? `getTasks()` liefert die komplette Liste inkl.
 * completed/failed — wir filtern auf "aktive" Status.
 *
 * Ein aktiver Task ist alles, was nicht `completed` oder `failed` ist. Das
 * deckt Welle-12-Semantik "Ein Auftrag laeuft gerade" ab (inkl. waiting-for-
 * review und paused).
 */
function hasRunningTasks(cockpitService: IKeelCockpitService | undefined): boolean {
	if (!cockpitService) {
		return false;
	}
	const tasks = cockpitService.getTasks();
	for (const task of tasks) {
		const status = task.status;
		if (status !== 'completed' && status !== 'failed') {
			return true;
		}
	}
	return false;
}

async function confirmSwitchWhileRunning(dialogService: IDialogService): Promise<boolean> {
	// `confirm()` liefert ein binaeres Ergebnis (OK / Abbruch). Wir drehen die
	// semantische Zuordnung so, dass der Default-Button "Spaeter" (cancel) ist —
	// Otto-UX-Prinzip: Safer-Default verhindert versehentliches Neuladen.
	const result = await dialogService.confirm({
		type: 'warning',
		message: localize('keel.i18n.runningTask.message', "Ein Auftrag laeuft gerade. Willst du trotzdem die Sprache wechseln? Keel startet dann neu."),
		primaryButton: localize('keel.i18n.runningTask.switchNow', "Jetzt wechseln"),
		cancelButton: localize('keel.i18n.runningTask.later', "Spaeter"),
	});
	return result.confirmed;
}
