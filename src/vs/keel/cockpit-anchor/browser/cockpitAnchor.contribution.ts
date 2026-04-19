/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import './media/cockpitAnchor.css';
import { Disposable, DisposableStore, IDisposable } from '../../../base/common/lifecycle.js';
import { $, addDisposableListener, append, EventType } from '../../../base/browser/dom.js';
import { mainWindow } from '../../../base/browser/window.js';
import { ICommandService } from '../../../platform/commands/common/commands.js';
import { IEditorService } from '../../../workbench/services/editor/common/editorService.js';
import { IHoverService } from '../../../platform/hover/browser/hover.js';
import {
	registerWorkbenchContribution2,
	WorkbenchPhase,
	IWorkbenchContribution,
} from '../../../workbench/common/contributions.js';
import { KEEL_COCKPIT_EDITOR_ID, KEEL_COCKPIT_SHOW_COMMAND_ID } from '../../cockpit/common/keelCockpit.js';
import { keelCockpitStrings } from '../../cockpit/browser/strings/keelCockpitStrings.js';
import {
	KEEL_COCKPIT_ANCHOR_ACTIVE_CLASS,
	KEEL_COCKPIT_ANCHOR_CONTAINER_CLASS,
	KEEL_COCKPIT_ANCHOR_ICON_CLASS,
} from '../common/cockpitAnchor.js';

/**
 * Mount-Punkt fuer den Cockpit-Anker in der Activity-Bar.
 *
 * Die Workbench-Contribution laeuft einmalig beim Startup (Phase
 * `AfterRestored`) und sucht den Activity-Bar-Part im DOM. Wenn er gefunden
 * wird, haengt sie den Anker-Slot direkt unter den View-Container-Slot.
 *
 * Das Rendering selbst delegiert die Contribution an `KeelCockpitAnchorView`,
 * damit Lifecycle (Listener, Disposables) klar getrennt vom Workbench-
 * Contribution-Flow bleibt.
 */
class KeelCockpitAnchorContribution extends Disposable implements IWorkbenchContribution {

	static readonly ID = 'keel.cockpit.anchor';

	private readonly viewDisposables = this._register(new DisposableStore());

	constructor(
		@ICommandService private readonly commandService: ICommandService,
		@IEditorService private readonly editorService: IEditorService,
		@IHoverService private readonly hoverService: IHoverService,
	) {
		super();
		this.tryMount();
	}

	/**
	 * Haengt den Anker in den Activity-Bar-Part, sobald dieser im DOM ist.
	 *
	 * Der Part wird erst gerendert, nachdem die Workbench fertig layoutet ist.
	 * Fuer den Moment der Contribution-Erzeugung kann der Part noch fehlen,
	 * deshalb nutzen wir einen kleinen Retry via `requestAnimationFrame`. Die
	 * `tries`-Begrenzung verhindert eine Endlosschleife, falls der Part z.B.
	 * durch eine Settings-Option ganz deaktiviert ist.
	 */
	private tryMount(tries = 0): void {
		// Wir mounten bewusst einmalig in das Haupt-Workbench-Fenster.
		// Multi-Window-Unterstuetzung ist Scope fuer eine spaetere Keel-Welle.
		// eslint-disable-next-line no-restricted-syntax
		const activityBar = mainWindow.document.querySelector<HTMLElement>('.monaco-workbench .part.activitybar .content');

		if (!activityBar) {
			if (tries >= 40) {
				// 40 Frames ~ 0.6s. Danach gilt die Activity-Bar als nicht
				// verfuegbar (z.B. komplett deaktiviertes Layout). Wir bauen
				// den Anker dann nicht und lassen Otto weiterhin via Command
				// oder Welcome-Submit ins Cockpit springen.
				return;
			}
			const raf = mainWindow.requestAnimationFrame(() => this.tryMount(tries + 1));
			this._register({ dispose: () => mainWindow.cancelAnimationFrame(raf) });
			return;
		}

		const anchorView = this.viewDisposables.add(new KeelCockpitAnchorView(
			activityBar,
			this.commandService,
			this.editorService,
			this.hoverService,
		));
		// View selbst kuemmert sich um seine Listener - nichts weiter zu tun.
		void anchorView;
	}
}

/**
 * Rendert und steuert das Cockpit-Icon in der Activity-Bar.
 *
 * Der View ist bewusst unabhaengig von der Contribution - sein Lifecycle ist
 * an den `DisposableStore` der Contribution gebunden, sodass Disposables
 * (Click-Listener, Hover-Widget, onDidActiveEditorChange-Subscription)
 * sauber aufgeraeumt werden, sobald die Workbench herunterfaehrt.
 */
class KeelCockpitAnchorView implements IDisposable {

	private readonly container: HTMLElement;
	private readonly iconEl: HTMLSpanElement;
	private readonly disposables = new DisposableStore();

	constructor(
		parent: HTMLElement,
		private readonly commandService: ICommandService,
		private readonly editorService: IEditorService,
		hoverService: IHoverService,
	) {
		this.container = append(parent, $<HTMLDivElement>(
			`div.${KEEL_COCKPIT_ANCHOR_CONTAINER_CLASS}`,
			{
				role: 'button',
				tabIndex: '0',
				'aria-label': keelCockpitStrings.activitybarCockpitAria(),
			},
		));

		this.iconEl = append(this.container, $<HTMLSpanElement>(
			`span.codicon.codicon-dashboard.${KEEL_COCKPIT_ANCHOR_ICON_CLASS}`,
			{ 'aria-hidden': 'true' },
		));
		// Icon referenzieren, damit der Linter die Variable nicht als unused meldet.
		void this.iconEl;

		// Hover-Widget via IHoverService (Guideline: Tooltips ueber den Service).
		this.disposables.add(hoverService.setupDelayedHover(this.container, {
			content: keelCockpitStrings.activitybarCockpitTooltip(),
			appearance: { showPointer: true },
		}));

		// Click / Enter / Space loesen den bestehenden Show-Command aus.
		this.disposables.add(addDisposableListener(this.container, EventType.CLICK, (e: MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			this.runShow();
		}));
		this.disposables.add(addDisposableListener(this.container, EventType.KEY_DOWN, (e: KeyboardEvent) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				e.stopPropagation();
				this.runShow();
			}
		}));

		// Reaktiver Active-State: beobachtet den aktiven Editor und spiegelt
		// den Cockpit-Editor-Zustand in die CSS-Klasse.
		this.disposables.add(this.editorService.onDidActiveEditorChange(() => this.syncActiveState()));
		this.syncActiveState();
	}

	private runShow(): void {
		void this.commandService.executeCommand(KEEL_COCKPIT_SHOW_COMMAND_ID);
	}

	private syncActiveState(): void {
		const active = this.editorService.activeEditor;
		const isCockpitActive = active?.editorId === KEEL_COCKPIT_EDITOR_ID;
		this.container.classList.toggle(KEEL_COCKPIT_ANCHOR_ACTIVE_CLASS, isCockpitActive);
	}

	dispose(): void {
		this.disposables.dispose();
		this.container.remove();
	}
}

registerWorkbenchContribution2(
	KeelCockpitAnchorContribution.ID,
	KeelCockpitAnchorContribution,
	WorkbenchPhase.AfterRestored,
);
