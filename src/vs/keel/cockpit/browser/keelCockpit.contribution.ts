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
import {
	EditorExtensions,
	IEditorFactoryRegistry,
	IEditorSerializer,
} from '../../../workbench/common/editor.js';
import {
	IEditorResolverService,
	RegisteredEditorPriority,
} from '../../../workbench/services/editor/common/editorResolverService.js';
import { IEditorService } from '../../../workbench/services/editor/common/editorService.js';
import {
	IInstantiationService,
	ServicesAccessor,
} from '../../../platform/instantiation/common/instantiation.js';
import { Action2, registerAction2 } from '../../../platform/actions/common/actions.js';
import { localize, localize2 } from '../../../nls.js';
import { KeelCockpitEditor } from './keelCockpitEditor.js';
import { KeelCockpitInput } from './keelCockpitInput.js';
// Service-Import stellt sicher, dass der `registerSingleton`-Seiteneffekt
// aus `keelCockpitService.ts` ausgefuehrt wird, sobald diese Contribution
// geladen wird.
import './keelCockpitService.js';
// Welle 9: Projekt- und Projektleiter-Service analog registrieren.
import './keelProjectService.js';
import './keelProjectLeadService.js';
import { KEEL_COCKPIT_SHOW_COMMAND_ID } from '../common/keelCockpit.js';

/**
 * Serializer fuer `KeelCockpitInput`. Ermoeglicht, dass das Cockpit nach einem
 * Neustart der Workbench wiederhergestellt wird, falls es als aktiver Editor
 * geschlossen wurde.
 */
class KeelCockpitInputSerializer implements IEditorSerializer {
	canSerialize(): boolean {
		return true;
	}

	serialize(): string {
		return JSON.stringify({});
	}

	deserialize(_instantiationService: IInstantiationService): KeelCockpitInput {
		return new KeelCockpitInput({});
	}
}

// --- Registry-Eintragungen ---

Registry.as<IEditorFactoryRegistry>(EditorExtensions.EditorFactory)
	.registerEditorSerializer(KeelCockpitInput.ID, KeelCockpitInputSerializer);

Registry.as<IEditorPaneRegistry>(EditorExtensions.EditorPane).registerEditorPane(
	EditorPaneDescriptor.create(
		KeelCockpitEditor,
		KeelCockpitEditor.ID,
		localize('keelCockpitEditorLabel', "Cockpit"),
	),
	[
		new SyncDescriptor(KeelCockpitInput),
	],
);

/**
 * Resolver-Contribution: sorgt dafuer, dass eine URI mit dem Cockpit-Scheme
 * automatisch mit dem `KeelCockpitEditor` geoeffnet wird.
 */
class KeelCockpitEditorResolverContribution extends Disposable implements IWorkbenchContribution {

	static readonly ID = 'keel.cockpit.editorResolver';

	constructor(
		@IEditorResolverService editorResolverService: IEditorResolverService,
		@IInstantiationService instantiationService: IInstantiationService,
	) {
		super();

		this._register(editorResolverService.registerEditor(
			`${KeelCockpitInput.RESOURCE.scheme}:${KeelCockpitInput.RESOURCE.authority}/**`,
			{
				id: KeelCockpitEditor.ID,
				label: localize('keelCockpitResolverLabel', "Cockpit"),
				priority: RegisteredEditorPriority.builtin,
			},
			{
				singlePerResource: true,
				canSupportResource: resource =>
					resource.scheme === KeelCockpitInput.RESOURCE.scheme
					&& resource.authority === KeelCockpitInput.RESOURCE.authority,
			},
			{
				createEditorInput: () => ({
					editor: instantiationService.createInstance(KeelCockpitInput, {}),
				}),
			},
		));
	}
}

// --- Action: explizites Oeffnen des Cockpits ---

registerAction2(class OpenKeelCockpitAction extends Action2 {
	constructor() {
		super({
			id: KEEL_COCKPIT_SHOW_COMMAND_ID,
			// allow-any-unicode-next-line
			title: localize2('keel.cockpit.command.show', "Cockpit öffnen"),
			f1: true,
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const editorService = accessor.get(IEditorService);
		const instantiationService = accessor.get(IInstantiationService);
		const input = instantiationService.createInstance(KeelCockpitInput, {});
		await editorService.openEditor(input, { pinned: true });
	}
});

// --- Contributions registrieren ---

registerWorkbenchContribution2(
	KeelCockpitEditorResolverContribution.ID,
	KeelCockpitEditorResolverContribution,
	WorkbenchPhase.BlockStartup,
);
