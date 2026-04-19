/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize2 } from '../../../nls.js';
import { Action2, registerAction2 } from '../../../platform/actions/common/actions.js';
import { KeyMod, KeyCode } from '../../../base/common/keyCodes.js';
import { KeybindingsRegistry, KeybindingWeight, IKeybindingRule } from '../../../platform/keybinding/common/keybindingsRegistry.js';
import { IQuickInputService, ItemActivation, QuickInputHideReason } from '../../../platform/quickinput/common/quickInput.js';
import { IKeybindingService } from '../../../platform/keybinding/common/keybinding.js';
import { CommandsRegistry } from '../../../platform/commands/common/commands.js';
import { ServicesAccessor } from '../../../platform/instantiation/common/instantiation.js';
import { inQuickPickContext, defaultQuickAccessContext, getQuickNavigateHandler } from '../quickaccess.js';
import { ILocalizedString } from '../../../platform/action/common/action.js';
// DISABLED by Keel (D-017): Imports MenuId, ICommandService, IConfigurationService,
// AnythingQuickAccessProviderRunOptions, Codicon, localize und UNIFIED_AGENTS_BAR_SETTING
// entfernt, weil die Action2 `workbench.action.quickOpen` und
// `workbench.action.quickOpenWithModes` komplett auskommentiert sind (siehe unten).
// Bei Upstream-Merge: wenn eine der Actions reaktiviert wird, die Imports wieder ergaenzen.

//#region Quick access management commands and keys

const globalQuickAccessKeybinding = {
	primary: KeyMod.CtrlCmd | KeyCode.KeyP,
	secondary: [KeyMod.CtrlCmd | KeyCode.KeyE],
	mac: { primary: KeyMod.CtrlCmd | KeyCode.KeyP, secondary: undefined }
};

KeybindingsRegistry.registerCommandAndKeybindingRule({
	id: 'workbench.action.closeQuickOpen',
	weight: KeybindingWeight.WorkbenchContrib,
	when: inQuickPickContext,
	primary: KeyCode.Escape, secondary: [KeyMod.Shift | KeyCode.Escape],
	handler: accessor => {
		const quickInputService = accessor.get(IQuickInputService);
		return quickInputService.cancel(QuickInputHideReason.Gesture);
	}
});

KeybindingsRegistry.registerCommandAndKeybindingRule({
	id: 'workbench.action.acceptSelectedQuickOpenItem',
	weight: KeybindingWeight.WorkbenchContrib,
	when: inQuickPickContext,
	primary: 0,
	handler: accessor => {
		const quickInputService = accessor.get(IQuickInputService);
		return quickInputService.accept();
	}
});

KeybindingsRegistry.registerCommandAndKeybindingRule({
	id: 'workbench.action.alternativeAcceptSelectedQuickOpenItem',
	weight: KeybindingWeight.WorkbenchContrib,
	when: inQuickPickContext,
	primary: 0,
	handler: accessor => {
		const quickInputService = accessor.get(IQuickInputService);
		return quickInputService.accept({ ctrlCmd: true, alt: false, shift: false });
	}
});

KeybindingsRegistry.registerCommandAndKeybindingRule({
	id: 'workbench.action.focusQuickOpen',
	weight: KeybindingWeight.WorkbenchContrib,
	when: inQuickPickContext,
	primary: 0,
	handler: accessor => {
		const quickInputService = accessor.get(IQuickInputService);
		quickInputService.focus();
	}
});

const quickAccessNavigateNextInFilePickerId = 'workbench.action.quickOpenNavigateNextInFilePicker';
KeybindingsRegistry.registerCommandAndKeybindingRule({
	id: quickAccessNavigateNextInFilePickerId,
	weight: KeybindingWeight.WorkbenchContrib + 50,
	handler: getQuickNavigateHandler(quickAccessNavigateNextInFilePickerId, true),
	when: defaultQuickAccessContext,
	primary: globalQuickAccessKeybinding.primary,
	secondary: globalQuickAccessKeybinding.secondary,
	mac: globalQuickAccessKeybinding.mac
});

const quickAccessNavigatePreviousInFilePickerId = 'workbench.action.quickOpenNavigatePreviousInFilePicker';
KeybindingsRegistry.registerCommandAndKeybindingRule({
	id: quickAccessNavigatePreviousInFilePickerId,
	weight: KeybindingWeight.WorkbenchContrib + 50,
	handler: getQuickNavigateHandler(quickAccessNavigatePreviousInFilePickerId, false),
	when: defaultQuickAccessContext,
	primary: globalQuickAccessKeybinding.primary | KeyMod.Shift,
	secondary: [globalQuickAccessKeybinding.secondary[0] | KeyMod.Shift],
	mac: {
		primary: globalQuickAccessKeybinding.mac.primary | KeyMod.Shift,
		secondary: undefined
	}
});

KeybindingsRegistry.registerCommandAndKeybindingRule({
	id: 'workbench.action.quickPickManyToggle',
	weight: KeybindingWeight.WorkbenchContrib,
	when: inQuickPickContext,
	primary: 0,
	handler: accessor => {
		const quickInputService = accessor.get(IQuickInputService);
		quickInputService.toggle();
	}
});

KeybindingsRegistry.registerCommandAndKeybindingRule({
	id: 'workbench.action.quickInputBack',
	weight: KeybindingWeight.WorkbenchContrib + 50,
	when: inQuickPickContext,
	primary: 0,
	win: { primary: KeyMod.Alt | KeyCode.LeftArrow },
	mac: { primary: KeyMod.WinCtrl | KeyCode.Minus },
	linux: { primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.Minus },
	handler: accessor => {
		const quickInputService = accessor.get(IQuickInputService);
		quickInputService.back();
	}
});

// DISABLED by Keel (D-017): Quick-Open (Ctrl+P) ist fuer Otto nicht zugaenglich.
// Otto hat kein sichtbares Filesystem, Quick-Open liefert keinen Mehrwert und
// waere nur ein weiterer Einstiegspunkt zur versteckten Command-Palette (via "?" und ">").
// registerAction2(class QuickAccessAction extends Action2 {
// 	constructor() {
// 		super({
// 			id: 'workbench.action.quickOpen',
// 			title: localize2('quickOpen', "Go to File..."),
// 			metadata: {
// 				description: `Quick access`,
// 				args: [{
// 					name: 'prefix',
// 					schema: {
// 						'type': 'string'
// 					}
// 				}]
// 			},
// 			keybinding: {
// 				weight: KeybindingWeight.WorkbenchContrib,
// 				primary: globalQuickAccessKeybinding.primary,
// 				secondary: globalQuickAccessKeybinding.secondary,
// 				mac: globalQuickAccessKeybinding.mac
// 			},
// 			f1: true
// 		});
// 	}
//
// 	run(accessor: ServicesAccessor, prefix: undefined): void {
// 		const quickInputService = accessor.get(IQuickInputService);
// 		quickInputService.quickAccess.show(typeof prefix === 'string' ? prefix : undefined, { preserveValue: typeof prefix === 'string' /* preserve as is if provided */ });
// 	}
// });

// DISABLED by Keel (D-017): Command-Center-Search in der Titlebar entfernt.
// Dieser Action haengt am CommandCenter-Submenu und startet den klassischen
// Quick-Access ueber die Titlebar-Search-Box. Ohne Registrierung bleibt das
// Submenu leer -> Search-Feld verschwindet aus der Titelzeile.
// registerAction2(class QuickAccessAction extends Action2 {
// 	constructor() {
// 		super({
// 			id: 'workbench.action.quickOpenWithModes',
// 			title: localize('quickOpenWithModes', "Quick Open"),
// 			icon: Codicon.search,
// 			menu: {
// 				id: MenuId.CommandCenterCenter,
// 				order: 100
// 			}
// 		});
// 	}
//
// 	async run(accessor: ServicesAccessor): Promise<void> {
// 		const openClassicQuickAccess = (): void => {
// 			const quickInputService = accessor.get(IQuickInputService);
// 			const providerOptions: AnythingQuickAccessProviderRunOptions = {
// 				includeHelp: true,
// 				from: 'commandCenter',
// 			};
// 			quickInputService.quickAccess.show(undefined, {
// 				preserveValue: true,
// 				providerOptions
// 			});
// 		};
//
// 		const configurationService = accessor.get(IConfigurationService);
// 		const commandService = accessor.get(ICommandService);
// 		const useUnifiedQuickAccess = configurationService.getValue<boolean>(UNIFIED_AGENTS_BAR_SETTING) === true;
// 		if (useUnifiedQuickAccess) {
// 			try {
// 				await commandService.executeCommand('workbench.action.unifiedQuickAccess');
// 			} catch {
// 				openClassicQuickAccess();
// 			}
// 			return;
// 		}
//
// 		openClassicQuickAccess();
// 	}
// });

CommandsRegistry.registerCommand('workbench.action.quickOpenPreviousEditor', async accessor => {
	const quickInputService = accessor.get(IQuickInputService);

	quickInputService.quickAccess.show('', { itemActivation: ItemActivation.SECOND });
});

//#endregion

//#region Workbench actions

class BaseQuickAccessNavigateAction extends Action2 {

	constructor(
		private id: string,
		title: ILocalizedString,
		private next: boolean,
		private quickNavigate: boolean,
		keybinding?: Omit<IKeybindingRule, 'id'>
	) {
		super({ id, title, f1: true, keybinding });
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const keybindingService = accessor.get(IKeybindingService);
		const quickInputService = accessor.get(IQuickInputService);

		const keys = keybindingService.lookupKeybindings(this.id);
		const quickNavigate = this.quickNavigate ? { keybindings: keys } : undefined;

		quickInputService.navigate(this.next, quickNavigate);
	}
}

class QuickAccessNavigateNextAction extends BaseQuickAccessNavigateAction {

	constructor() {
		super('workbench.action.quickOpenNavigateNext', localize2('quickNavigateNext', 'Navigate Next in Quick Open'), true, true);
	}
}

class QuickAccessNavigatePreviousAction extends BaseQuickAccessNavigateAction {

	constructor() {
		super('workbench.action.quickOpenNavigatePrevious', localize2('quickNavigatePrevious', 'Navigate Previous in Quick Open'), false, true);
	}
}

class QuickAccessSelectNextAction extends BaseQuickAccessNavigateAction {

	constructor() {
		super(
			'workbench.action.quickOpenSelectNext',
			localize2('quickSelectNext', 'Select Next in Quick Open'),
			true,
			false,
			{
				weight: KeybindingWeight.WorkbenchContrib + 50,
				when: inQuickPickContext,
				primary: 0,
				mac: { primary: KeyMod.WinCtrl | KeyCode.KeyN }
			}
		);
	}
}

class QuickAccessSelectPreviousAction extends BaseQuickAccessNavigateAction {

	constructor() {
		super(
			'workbench.action.quickOpenSelectPrevious',
			localize2('quickSelectPrevious', 'Select Previous in Quick Open'),
			false,
			false,
			{
				weight: KeybindingWeight.WorkbenchContrib + 50,
				when: inQuickPickContext,
				primary: 0,
				mac: { primary: KeyMod.WinCtrl | KeyCode.KeyP }
			}
		);
	}
}

registerAction2(QuickAccessSelectNextAction);
registerAction2(QuickAccessSelectPreviousAction);
registerAction2(QuickAccessNavigateNextAction);
registerAction2(QuickAccessNavigatePreviousAction);

//#endregion
