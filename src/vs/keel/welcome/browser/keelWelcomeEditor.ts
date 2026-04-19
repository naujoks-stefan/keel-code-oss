/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { $, append, clearNode, Dimension } from '../../../base/browser/dom.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { ICommandService } from '../../../platform/commands/common/commands.js';
import { IEditorOpenContext } from '../../../workbench/common/editor.js';
import { EditorPane } from '../../../workbench/browser/parts/editor/editorPane.js';
import { IEditorGroup } from '../../../workbench/services/editor/common/editorGroupsService.js';
import { INotificationService } from '../../../platform/notification/common/notification.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../platform/theme/common/themeService.js';
import { IKeelCockpitService } from '../../cockpit/browser/keelCockpitService.js';
import { KeelWelcomeInput } from './keelWelcomeInput.js';
import { KeelWelcomeView } from './keelWelcomeView.js';
import { keelWelcomeStrings } from './strings/keelWelcomeStrings.js';
import {
	KEEL_WELCOME_EDITOR_ID,
	KEEL_WELCOME_SHOWN_STORAGE_KEY,
} from '../common/keelWelcome.js';

/**
 * EditorPane fuer das Keel-Welcome.
 *
 * Das Welcome ersetzt den VSCode-Standard-`gettingStarted` funktional - es rendert
 * beim ersten Start eine einladende Eingabezeile mit fuenf Beispiel-Cards und einem
 * "So funktioniert Keel"-Sekundaer-Bereich. Nach dem ersten erfolgreichen Submit wird
 * das First-Run-Flag gesetzt und der Editor geschlossen.
 *
 * Nach dem Submit uebergibt der Handler den Prompt an den `IKeelCockpitService`
 * und oeffnet den Cockpit-Editor. Die echte Dispatch-Verdrahtung (gegen
 * `IDispatchEngine` aus `@keel/core`) erfolgt spaeter ueber den Host-Adapter im
 * Cockpit-Service - Welcome kennt diesen Pfad nicht. Ist der Cockpit-Service
 * aus irgendeinem Grund nicht verfuegbar, wird defensiv die alte Toast-Meldung
 * als Fallback angezeigt.
 *
 * @invariant Welcome ruft keine Telemetrie - keel-Platform-Default ist Telemetrie-aus.
 *   `ITelemetryService` wird nur injiziert, weil die `EditorPane`-Basisklasse ihn
 *   verpflichtend entgegennimmt; eigene `publicLog`-Calls sind hier verboten.
 */
export class KeelWelcomeEditor extends EditorPane {

	static readonly ID = KEEL_WELCOME_EDITOR_ID;

	private rootElement: HTMLElement | undefined;
	private view: KeelWelcomeView | undefined;

	constructor(
		group: IEditorGroup,
		@ITelemetryService telemetryService: ITelemetryService,
		@IThemeService themeService: IThemeService,
		@IStorageService private readonly keelStorageService: IStorageService,
		@INotificationService private readonly notificationService: INotificationService,
		@ICommandService private readonly commandService: ICommandService,
		@IKeelCockpitService private readonly cockpitService: IKeelCockpitService,
	) {
		super(KeelWelcomeEditor.ID, group, telemetryService, themeService, keelStorageService);
	}

	protected createEditor(parent: HTMLElement): void {
		this.rootElement = append(parent, $<HTMLDivElement>('div.keel-welcome-root'));
	}

	override async setInput(input: KeelWelcomeInput, options: unknown, context: IEditorOpenContext, token: CancellationToken): Promise<void> {
		await super.setInput(input, undefined, context, token);

		if (token.isCancellationRequested || !this.rootElement) {
			return;
		}

		this.renderView(input);
	}

	override clearInput(): void {
		this.disposeView();
		super.clearInput();
	}

	override focus(): void {
		super.focus();
		this.view?.focusPrompt();
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

	private renderView(input: KeelWelcomeInput): void {
		if (!this.rootElement) {
			return;
		}

		this.disposeView();
		clearNode(this.rootElement);

		const autoFocusInput = input.initiator === 'startup';
		const view = new KeelWelcomeView(this.rootElement, {
			onSubmit: prompt => this.handleSubmit(prompt),
			onOpenRules: () => this.handleOpenRules(),
		}, {
			autoFocusInput,
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

	private handleSubmit(prompt: string): void {
		// First-Run-Flag persistieren: nach dem ersten Submit wird Welcome
		// beim naechsten Start nicht mehr automatisch geoeffnet.
		this.keelStorageService.store(
			KEEL_WELCOME_SHOWN_STORAGE_KEY,
			true,
			StorageScope.APPLICATION,
			StorageTarget.USER,
		);

		// Fire-and-forget: der View-Callback ist synchron, der Cockpit-Sprung aber
		// async (Task anlegen + Editor oeffnen). Fehler-Pfad fallbackt auf Toast.
		void this.dispatchToCockpit(prompt);
	}

	private async dispatchToCockpit(prompt: string): Promise<void> {
		const trimmed = prompt.trim();
		const input = this.input;

		try {
			if (this.cockpitService) {
				await this.cockpitService.addTask(trimmed);
				await this.cockpitService.openCockpit();
			} else {
				// Defensive: Cockpit-Service nicht verfuegbar -> Toast als Backup.
				this.notificationService.info(keelWelcomeStrings.toastDispatchAccepted());
			}
		} catch (error) {
			// Defensive: falls Cockpit-Oeffnen scheitert, den User nicht im
			// Leeren stehen lassen. Welcome schliesst trotzdem - das First-Run-
			// Flag ist bereits persistiert und der Auftrag wurde angenommen.
			this.notificationService.info(keelWelcomeStrings.toastDispatchAccepted());
			// Error wird nicht weiter verfolgt - Toast reicht als User-Feedback,
			// Cockpit-Service ist optional und fehlende Integration ist nicht tragisch.
			void error;
		}

		// Editor schliessen - das Input-Objekt schliessen, nicht die View.
		if (input) {
			this.group.closeEditor(input);
		}
	}

	private handleOpenRules(): void {
		// Oeffnet den Keel-Einstellungen-Bereich. Solange es keinen eigenen Keel-
		// Settings-Editor gibt, nutzen wir die Workbench-Settings mit dem Keel-
		// Konfigurations-Prefix als Query.
		// TODO(v2): Privacy-Link soll spaeter auf keel.rules zeigen, sobald der
		// Regeln-Bereich existiert - aktuell zeigt er nur auf die Welcome-Settings.
		void this.commandService.executeCommand('workbench.action.openSettings', 'keel.welcome');
	}
}
