/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import './media/cockpitAnchor.css';
import { Disposable, DisposableStore, IDisposable } from '../../../base/common/lifecycle.js';
import { $, addDisposableListener, append, EventType } from '../../../base/browser/dom.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { ICommandService } from '../../../platform/commands/common/commands.js';
import { IEditorService } from '../../../workbench/services/editor/common/editorService.js';
import { IHoverService } from '../../../platform/hover/browser/hover.js';
import { KEEL_COCKPIT_EDITOR_ID, KEEL_COCKPIT_SHOW_COMMAND_ID } from '../../cockpit/common/keelCockpit.js';
import { keelCockpitStrings } from '../../cockpit/browser/strings/keelCockpitStrings.js';
import {
	KEEL_COCKPIT_ANCHOR_ACTIVE_CLASS,
	KEEL_COCKPIT_ANCHOR_CONTAINER_CLASS,
	KEEL_COCKPIT_ANCHOR_ICON_CLASS,
} from '../common/cockpitAnchor.js';

/**
 * Cockpit-Anker als Activity-Bar-Item unter dem letzten ViewContainer.
 *
 * Der Anker wird vom chirurgischen Patch in `ActivityBarCompositeBar.create()`
 * (Upstream-Datei `activitybarPart.ts`, siehe D-025) direkt zwischen den
 * View-Container-Slots und dem globalen Account-/Manage-Bereich eingehaengt.
 * So landet er garantiert oben unter dem letzten Workbench-View-Icon und
 * erbt Groesse und Fluss der umliegenden Activity-Bar-Slots.
 *
 * Lifecycle-Verantwortung:
 * - Die aufrufende Partbar registriert die zurueckgegebene Disposable im
 *   eigenen DisposableStore.
 * - Beim Wiederaufbau des CompositeBar (Kompakt-Toggle) wird der alte Anker
 *   entsorgt, weil der Parent via `clearNode` geleert wird.
 */
export class KeelCockpitAnchor extends Disposable {

	/**
	 * Instantiiert den Cockpit-Anker und haengt ihn an den gegebenen Parent.
	 *
	 * @param instantiationService Workbench-Instantiation-Service zum Aufloesen
	 *   der benoetigten Services (ICommandService, IEditorService, IHoverService).
	 * @param parent Container, in den der Anker direkt angehaengt wird. Fuer die
	 *   Activity-Bar ist das das `element` der `ActivityBarCompositeBar` -
	 *   zwischen View-Container-Liste und GlobalCompositeBar.
	 * @returns Disposable, das den Anker wieder abbaut.
	 */
	static mount(instantiationService: IInstantiationService, parent: HTMLElement): IDisposable {
		return instantiationService.createInstance(KeelCockpitAnchor, parent);
	}

	private readonly container: HTMLElement;
	private readonly iconEl: HTMLSpanElement;

	constructor(
		parent: HTMLElement,
		@ICommandService private readonly commandService: ICommandService,
		@IEditorService private readonly editorService: IEditorService,
		@IHoverService hoverService: IHoverService,
	) {
		super();

		const disposables = this._register(new DisposableStore());

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
		disposables.add(hoverService.setupDelayedHover(this.container, {
			content: keelCockpitStrings.activitybarCockpitTooltip(),
			appearance: { showPointer: true },
		}));

		// Click / Enter / Space loesen den bestehenden Show-Command aus.
		disposables.add(addDisposableListener(this.container, EventType.CLICK, (e: MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			this.runShow();
		}));
		disposables.add(addDisposableListener(this.container, EventType.KEY_DOWN, (e: KeyboardEvent) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				e.stopPropagation();
				this.runShow();
			}
		}));

		// Reaktiver Active-State: beobachtet den aktiven Editor und spiegelt den
		// Cockpit-Editor-Zustand in die CSS-Klasse.
		disposables.add(this.editorService.onDidActiveEditorChange(() => this.syncActiveState()));
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

	override dispose(): void {
		super.dispose();
		this.container.remove();
	}
}
