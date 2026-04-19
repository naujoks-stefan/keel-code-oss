/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { $, append, clearNode, Dimension } from '../../../base/browser/dom.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { URI } from '../../../base/common/uri.js';
import { ICommandService } from '../../../platform/commands/common/commands.js';
import { IOpenerService } from '../../../platform/opener/common/opener.js';
import { IEditorOpenContext } from '../../../workbench/common/editor.js';
import { EditorPane } from '../../../workbench/browser/parts/editor/editorPane.js';
import { IEditorGroup } from '../../../workbench/services/editor/common/editorGroupsService.js';
import { IStorageService } from '../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../platform/theme/common/themeService.js';
import { KEEL_COCKPIT_SHOW_COMMAND_ID } from '../../cockpit/common/keelCockpit.js';
import { IKeelSettingsService } from '../../settings/browser/keelSettingsService.js';
import { KeelHelpInput } from './keelHelpInput.js';
import { KeelHelpView } from './keelHelpView.js';
import { keelHelpStrings } from './strings/keelHelpStrings.js';
import { KEEL_HELP_EDITOR_ID } from '../common/keelHelp.js';

/**
 * EditorPane fuer den Keel-Help-Editor (Welle 11).
 *
 * MVP-Landeplatz fuer den `[Hilfe]`-Button aus Toast-Stufe-2 (D-027). Zeigt
 * einen Otto-tauglichen Minimal-Help-Screen mit E-Mail-Kontakt und einem
 * Recover-Button zurueck ins Cockpit.
 *
 * @invariant Help-Editor ruft keine Telemetrie. `ITelemetryService` wird nur
 *   injiziert, weil die `EditorPane`-Basisklasse ihn verpflichtend
 *   entgegennimmt; eigene `publicLog`-Calls sind hier verboten.
 */
export class KeelHelpEditor extends EditorPane {

	static readonly ID = KEEL_HELP_EDITOR_ID;

	private rootElement: HTMLElement | undefined;
	private view: KeelHelpView | undefined;

	constructor(
		group: IEditorGroup,
		@ITelemetryService telemetryService: ITelemetryService,
		@IThemeService themeService: IThemeService,
		@IStorageService storageService: IStorageService,
		@ICommandService private readonly commandService: ICommandService,
		@IOpenerService private readonly openerService: IOpenerService,
		@IKeelSettingsService private readonly settingsService: IKeelSettingsService,
	) {
		super(KeelHelpEditor.ID, group, telemetryService, themeService, storageService);
	}

	protected createEditor(parent: HTMLElement): void {
		this.rootElement = append(parent, $<HTMLDivElement>('div.keel-help-root'));
	}

	override async setInput(input: KeelHelpInput, options: unknown, context: IEditorOpenContext, token: CancellationToken): Promise<void> {
		await super.setInput(input, undefined, context, token);

		// Settings-Service initialisieren, damit `dataLocationUri` in der View
		// mit dem echten Ordner-Pfad gerendert wird. `initialize()` ist
		// idempotent — wiederholtes Aufrufen ist guenstig.
		await this.settingsService.initialize();

		if (token.isCancellationRequested || !this.rootElement) {
			return;
		}
		this.renderView();
	}

	override clearInput(): void {
		this.disposeView();
		super.clearInput();
	}

	override focus(): void {
		super.focus();
		// Der Recover-Button ist das erste sinnvolle Tab-Stop-Element im
		// Help-Editor — bei Fokus holen wir ihn direkt, damit Otto Enter
		// druecken und ins Cockpit zurueckkehren kann.
		this.view?.recoverButtonNode?.focus();
	}

	override layout(_dimension: Dimension): void {
		// Layout uebernimmt CSS komplett (flex + max-width). Keine explizite
		// Groessen-Propagation noetig.
	}

	override dispose(): void {
		this.disposeView();
		super.dispose();
	}

	// --- intern ---

	private renderView(): void {
		if (!this.rootElement) {
			return;
		}
		this.disposeView();
		clearNode(this.rootElement);

		const view = new KeelHelpView(this.rootElement, {
			onOpenCockpit: () => this.handleOpenCockpit(),
			onOpenEmail: (mailto: URI) => this.handleOpenEmail(mailto),
		}, {
			dataLocation: this.settingsService.dataLocationUri.fsPath,
			contactEmail: keelHelpStrings.contactEmail(),
		});
		view.render();
		this.view = view;
	}

	private disposeView(): void {
		if (this.view) {
			this.view.dispose();
			this.view = undefined;
		}
	}

	private handleOpenCockpit(): void {
		void this.commandService.executeCommand(KEEL_COCKPIT_SHOW_COMMAND_ID);
	}

	private handleOpenEmail(mailto: URI): void {
		void this.openerService.open(mailto, { openExternal: true });
	}
}
