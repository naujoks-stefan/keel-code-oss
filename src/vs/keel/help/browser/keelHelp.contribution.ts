/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../base/common/lifecycle.js';
import { Registry } from '../../../platform/registry/common/platform.js';
import { SyncDescriptor } from '../../../platform/instantiation/common/descriptors.js';
import {
	registerWorkbenchContribution2,
	WorkbenchPhase,
	IWorkbenchContribution,
} from '../../../workbench/common/contributions.js';
import { EditorPaneDescriptor, IEditorPaneRegistry } from '../../../workbench/browser/editor.js';
import { EditorExtensions, IEditorFactoryRegistry, IEditorSerializer } from '../../../workbench/common/editor.js';
import {
	IEditorResolverService,
	RegisteredEditorPriority,
} from '../../../workbench/services/editor/common/editorResolverService.js';
import { IEditorService } from '../../../workbench/services/editor/common/editorService.js';
import { IHostService } from '../../../workbench/services/host/browser/host.js';
import {
	IInstantiationService,
	ServicesAccessor,
} from '../../../platform/instantiation/common/instantiation.js';
import { Action2, registerAction2 } from '../../../platform/actions/common/actions.js';
import { localize, localize2 } from '../../../nls.js';
import { KeelHelpEditor } from './keelHelpEditor.js';
import { KeelHelpInput } from './keelHelpInput.js';
import { keelHelpStrings } from './strings/keelHelpStrings.js';
import {
	KEEL_HELP_OPEN_SUPPORT_COMMAND_ID,
	KEEL_PLATFORM_RETRY_START_COMMAND_ID,
} from '../common/keelHelp.js';

/**
 * Serializer fuer `KeelHelpInput`. Akzeptiert Restore-Aufrufe nach Reload;
 * der Help-Editor ist kein sensibler Content und darf als "sticky-in-session"
 * wiederhergestellt werden. Falls das in Welle 12+ unerwuenscht wird, kann
 * `canSerialize` auf `false` gesetzt werden.
 */
class KeelHelpInputSerializer implements IEditorSerializer {
	canSerialize(): boolean {
		return true;
	}

	serialize(): string {
		return JSON.stringify({});
	}

	deserialize(_instantiationService: IInstantiationService): KeelHelpInput {
		return new KeelHelpInput();
	}
}

// --- Registry-Eintragungen ---

Registry.as<IEditorFactoryRegistry>(EditorExtensions.EditorFactory)
	.registerEditorSerializer(KeelHelpInput.ID, KeelHelpInputSerializer);

Registry.as<IEditorPaneRegistry>(EditorExtensions.EditorPane).registerEditorPane(
	EditorPaneDescriptor.create(
		KeelHelpEditor,
		KeelHelpEditor.ID,
		localize('keelHelpEditorLabel', "Hilfe"),
	),
	[
		new SyncDescriptor(KeelHelpInput),
	],
);

/**
 * Resolver-Contribution: sorgt dafuer, dass die Help-URI-Resource den
 * Keel-Help-Editor triggert. Ohne Resolver wuerde bei direkter Resource-
 * Oeffnung der Default-Resolver greifen.
 */
class KeelHelpEditorResolverContribution extends Disposable implements IWorkbenchContribution {

	static readonly ID = 'keel.help.editorResolver';

	constructor(
		@IEditorResolverService editorResolverService: IEditorResolverService,
		@IInstantiationService instantiationService: IInstantiationService,
	) {
		super();

		this._register(editorResolverService.registerEditor(
			`${KeelHelpInput.RESOURCE.scheme}:${KeelHelpInput.RESOURCE.authority}/**`,
			{
				id: KeelHelpEditor.ID,
				label: localize('keelHelpResolverLabel', "Hilfe"),
				priority: RegisteredEditorPriority.builtin,
			},
			{
				singlePerResource: true,
				canSupportResource: resource =>
					resource.scheme === KeelHelpInput.RESOURCE.scheme
					&& resource.authority === KeelHelpInput.RESOURCE.authority,
			},
			{
				createEditorInput: () => ({
					editor: instantiationService.createInstance(KeelHelpInput),
				}),
			},
		));
	}
}

// --- Action: Help-Editor oeffnen ---

registerAction2(class OpenKeelHelpAction extends Action2 {
	constructor() {
		super({
			id: KEEL_HELP_OPEN_SUPPORT_COMMAND_ID,
			// allow-any-unicode-next-line
			title: localize2('keel.help.command.show', "Hilfe öffnen"),
			f1: false,
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const editorService = accessor.get(IEditorService);
		const instantiationService = accessor.get(IInstantiationService);
		const input = instantiationService.createInstance(KeelHelpInput);
		await editorService.openEditor(input, { pinned: true });
		void keelHelpStrings; // Sicherstellen, dass der String-Bundle-Import beim Tree-Shaking bleibt.
	}
});

// --- Action: Plattform-Neustart (Toast-Stufe-2 Button "Erneut versuchen") ---

/**
 * `keel.platform.retryStart` — leitet auf `workbench.action.reloadWindow`
 * weiter. Wir halten den Otto-tauglichen Command-Namen separat vom
 * Dev-Jargon-Upstream-Command, damit Stufe-2-Toast-Buttons einen
 * menschenlesbaren Trigger haben und wir bei Bedarf spaeter eine
 * "State-sichern-dann-reloaden"-Erweiterung einfuegen koennen (Welle 12+).
 */
registerAction2(class KeelPlatformRetryStartAction extends Action2 {
	constructor() {
		super({
			id: KEEL_PLATFORM_RETRY_START_COMMAND_ID,
			// allow-any-unicode-next-line
			title: localize2('keel.platform.command.retryStart', "Keel neu starten"),
			f1: false,
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const hostService = accessor.get(IHostService);
		await hostService.reload();
	}
});

// --- Contributions registrieren ---

registerWorkbenchContribution2(
	KeelHelpEditorResolverContribution.ID,
	KeelHelpEditorResolverContribution,
	WorkbenchPhase.BlockStartup,
);
