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
import { IEditorGroupsService } from '../../../workbench/services/editor/common/editorGroupsService.js';
import { IStorageService, StorageScope } from '../../../platform/storage/common/storage.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import {
	IInstantiationService,
	ServicesAccessor,
} from '../../../platform/instantiation/common/instantiation.js';
import { Action2, registerAction2 } from '../../../platform/actions/common/actions.js';
import {
	ConfigurationScope,
	Extensions as ConfigurationExtensions,
	IConfigurationRegistry,
} from '../../../platform/configuration/common/configurationRegistry.js';
import { workbenchConfigurationNodeBase } from '../../../workbench/common/configuration.js';
import { localize, localize2 } from '../../../nls.js';
import { KeelWelcomeEditor } from './keelWelcomeEditor.js';
import { KeelWelcomeInput } from './keelWelcomeInput.js';
import { keelWelcomeStrings } from './strings/keelWelcomeStrings.js';
import {
	KEEL_WELCOME_SHOWN_STORAGE_KEY,
	KEEL_WELCOME_SHOW_COMMAND_ID,
	KEEL_WELCOME_SHOW_ON_STARTUP_CONFIG_KEY,
} from '../common/keelWelcome.js';

/**
 * Serializer fuer `KeelWelcomeInput`. Ermoeglicht, dass das Welcome nach einem
 * Neustart der Workbench wiederhergestellt wird, falls es als aktiver Editor
 * geschlossen wurde - in der Praxis relevant fuer Opt-in-Neuanzeige.
 */
class KeelWelcomeInputSerializer implements IEditorSerializer {
	canSerialize(): boolean {
		return true;
	}

	serialize(): string {
		return JSON.stringify({});
	}

	deserialize(_instantiationService: IInstantiationService): KeelWelcomeInput {
		return new KeelWelcomeInput({});
	}
}

// --- Registry-Eintragungen ---

Registry.as<IEditorFactoryRegistry>(EditorExtensions.EditorFactory)
	.registerEditorSerializer(KeelWelcomeInput.ID, KeelWelcomeInputSerializer);

Registry.as<IEditorPaneRegistry>(EditorExtensions.EditorPane).registerEditorPane(
	EditorPaneDescriptor.create(
		KeelWelcomeEditor,
		KeelWelcomeEditor.ID,
		localize('keelWelcomeEditorLabel', "Willkommen"),
	),
	[
		new SyncDescriptor(KeelWelcomeInput),
	],
);

/**
 * Resolver-Contribution: sorgt dafuer, dass eine URI mit dem Welcome-Scheme
 * automatisch mit dem `KeelWelcomeEditor` geoeffnet wird. Ohne diesen Resolver
 * wuerde die Editor-Pane nicht matchen, wenn jemand die Resource direkt oeffnet.
 */
class KeelWelcomeEditorResolverContribution extends Disposable implements IWorkbenchContribution {

	static readonly ID = 'keel.welcome.editorResolver';

	constructor(
		@IEditorResolverService editorResolverService: IEditorResolverService,
		@IInstantiationService instantiationService: IInstantiationService,
	) {
		super();

		this._register(editorResolverService.registerEditor(
			`${KeelWelcomeInput.RESOURCE.scheme}:${KeelWelcomeInput.RESOURCE.authority}/**`,
			{
				id: KeelWelcomeEditor.ID,
				label: localize('keelWelcomeResolverLabel', "Willkommen"),
				priority: RegisteredEditorPriority.builtin,
			},
			{
				singlePerResource: true,
				canSupportResource: resource =>
					resource.scheme === KeelWelcomeInput.RESOURCE.scheme
					&& resource.authority === KeelWelcomeInput.RESOURCE.authority,
			},
			{
				createEditorInput: () => ({
					editor: instantiationService.createInstance(KeelWelcomeInput, {}),
				}),
			},
		));
	}
}

/**
 * Startup-Contribution: entscheidet beim Boot, ob das Welcome geoeffnet wird.
 *
 * Regel (Spec):
 *   - First-Run (Storage-Flag fehlt) -> oeffnen.
 *   - Opt-in per Einstellung (`keel.welcome.showOnStartup: true`) -> oeffnen, auch
 *     wenn das Flag schon gesetzt ist.
 *   - Sonst: nicht oeffnen.
 */
class KeelWelcomeStartupContribution extends Disposable implements IWorkbenchContribution {

	static readonly ID = 'keel.welcome.startup';

	constructor(
		@IStorageService private readonly storageService: IStorageService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IEditorService private readonly editorService: IEditorService,
		@IEditorGroupsService private readonly editorGroupsService: IEditorGroupsService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
	) {
		super();
		void this.run();
	}

	private async run(): Promise<void> {
		await this.editorGroupsService.whenReady;

		const hasBeenShown = this.storageService.getBoolean(
			KEEL_WELCOME_SHOWN_STORAGE_KEY,
			StorageScope.APPLICATION,
			false,
		);

		// Opt-in: User kann Welcome erneut zeigen lassen. Das Setting wird
		// ueber `registerConfiguration` als Workbench-Einstellung gepflegt und
		// damit vom `IConfigurationService` verwaltet. Entsprechend lesen wir
		// den Wert auch hier aus dem Config-Service - der Storage-Service
		// enthaelt das Flag nicht.
		const forceShow = this.configurationService.getValue<boolean>(KEEL_WELCOME_SHOW_ON_STARTUP_CONFIG_KEY) === true;

		if (hasBeenShown && !forceShow) {
			return;
		}

		// Nicht aufdraengen, wenn schon ein Editor aktiv ist (z.B. durch Hot-Restore).
		if (this.editorService.activeEditor) {
			return;
		}

		const input = this.instantiationService.createInstance(KeelWelcomeInput, { initiator: 'startup' });
		await this.editorService.openEditor(input, { pinned: false });
	}
}

// --- Action: explizites Oeffnen des Welcome ---

registerAction2(class OpenKeelWelcomeAction extends Action2 {
	constructor() {
		super({
			id: KEEL_WELCOME_SHOW_COMMAND_ID,
			// allow-any-unicode-next-line
			title: localize2('keel.welcome.command.show', "Start-Einführung öffnen"),
			f1: true,
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const editorService = accessor.get(IEditorService);
		const instantiationService = accessor.get(IInstantiationService);
		const input = instantiationService.createInstance(KeelWelcomeInput, { initiator: 'command' });
		await editorService.openEditor(input, { pinned: true });
	}
});

// --- Konfiguration: Schalter in Einstellungen - Allgemein ---

const configurationRegistry = Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
	...workbenchConfigurationNodeBase,
	properties: {
		[KEEL_WELCOME_SHOW_ON_STARTUP_CONFIG_KEY]: {
			scope: ConfigurationScope.APPLICATION,
			type: 'boolean',
			default: false,
			description: keelWelcomeStrings.showOnStartupDescription(),
		},
	},
});

// --- Contributions registrieren ---

registerWorkbenchContribution2(
	KeelWelcomeEditorResolverContribution.ID,
	KeelWelcomeEditorResolverContribution,
	WorkbenchPhase.BlockStartup,
);
registerWorkbenchContribution2(
	KeelWelcomeStartupContribution.ID,
	KeelWelcomeStartupContribution,
	WorkbenchPhase.AfterRestored,
);
