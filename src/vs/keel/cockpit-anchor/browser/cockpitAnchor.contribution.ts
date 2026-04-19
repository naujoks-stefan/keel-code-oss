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
	KEEL_COCKPIT_ANCHOR_BAR_CLASS,
	KEEL_COCKPIT_ANCHOR_CONTAINER_CLASS,
} from '../common/cockpitAnchor.js';

/**
 * Cockpit-Anker als natives Activity-Bar-Item unter dem letzten
 * ViewContainer (Welle 10, Iteration 3).
 *
 * Iteration-1 setzte den Anker ans Ende des `.content`-Containers (neben
 * GlobalCompositeBar). Iteration-2 verschob ihn als Geschwister des
 * `.monaco-action-bar` in die `.composite-bar`, was die Position fixte, aber
 * weil die Upstream-CSS-Selektoren strikt auf `.monaco-action-bar .action-item
 * .action-label` zielen, griff keines der Slot-/Icon-Sizing-Regelwerke. Das
 * Icon blieb auf der Codicon-Default-Groesse (`font: 16px/1 codicon` aus
 * `codicon.css`) - rund 50 % kleiner als Marketplace.
 *
 * Iteration-3 (diese Datei) repliziert die exakte Upstream-DOM-Struktur
 * eines `CompositeActionViewItem`, eingebettet in eine zweite
 * `.monaco-action-bar.vertical`-Shell - als Geschwister der vorhandenen
 * Action-Bar in `.composite-bar`. Vorteile:
 *
 * - Alle Upstream-Selektoren (`.activitybar > .content :not(.monaco-menu) >
 *   .monaco-action-bar .action-label.codicon`, `.action-item.checked
 *   .active-item-indicator:before`, etc.) greifen automatisch und liefern
 *   identisches Slot-Sizing, Icon-Groesse, Hover-Farbe und linken
 *   Aktiv-Border.
 * - Kein CSS-Reverse-Engineering: wir nutzen die bestehenden
 *   Styling-Pfade.
 * - Wir brauchen weiter keinen Phantom-ViewContainer - d.h. keine
 *   Pin-/Unpin-Menus, keine Drag-and-Drop-Shim, keine Sidebar-Pane-
 *   Verwaltung. Die `li`-Slot-Logik (siehe Upstream `ActionBar#push`)
 *   wuerde unseren Anker bei `computeSizes()`-Transient-Operationen als
 *   Ghost-Item loeschen - deshalb bleibt die `ul` bewusst unser eigener
 *   Sibling-Wrapper, nicht die bestehende `actions-container` der
 *   ViewContainer-Liste.
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
	 *   Activity-Bar ist das der `.composite-bar`-Container (das Ergebnis von
	 *   `super.create(this.element)` in `ActivityBarCompositeBar`), sodass der
	 *   Anker als Geschwister des `.monaco-action-bar` im Block-Flow direkt
	 *   unter dem letzten ViewContainer-Icon sitzt.
	 * @returns Disposable, das den Anker wieder abbaut.
	 */
	static mount(instantiationService: IInstantiationService, parent: HTMLElement): IDisposable {
		return instantiationService.createInstance(KeelCockpitAnchor, parent);
	}

	private readonly barEl: HTMLDivElement;
	private readonly listEl: HTMLUListElement;
	private readonly itemEl: HTMLLIElement;
	private readonly labelEl: HTMLAnchorElement;

	constructor(
		parent: HTMLElement,
		@ICommandService private readonly commandService: ICommandService,
		@IEditorService private readonly editorService: IEditorService,
		@IHoverService hoverService: IHoverService,
	) {
		super();

		const disposables = this._register(new DisposableStore());

		// Aeusserer Wrapper, der die Upstream-Klasse `.monaco-action-bar.vertical`
		// traegt. Damit greifen alle `.activitybar > .content :not(.monaco-menu)
		// > .monaco-action-bar ...`-Selektoren.
		this.barEl = append(parent, $<HTMLDivElement>(
			`div.monaco-action-bar.vertical.${KEEL_COCKPIT_ANCHOR_BAR_CLASS}`,
		));

		// Liste mit role=tablist, analog zum Upstream-CompositeBar
		// (`ariaRole: 'tablist'` in `compositeBar.ts`).
		this.listEl = append(this.barEl, $<HTMLUListElement>(
			'ul.actions-container',
			{ role: 'tablist' },
		));

		// Das eigentliche Action-Item. `.action-item.icon` ist das Muster, das
		// der Upstream-Code beim Rendering mit `this.options.icon` setzt
		// (siehe `CompositeBarActionViewItem#render`).
		this.itemEl = append(this.listEl, $<HTMLLIElement>(
			`li.action-item.icon.${KEEL_COCKPIT_ANCHOR_CONTAINER_CLASS}`,
			{
				role: 'tab',
				tabIndex: '0',
				'aria-label': keelCockpitStrings.activitybarCockpitAria(),
			},
		));

		// `.action-label.codicon.codicon-dashboard` - dieselbe Klassen-Kette, die
		// `CompositeBarActionViewItem#updateLabel` setzt (plus `codicon-<id>`).
		// Damit greift in `activityaction.css`:
		//   `.action-label { width: 48px; height: 48px; }`
		//   `.action-label.codicon { font-size: var(--activity-bar-icon-size); }`
		this.labelEl = append(this.itemEl, $<HTMLAnchorElement>(
			'a.action-label.codicon.codicon-dashboard',
			{ role: 'button' },
		));

		// Aktiv-Indikator (linker Akzent-Border). Wird vom
		// ThemingParticipant in `activitybarPart.ts` via
		// `.action-item.checked .active-item-indicator:before` gestylt.
		append(this.itemEl, $<HTMLDivElement>('div.active-item-indicator'));

		// Hover-Widget via IHoverService (Guideline: Tooltips ueber den Service).
		disposables.add(hoverService.setupDelayedHover(this.itemEl, {
			content: keelCockpitStrings.activitybarCockpitTooltip(),
			appearance: { showPointer: true },
		}));

		// Click / Enter / Space loesen den bestehenden Show-Command aus.
		disposables.add(addDisposableListener(this.itemEl, EventType.CLICK, (e: MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			this.runShow();
		}));
		disposables.add(addDisposableListener(this.itemEl, EventType.KEY_DOWN, (e: KeyboardEvent) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				e.stopPropagation();
				this.runShow();
			}
		}));

		// Reaktiver Active-State: beobachtet den aktiven Editor und spiegelt den
		// Cockpit-Editor-Zustand in die Upstream-Konvention `.checked` am
		// `li.action-item` - loest damit automatisch den linken Akzent-Border
		// ueber `activityaction.css` aus.
		disposables.add(this.editorService.onDidActiveEditorChange(() => this.syncActiveState()));
		this.syncActiveState();

		// labelEl wird vom Linter sonst als unused geflaggt.
		void this.labelEl;
	}

	private runShow(): void {
		void this.commandService.executeCommand(KEEL_COCKPIT_SHOW_COMMAND_ID);
	}

	private syncActiveState(): void {
		const active = this.editorService.activeEditor;
		const isCockpitActive = active?.editorId === KEEL_COCKPIT_EDITOR_ID;
		this.itemEl.classList.toggle(KEEL_COCKPIT_ANCHOR_ACTIVE_CLASS, isCockpitActive);
	}

	override dispose(): void {
		super.dispose();
		this.barEl.remove();
	}
}
