/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { $, append, clearNode, Dimension } from '../../../base/browser/dom.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { IEditorOpenContext } from '../../../workbench/common/editor.js';
import { EditorPane } from '../../../workbench/browser/parts/editor/editorPane.js';
import { IEditorGroup } from '../../../workbench/services/editor/common/editorGroupsService.js';
import { INotificationService, Severity } from '../../../platform/notification/common/notification.js';
import { IStorageService } from '../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../platform/theme/common/themeService.js';
import { KeelCockpitInput } from './keelCockpitInput.js';
import { KeelCockpitView } from './keelCockpitView.js';
import { IKeelCockpitService } from './keelCockpitService.js';
import { IKeelProjectService } from './keelProjectService.js';
import { IKeelProjectLeadService } from './keelProjectLeadService.js';
import { KEEL_COCKPIT_EDITOR_ID } from '../common/keelCockpit.js';
import { keelCockpitStrings } from './strings/keelCockpitStrings.js';

/**
 * EditorPane fuer das Keel-Cockpit.
 *
 * Das Cockpit ist die zentrale Orchestrations-Flaeche der Plattform: hier
 * laufen Auftraege, findet Plan-Review statt, landen Ergebnisse. Es rendert
 * adaptiv zwischen Empty-State, Fokus-Layout (1 Task) und Grid-Layouts
 * (2/3/4 Tasks) mit Queue fuer 5+ Tasks.
 *
 * Die Daten-Quelle ist der `IKeelCockpitService` (MVP: Mock-Store mit drei
 * Demo-Karten in drei Phasen, Welle B: echte DispatchEngine-Anbindung).
 *
 * @invariant Cockpit ruft keine Telemetrie - Keel-Platform-Default ist
 *   Telemetrie-aus. `ITelemetryService` wird nur injiziert, weil die
 *   `EditorPane`-Basisklasse ihn verpflichtend entgegennimmt.
 */
export class KeelCockpitEditor extends EditorPane {

	static readonly ID = KEEL_COCKPIT_EDITOR_ID;

	private rootElement: HTMLElement | undefined;
	private view: KeelCockpitView | undefined;

	constructor(
		group: IEditorGroup,
		@ITelemetryService telemetryService: ITelemetryService,
		@IThemeService themeService: IThemeService,
		@IStorageService storageService: IStorageService,
		@INotificationService private readonly notificationService: INotificationService,
		@IKeelCockpitService private readonly cockpitService: IKeelCockpitService,
		@IKeelProjectService private readonly projectService: IKeelProjectService,
		@IKeelProjectLeadService private readonly projectLeadService: IKeelProjectLeadService,
	) {
		super(KeelCockpitEditor.ID, group, telemetryService, themeService, storageService);
	}

	protected createEditor(parent: HTMLElement): void {
		this.rootElement = append(parent, $<HTMLDivElement>('div.keel-cockpit-root', {
			role: 'main',
			'aria-label': keelCockpitStrings.containerAriaLabel(),
		}));
	}

	override async setInput(
		input: KeelCockpitInput,
		options: unknown,
		context: IEditorOpenContext,
		token: CancellationToken,
	): Promise<void> {
		await super.setInput(input, undefined, context, token);

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
		this.view?.focus();
	}

	override layout(_dimension: Dimension): void {
		// Das Layout uebernimmt CSS komplett (flex/grid + max-width). Keine
		// explizite Groessen-Propagation noetig.
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

		const view = new KeelCockpitView(this.rootElement, {
			onNewTask: prompt => this.handleNewTask(prompt),
			onNotify: message => this.notificationService.info(message),
			onWarn: message => this.notificationService.warn(message),
			onConfirm: (message, yesLabel, noLabel, onYes, onNo) => {
				this.notificationService.prompt(
					Severity.Warning,
					message,
					[
						{ label: yesLabel, run: () => onYes() },
						{ label: noLabel, run: () => onNo?.() },
					],
				);
			},
		}, this.cockpitService, this.projectService, this.projectLeadService);

		view.render();
		this.view = view;
	}

	private disposeView(): void {
		if (this.view) {
			this.view.dispose();
			this.view = undefined;
		}
	}

	private handleNewTask(prompt: string): void {
		// Die Service-Implementierung kuemmert sich um ID-Generierung und Event-
		// Dispatch; die View rendert sich nach `onTasksChanged` neu.
		void this.cockpitService.addTask(prompt);
	}
}
