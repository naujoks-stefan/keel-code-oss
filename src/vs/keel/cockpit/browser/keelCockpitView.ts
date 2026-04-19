/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { $, append, addDisposableListener, EventType, clearNode, getWindow } from '../../../base/browser/dom.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { KeyCode } from '../../../base/common/keyCodes.js';
import { StandardKeyboardEvent } from '../../../base/browser/keyboardEvent.js';
import {
	IKeelCockpitTask,
	KeelCockpitTaskPhase,
	KEEL_COCKPIT_MAX_ACTIVE_TASKS,
} from '../common/keelCockpit.js';
import { IKeelCockpitService } from './keelCockpitService.js';
import { IKeelProjectService } from './keelProjectService.js';
import { IKeelProjectLeadService, IProjectLeadStatus } from './keelProjectLeadService.js';
import { keelCockpitStrings } from './strings/keelCockpitStrings.js';

/**
 * Callbacks, die die View an den EditorPane weiterreicht.
 */
export interface IKeelCockpitViewHandlers {
	/** Wird aufgerufen, wenn der User einen neuen Auftrag startet. */
	readonly onNewTask: (prompt: string) => void;
	/** Informations-Toast an den NotificationService delegieren. */
	readonly onNotify: (message: string) => void;
	/** Warn-Toast an den NotificationService delegieren (Validierungs-Feedback). */
	readonly onWarn: (message: string) => void;
	/** Warn-Prompt mit Ja/Nein-Auswahl an den NotificationService delegieren. */
	readonly onConfirm: (
		message: string,
		yesLabel: string,
		noLabel: string,
		onYes: () => void,
		onNo?: () => void,
	) => void;
}

/**
 * Codicon-IDs pro Phase/State. Kein magischer String in der View - alles hier
 * zentralisiert.
 */
const PHASE_CODICON: Record<KeelCockpitTaskPhase, string> = {
	1: 'pulse',
	2: 'lightbulb',
	3: 'checklist',
	4: 'settings-gear',
};

/**
 * Stagger zwischen mehreren gleichzeitig gemounteten TaskCards in ms.
 * Marketing-Must: Sub-Karten fahren mit 80-120ms Versatz heraus.
 */
const DELEGATION_STAGGER_MS = 100;

/**
 * DOM-Rendering-Logik fuer das Keel-Cockpit.
 *
 * Welle-9-Layout:
 * - Projekt-Header (Projekt-Name + "Neuer Auftrag"-Button)
 * - Projektleiter-Card (prominent, breit, mit Aggregat-Status)
 * - Sub-Task-Zone mit Projektleiter-Chip + Divider + eingerueckten TaskCards
 *
 * Die Klasse abonniert `IKeelCockpitService` und `IKeelProjectLeadService`;
 * TaskCards werden komplett re-rendert bei `onTasksChanged`. Neu gemountete
 * Sub-Karten erhalten die Delegations-Animation (translateY + opacity Fade),
 * die `prefers-reduced-motion` respektiert.
 */
export class KeelCockpitView extends Disposable {

	private readonly viewDisposables = this._register(new DisposableStore());

	private container: HTMLElement | undefined;
	private projectHeaderTitle: HTMLElement | undefined;
	private projectHeaderLeft: HTMLElement | undefined;
	private projectChevronButton: HTMLButtonElement | undefined;
	private leadStatusText: HTMLElement | undefined;
	private leadAggregate: HTMLElement | undefined;
	private leadCard: HTMLElement | undefined;
	private queueBadge: HTMLElement | undefined;

	/** Overlay fuer PlanReview und NewTask. Nur eins aktiv gleichzeitig. */
	private activeOverlay: HTMLElement | undefined;
	private activeOverlayDisposables: DisposableStore | undefined;

	/**
	 * Task-IDs, die bereits mindestens einmal mit Animation gemounted wurden.
	 * Re-Renders derselben Task loesen die Delegations-Animation nicht erneut aus.
	 */
	private readonly animatedTaskIds: Set<string> = new Set();

	constructor(
		private readonly parent: HTMLElement,
		private readonly handlers: IKeelCockpitViewHandlers,
		private readonly cockpitService: IKeelCockpitService,
		private readonly projectService: IKeelProjectService,
		private readonly projectLeadService: IKeelProjectLeadService,
	) {
		super();
		this._register(this.cockpitService.onTasksChanged(() => this.rerender()));
		this._register(this.projectLeadService.onStatusChanged(status => this.updateLeadCard(status)));
		this._register(this.projectService.onActiveProjectChanged(project => {
			if (this.projectHeaderTitle) {
				this.projectHeaderTitle.textContent = project.name;
			}
		}));
	}

	/**
	 * Baut die komplette Cockpit-DOM auf. Mehrfach aufrufbar.
	 */
	render(): void {
		this.viewDisposables.clear();
		clearNode(this.parent);
		this.animatedTaskIds.clear();

		this.container = append(this.parent, $<HTMLDivElement>('div.keel-cockpit-container'));

		this.renderProjectHeader(this.container);
		this.renderProjectLeadCard(this.container);
		this.renderBody(this.container);
	}

	focus(): void {
		// Welle 9 Follow-up: Primaerer CTA lebt in der Projektleiter-Card.
		// eslint-disable-next-line no-restricted-syntax -- MVP-DOM-Zugriff fuer Focus
		const cta = this.container?.querySelector<HTMLButtonElement>('.keel-project-lead-new-task-btn');
		cta?.focus();
	}

	override dispose(): void {
		this.closeOverlay();
		super.dispose();
	}

	// --- Rerender ---

	private rerender(): void {
		if (!this.container) {
			return;
		}
		this.renderBody(this.container);
		// Lead-Card wird ueber onStatusChanged aktualisiert, aber defensiv
		// direkt nachziehen, damit Initial-Load konsistent ist.
		this.updateLeadCard(this.projectLeadService.getStatus());
	}

	// --- Projekt-Header ---

	private renderProjectHeader(parent: HTMLElement): void {
		const header = append(parent, $<HTMLElement>('header.keel-project-header', {
			role: 'banner',
		}));

		const left = append(header, $<HTMLDivElement>('div.keel-project-header-left'));
		this.projectHeaderLeft = left;
		append(left, $<HTMLSpanElement>(
			'span.codicon.codicon-folder.keel-project-header-icon',
			{ 'aria-hidden': 'true' },
		));
		const project = this.projectService.getActiveProject();
		this.projectHeaderTitle = append(left, $<HTMLHeadingElement>(
			'h1.keel-project-header-title',
			{},
			project.name,
		));

		// ChevronDown-Button: oeffnet Dropdown mit Rename-Eintrag.
		const chevronBtn = append(left, $<HTMLButtonElement>(
			'button.keel-project-header-chevron',
			{
				type: 'button',
				'aria-label': keelCockpitStrings.projectRenameAriaChevron(),
				'aria-haspopup': 'menu',
				'aria-expanded': 'false',
			},
		));
		append(chevronBtn, $<HTMLSpanElement>(
			'span.codicon.codicon-chevron-down',
			{ 'aria-hidden': 'true' },
		));
		this.projectChevronButton = chevronBtn;
		this.viewDisposables.add(addDisposableListener(chevronBtn, EventType.CLICK, () => {
			this.openProjectMenu(chevronBtn);
		}));

		const right = append(header, $<HTMLDivElement>('div.keel-project-header-right'));

		// QueueIndicator (Welle 8 - bleibt im Header, da er projekt-weit ist).
		this.queueBadge = append(right, $<HTMLDivElement>('div.keel-cockpit-queue-badge', {
			role: 'status',
			title: keelCockpitStrings.queueTooltip(),
			style: 'display: none;',
		}));
		append(this.queueBadge, $<HTMLSpanElement>(
			'span.codicon.codicon-clock.keel-cockpit-queue-icon',
			{ 'aria-hidden': 'true' },
		));
		append(this.queueBadge, $<HTMLSpanElement>('span.keel-cockpit-queue-text'));
	}

	// --- Projekt-Menue + Rename-Inline-Edit ---

	/**
	 * Oeffnet das Projekt-Dropdown. MVP: ein einziger Eintrag "Umbenennen".
	 * Click-ausserhalb und Escape schliessen das Menue.
	 */
	private openProjectMenu(anchor: HTMLButtonElement): void {
		// Falls bereits offen: schliessen (Toggle).
		// eslint-disable-next-line no-restricted-syntax -- DOM-Lookup fuer bereits gerendertes Menue
		const existing = this.container?.querySelector('.keel-project-header-menu');
		if (existing) {
			existing.remove();
			anchor.setAttribute('aria-expanded', 'false');
			return;
		}
		anchor.setAttribute('aria-expanded', 'true');

		const menu = append(this.projectHeaderLeft!, $<HTMLDivElement>(
			'div.keel-project-header-menu',
			{ role: 'menu' },
		));
		const renameItem = append(menu, $<HTMLButtonElement>(
			'button.keel-project-header-menu-item',
			{
				type: 'button',
				role: 'menuitem',
			},
			keelCockpitStrings.projectRenameMenuItem(),
		));

		const closeMenu = () => {
			menu.remove();
			anchor.setAttribute('aria-expanded', 'false');
		};

		const disposables = new DisposableStore();
		this.viewDisposables.add(disposables);

		disposables.add(addDisposableListener(renameItem, EventType.CLICK, () => {
			closeMenu();
			this.startInlineRename();
		}));

		// Click ausserhalb schliesst das Menue. Wir verwenden das Window des
		// aktuellen Host-Elements (multi-window-safe).
		const hostWindow = getWindow(anchor);
		disposables.add(addDisposableListener(hostWindow, EventType.MOUSE_DOWN, (e: MouseEvent) => {
			const target = e.target as Node | null;
			if (target && !menu.contains(target) && target !== anchor && !anchor.contains(target)) {
				closeMenu();
				disposables.dispose();
			}
		}));

		// Esc schliesst Menue und gibt Fokus an Chevron zurueck.
		disposables.add(addDisposableListener(menu, EventType.KEY_DOWN, (e: KeyboardEvent) => {
			const evt = new StandardKeyboardEvent(e);
			if (evt.keyCode === KeyCode.Escape) {
				evt.preventDefault();
				evt.stopPropagation();
				closeMenu();
				anchor.focus();
				disposables.dispose();
			}
		}));

		queueMicrotask(() => renameItem.focus());
	}

	/**
	 * Startet den Inline-Edit-Modus: der H1-Titel wird durch ein Input-Feld
	 * ersetzt. Enter speichert ueber `handleProjectRename`, Esc verwirft.
	 * Nach Abschluss (save oder cancel) kehrt der Fokus auf den Chevron-Button
	 * zurueck.
	 */
	private startInlineRename(): void {
		if (!this.projectHeaderTitle || !this.projectHeaderLeft) {
			return;
		}
		const project = this.projectService.getActiveProject();
		const currentName = project.name;

		const input = $<HTMLInputElement>('input.keel-project-header-rename-input', {
			type: 'text',
			value: currentName,
			maxlength: '40',
			placeholder: keelCockpitStrings.projectRenamePlaceholder(),
			'aria-label': keelCockpitStrings.projectRenameMenuItem(),
		});
		this.projectHeaderTitle.replaceWith(input);

		const disposables = new DisposableStore();
		this.viewDisposables.add(disposables);

		let finished = false;
		const restoreTitle = (name: string) => {
			const newTitle = $<HTMLHeadingElement>(
				'h1.keel-project-header-title',
				{},
				name,
			);
			input.replaceWith(newTitle);
			this.projectHeaderTitle = newTitle;
			this.projectChevronButton?.focus();
			disposables.dispose();
		};

		const commit = () => {
			if (finished) {
				return;
			}
			const raw = input.value;
			const trimmed = raw.trim();
			if (trimmed.length === 0) {
				// Validation-Fail: Warn-Toast, Fokus bleibt im Input.
				this.handlers.onWarn(keelCockpitStrings.projectRenameInvalid());
				input.focus();
				input.select();
				return;
			}
			finished = true;
			void this.handleProjectRename(project.id, trimmed);
			// Optimistisches Rendering: Titel sofort auf den neuen Namen setzen.
			// Das onActiveProjectChanged-Event aktualisiert die Referenz nochmal
			// nach erfolgreichem Persist.
			restoreTitle(trimmed);
		};

		const cancel = () => {
			if (finished) {
				return;
			}
			finished = true;
			restoreTitle(currentName);
		};

		disposables.add(addDisposableListener(input, EventType.KEY_DOWN, (e: KeyboardEvent) => {
			const evt = new StandardKeyboardEvent(e);
			if (evt.keyCode === KeyCode.Enter) {
				evt.preventDefault();
				evt.stopPropagation();
				commit();
			} else if (evt.keyCode === KeyCode.Escape) {
				evt.preventDefault();
				evt.stopPropagation();
				cancel();
			}
		}));
		disposables.add(addDisposableListener(input, EventType.BLUR, () => {
			// Blur ohne Enter verwirft, konsistent mit Dropdown-Schliessen.
			cancel();
		}));

		queueMicrotask(() => {
			input.focus();
			input.select();
		});
	}

	/**
	 * Validiert und persistiert den neuen Projekt-Namen ueber den Service.
	 * Der Service trimmt + kappt intern nochmals; diese Methode dient primaer
	 * als Hook fuer zukuenftige Policies (Telemetry, Audit).
	 */
	private async handleProjectRename(projectId: string, newName: string): Promise<void> {
		const trimmed = newName.trim();
		if (trimmed.length === 0) {
			this.handlers.onWarn(keelCockpitStrings.projectRenameInvalid());
			return;
		}
		await this.projectService.renameProject(projectId, trimmed);
	}

	// --- Projektleiter-Card ---

	private renderProjectLeadCard(parent: HTMLElement): void {
		const status = this.projectLeadService.getStatus();

		const card = append(parent, $<HTMLDivElement>(
			`div.keel-project-lead-card.keel-project-lead-card-${status.state}`,
			{
				role: 'region',
				'aria-label': keelCockpitStrings.projectLeadAria(
					this.leadStatusTextFor(status),
				),
			},
		));
		this.leadCard = card;

		const iconWrap = append(card, $<HTMLDivElement>('div.keel-project-lead-icon-wrap'));
		append(iconWrap, $<HTMLSpanElement>(
			'span.codicon.codicon-organization.keel-project-lead-icon',
			{ 'aria-hidden': 'true' },
		));

		const mid = append(card, $<HTMLDivElement>('div.keel-project-lead-mid'));
		append(mid, $<HTMLDivElement>(
			'div.keel-project-lead-title',
			{},
			keelCockpitStrings.projectLeadTitle(),
		));
		this.leadStatusText = append(mid, $<HTMLDivElement>(
			'div.keel-project-lead-status',
			{ 'aria-live': 'polite' },
			this.leadStatusTextFor(status),
		));

		this.leadAggregate = append(card, $<HTMLDivElement>('div.keel-project-lead-aggregate'));
		this.renderAggregate(status);

		// Primaerer CTA wandert aus dem Projekt-Header in die Projektleiter-Card
		// (Welle 9 Follow-up): der Projektleiter nimmt den Auftrag entgegen.
		const actions = append(card, $<HTMLDivElement>('div.keel-project-lead-actions'));
		const newTaskBtn = append(actions, $<HTMLButtonElement>(
			'button.keel-cockpit-new-task-btn.keel-project-lead-new-task-btn',
			{
				type: 'button',
				'aria-label': keelCockpitStrings.projectHeaderNewTaskAria(),
			},
		));
		append(newTaskBtn, $<HTMLSpanElement>(
			'span.codicon.codicon-add.keel-cockpit-new-task-icon',
			{ 'aria-hidden': 'true' },
		));
		append(newTaskBtn, $<HTMLSpanElement>(
			'span.keel-cockpit-new-task-label',
			{},
			keelCockpitStrings.projectHeaderNewTask(),
		));
		this.viewDisposables.add(addDisposableListener(newTaskBtn, EventType.CLICK, () => {
			this.openNewTaskSheet();
		}));
	}

	private updateLeadCard(status: IProjectLeadStatus): void {
		if (!this.leadCard || !this.leadStatusText || !this.leadAggregate) {
			return;
		}
		this.leadCard.classList.remove(
			'keel-project-lead-card-idle',
			'keel-project-lead-card-active',
			'keel-project-lead-card-waiting',
		);
		this.leadCard.classList.add(`keel-project-lead-card-${status.state}`);
		const statusText = this.leadStatusTextFor(status);
		this.leadStatusText.textContent = statusText;
		this.leadCard.setAttribute(
			'aria-label',
			keelCockpitStrings.projectLeadAria(statusText),
		);
		this.renderAggregate(status);
	}

	private renderAggregate(status: IProjectLeadStatus): void {
		if (!this.leadAggregate) {
			return;
		}
		clearNode(this.leadAggregate);

		if (status.state === 'idle') {
			return;
		}

		if (status.activeSubTaskCount > 0) {
			const activeChip = append(this.leadAggregate, $<HTMLDivElement>(
				'div.keel-project-lead-aggregate-chip.keel-project-lead-aggregate-active',
			));
			append(activeChip, $<HTMLSpanElement>(
				'span.codicon.codicon-pulse',
				{ 'aria-hidden': 'true' },
			));
			append(activeChip, $<HTMLSpanElement>(
				'span',
				{},
				keelCockpitStrings.projectLeadAggregateActive(status.activeSubTaskCount),
			));
		}

		if (status.waitingSubTaskCount > 0) {
			const waitingChip = append(this.leadAggregate, $<HTMLDivElement>(
				'div.keel-project-lead-aggregate-chip.keel-project-lead-aggregate-waiting',
			));
			append(waitingChip, $<HTMLSpanElement>(
				'span.codicon.codicon-bell',
				{ 'aria-hidden': 'true' },
			));
			append(waitingChip, $<HTMLSpanElement>(
				'span',
				{},
				keelCockpitStrings.projectLeadAggregateWaiting(status.waitingSubTaskCount),
			));
		}
	}

	private leadStatusTextFor(status: IProjectLeadStatus): string {
		if (status.state === 'idle') {
			return keelCockpitStrings.projectLeadStatusIdle();
		}
		if (status.state === 'waiting') {
			if (status.waitingSubTaskCount <= 1) {
				return keelCockpitStrings.projectLeadStatusWaitingOne();
			}
			return keelCockpitStrings.projectLeadStatusWaitingMany(status.waitingSubTaskCount);
		}
		// active
		if (status.activeSubTaskCount <= 1) {
			return keelCockpitStrings.projectLeadStatusActiveOne();
		}
		return keelCockpitStrings.projectLeadStatusActiveMany(status.activeSubTaskCount);
	}

	// --- Body ---

	/**
	 * Rendert den Body-Bereich. Bei jedem `rerender()` wird dieser Teil
	 * komplett neu aufgebaut; der Header bleibt stehen.
	 */
	private renderBody(parent: HTMLElement): void {
		// Alten Body entfernen.
		// eslint-disable-next-line no-restricted-syntax -- DOM-Cleanup vor Neu-Aufbau
		const oldBody = parent.querySelector('.keel-cockpit-body');
		oldBody?.remove();

		const body = append(parent, $<HTMLDivElement>('div.keel-cockpit-body'));

		const allTasks = this.cockpitService.getTasks();
		const activeTasks = allTasks.slice(0, KEEL_COCKPIT_MAX_ACTIVE_TASKS);
		const queue = allTasks.slice(KEEL_COCKPIT_MAX_ACTIVE_TASKS);

		this.updateQueueBadge(queue.length);

		// Sub-Task-Zone (Chip + Divider + TaskCards oder Empty-State)
		this.renderSubTaskZone(body, activeTasks);
	}

	private updateQueueBadge(count: number): void {
		if (!this.queueBadge) {
			return;
		}
		if (count === 0) {
			this.queueBadge.style.display = 'none';
			return;
		}
		this.queueBadge.style.display = '';
		// eslint-disable-next-line no-restricted-syntax -- DOM-Zugriff fuer Text-Update
		const textEl = this.queueBadge.querySelector<HTMLElement>('.keel-cockpit-queue-text');
		if (textEl) {
			textEl.textContent = keelCockpitStrings.queueIndicator(count);
		}
	}

	// --- Sub-Task-Zone ---

	private renderSubTaskZone(
		parent: HTMLElement,
		tasks: ReadonlyArray<IKeelCockpitTask>,
	): void {
		const zone = append(parent, $<HTMLDivElement>('div.keel-subtask-zone'));

		// Zonen-Label: Projektleiter-Chip + Divider.
		const labelRow = append(zone, $<HTMLDivElement>('div.keel-subtask-zone-label-row'));
		const chip = append(labelRow, $<HTMLDivElement>('div.keel-subtask-zone-chip', {
			'aria-label': keelCockpitStrings.subTaskZoneChipAria(),
		}));
		append(chip, $<HTMLSpanElement>(
			'span.codicon.codicon-organization.keel-subtask-zone-chip-icon',
			{ 'aria-hidden': 'true' },
		));
		append(chip, $<HTMLSpanElement>(
			'span.keel-subtask-zone-chip-label',
			{},
			keelCockpitStrings.subTaskZoneChip(),
		));
		append(labelRow, $<HTMLDivElement>('div.keel-subtask-zone-divider', {
			role: 'separator',
			'aria-hidden': 'true',
		}));

		const zoneBody = append(zone, $<HTMLDivElement>('div.keel-subtask-zone-body'));

		if (tasks.length === 0) {
			this.renderEmpty(zoneBody);
			return;
		}
		this.renderGrid(zoneBody, tasks);
	}

	// --- EmptyCockpit ---

	private renderEmpty(parent: HTMLElement): void {
		const block = append(parent, $<HTMLDivElement>('div.keel-cockpit-empty'));
		append(block, $<HTMLSpanElement>(
			'span.codicon.codicon-inbox.keel-cockpit-empty-icon',
			{ 'aria-hidden': 'true' },
		));
		append(block, $<HTMLHeadingElement>(
			'h2.keel-cockpit-empty-title',
			{},
			keelCockpitStrings.emptyTitle(),
		));
		append(block, $<HTMLParagraphElement>(
			'p.keel-cockpit-empty-subtitle',
			{},
			keelCockpitStrings.emptySubtitle(),
		));
		// Welle 9: Kein Duplikat-CTA hier. Der "Neuer Auftrag"-Button lebt im
		// Projekt-Header. Der Empty-State ist rein informativ.
	}

	// --- Grid ---

	private renderGrid(parent: HTMLElement, tasks: ReadonlyArray<IKeelCockpitTask>): void {
		const grid = append(parent, $<HTMLDivElement>(
			`div.keel-cockpit-grid.keel-cockpit-grid-${tasks.length}`,
		));

		// Sammle neu gemountete Karten fuer Stagger-Animation.
		const newlyMounted: HTMLElement[] = [];
		for (const task of tasks) {
			const cardEl = this.renderTaskCard(grid, task);
			if (!this.animatedTaskIds.has(task.id)) {
				newlyMounted.push(cardEl);
				this.animatedTaskIds.add(task.id);
			}
		}

		// Delegations-Animation mit Stagger.
		this.applyDelegationAnimation(newlyMounted);
	}

	/**
	 * Spielt die Delegations-Animation auf frisch gemounteten TaskCards ab.
	 * Marketing-Must: Sub-Karten fahren aus der Projektleiter-Karte heraus
	 * (translateY + Fade), 80-120ms Stagger.
	 *
	 * `prefers-reduced-motion` wird ueber CSS gehandhabt - dort ist die
	 * Transition auf `none` gesetzt, die Karten erscheinen sofort voll sichtbar.
	 */
	private applyDelegationAnimation(cards: ReadonlyArray<HTMLElement>): void {
		for (let i = 0; i < cards.length; i++) {
			const card = cards[i];
			card.classList.add('keel-cockpit-card-delegating');
			const delay = i * DELEGATION_STAGGER_MS;
			// Stagger via style.transitionDelay anstelle separater CSS-Klassen.
			card.style.transitionDelay = `${delay}ms`;
			// Wichtig: force layout, damit der Browser den Start-State tatsaechlich
			// rendert, bevor wir die `active`-Klasse setzen.
			void card.offsetWidth;
			card.classList.add('keel-cockpit-card-delegating-active');
		}
	}

	// --- TaskCard ---

	private renderTaskCard(parent: HTMLElement, task: IKeelCockpitTask): HTMLElement {
		const stateClass = `keel-cockpit-card-${task.status}`;
		const card = append(parent, $<HTMLDivElement>(
			`div.keel-cockpit-card.${stateClass}`,
			{
				role: 'region',
				'aria-label': `${task.title} - ${this.statusLabel(task)}`,
				'data-task-id': task.id,
			},
		));

		this.renderCardHeader(card, task);
		this.renderCardBody(card, task);
		this.renderCardFooter(card, task);
		return card;
	}

	private renderCardHeader(parent: HTMLElement, task: IKeelCockpitTask): void {
		const header = append(parent, $<HTMLDivElement>('div.keel-cockpit-card-header'));

		// Phase- bzw. State-Icon links
		const iconId = this.iconForTask(task);
		const iconEl = append(header, $<HTMLSpanElement>(
			`span.codicon.codicon-${iconId}.keel-cockpit-card-icon`,
			{ 'aria-hidden': 'true' },
		));
		// Zahnrad in Phase 4 rotiert (CSS respektiert reduced-motion).
		if (task.status === 'running' && task.phase === 4) {
			iconEl.classList.add('keel-cockpit-card-icon-spinning');
		}
		// Phase-1-Icon pulsiert (CSS respektiert reduced-motion).
		if (task.status === 'running' && task.phase === 1) {
			iconEl.classList.add('keel-cockpit-card-icon-pulsing');
		}

		append(header, $<HTMLHeadingElement>(
			'h3.keel-cockpit-card-title',
			{},
			task.title,
		));

		const actions = append(header, $<HTMLDivElement>('div.keel-cockpit-card-header-actions'));

		// Menue-Button (Ellipsis)
		const menuBtn = append(actions, $<HTMLButtonElement>(
			'button.keel-cockpit-card-iconbtn',
			{
				type: 'button',
				'aria-label': keelCockpitStrings.cardMenuAriaLabel(task.title),
			},
		));
		append(menuBtn, $<HTMLSpanElement>(
			'span.codicon.codicon-ellipsis',
			{ 'aria-hidden': 'true' },
		));
		this.viewDisposables.add(addDisposableListener(menuBtn, EventType.CLICK, () => {
			// Stub: echtes Menue kommt in Welle B - fuer MVP reicht ein Hinweis.
			this.handlers.onNotify(
				`${keelCockpitStrings.cardMenuAudit()} / ${keelCockpitStrings.cardMenuArchive()}`,
			);
		}));

		// Close-Button (X) - nur aktiv wenn Karte abgeschlossen/fehlgeschlagen/pausiert
		const canClose =
			task.status === 'completed' || task.status === 'failed' || task.status === 'paused';
		const closeBtn = append(actions, $<HTMLButtonElement>(
			'button.keel-cockpit-card-iconbtn',
			{
				type: 'button',
				'aria-label': keelCockpitStrings.cardCloseAriaLabel(task.title),
			},
		));
		if (!canClose) {
			closeBtn.setAttribute('disabled', 'true');
			closeBtn.setAttribute('title', keelCockpitStrings.cardCloseDisabledTooltip());
		}
		append(closeBtn, $<HTMLSpanElement>(
			'span.codicon.codicon-close',
			{ 'aria-hidden': 'true' },
		));
	}

	private renderCardBody(parent: HTMLElement, task: IKeelCockpitTask): void {
		const body = append(parent, $<HTMLDivElement>('div.keel-cockpit-card-body'));

		// Phase-Counter + Phase-Label (bei running/waiting-for-review)
		if (
			(task.status === 'running' || task.status === 'waiting-for-review') &&
			task.phase !== undefined
		) {
			append(body, $<HTMLDivElement>(
				'div.keel-cockpit-card-phase-counter',
				{},
				keelCockpitStrings.cardPhaseCounter(task.phase),
			));
			append(body, $<HTMLDivElement>(
				'div.keel-cockpit-card-phase-label',
				{},
				this.phaseLabel(task.phase),
			));
		} else if (task.status === 'completed') {
			append(body, $<HTMLHeadingElement>(
				'h2.keel-cockpit-card-completed-title',
				{},
				keelCockpitStrings.cardCompletedTitle(),
			));
		} else if (task.status === 'failed') {
			append(body, $<HTMLDivElement>(
				'div.keel-cockpit-card-failed-title',
				{},
				keelCockpitStrings.cardFailedTitle(),
			));
		} else if (task.status === 'paused') {
			append(body, $<HTMLDivElement>(
				'div.keel-cockpit-card-paused-title',
				{},
				keelCockpitStrings.cardPausedTitle(),
			));
		}

		// Progress-Bar nur wenn running
		if (task.status === 'running') {
			const progressWrap = append(body, $<HTMLDivElement>('div.keel-cockpit-card-progress'));
			append(progressWrap, $<HTMLDivElement>('div.keel-cockpit-card-progress-bar'));
		}

		// Live-Output / Phase-Hint
		if (task.status === 'running') {
			const hint = this.phaseHint(task.phase);
			if (hint) {
				append(body, $<HTMLDivElement>(
					'div.keel-cockpit-card-hint',
					{},
					hint,
				));
			}
			if (task.currentOutput) {
				append(body, $<HTMLPreElement>(
					'pre.keel-cockpit-card-output',
					{},
					task.currentOutput,
				));
			}
			if (task.progressText) {
				append(body, $<HTMLDivElement>(
					'div.keel-cockpit-card-progress-text',
					{},
					task.progressText,
				));
			}
		}

		// Phase-3 CTA
		if (task.status === 'waiting-for-review') {
			append(body, $<HTMLDivElement>(
				'div.keel-cockpit-card-hint',
				{},
				keelCockpitStrings.cardPhase3Hint(),
			));
			const reviewBtn = append(body, $<HTMLButtonElement>(
				'button.keel-cockpit-card-cta.keel-cockpit-card-review-btn',
				{ type: 'button' },
			));
			append(reviewBtn, $<HTMLSpanElement>(
				'span.codicon.codicon-checklist',
				{ 'aria-hidden': 'true' },
			));
			append(reviewBtn, $<HTMLSpanElement>(
				'span',
				{},
				keelCockpitStrings.cardButtonReview(),
			));
			this.viewDisposables.add(addDisposableListener(reviewBtn, EventType.CLICK, () => {
				this.openPlanReviewSheet(task);
			}));
		}

		// Completed-State: Summary + Artefakt
		if (task.status === 'completed') {
			if (task.resultSummary) {
				append(body, $<HTMLParagraphElement>(
					'p.keel-cockpit-card-summary',
					{},
					task.resultSummary,
				));
			}
			if (task.resultArtifact) {
				const artifact = append(body, $<HTMLDivElement>(
					'div.keel-cockpit-card-artifact',
				));
				append(artifact, $<HTMLSpanElement>(
					'span.codicon.codicon-file-text.keel-cockpit-card-artifact-icon',
					{ 'aria-hidden': 'true' },
				));
				append(artifact, $<HTMLSpanElement>(
					'span.keel-cockpit-card-artifact-name',
					{},
					task.resultArtifact.name,
				));
				append(artifact, $<HTMLSpanElement>(
					'span.keel-cockpit-card-artifact-size',
					{},
					this.formatBytes(task.resultArtifact.sizeBytes),
				));
			}
		}

		// Failed-State: Hint
		if (task.status === 'failed') {
			append(body, $<HTMLParagraphElement>(
				'p.keel-cockpit-card-hint',
				{},
				keelCockpitStrings.cardFailedHint(),
			));
		}
	}

	private renderCardFooter(parent: HTMLElement, task: IKeelCockpitTask): void {
		const footer = append(parent, $<HTMLDivElement>('div.keel-cockpit-card-footer'));

		// Zeit-Info links
		const time = this.formatTime(task.createdAt);
		append(footer, $<HTMLSpanElement>(
			'span.keel-cockpit-card-time',
			{},
			keelCockpitStrings.cardStartedAt(time),
		));

		const actions = append(footer, $<HTMLDivElement>('div.keel-cockpit-card-footer-actions'));

		if (task.status === 'running' || task.status === 'waiting-for-review') {
			// Pause
			const pauseBtn = append(actions, $<HTMLButtonElement>(
				'button.keel-cockpit-card-footer-btn',
				{ type: 'button' },
			));
			append(pauseBtn, $<HTMLSpanElement>(
				'span.codicon.codicon-debug-pause',
				{ 'aria-hidden': 'true' },
			));
			append(pauseBtn, $<HTMLSpanElement>(
				'span',
				{},
				keelCockpitStrings.cardButtonPause(),
			));

			// Stop
			const stopBtn = append(actions, $<HTMLButtonElement>(
				'button.keel-cockpit-card-footer-btn.keel-cockpit-card-footer-btn-danger',
				{ type: 'button' },
			));
			append(stopBtn, $<HTMLSpanElement>(
				'span.codicon.codicon-debug-stop',
				{ 'aria-hidden': 'true' },
			));
			append(stopBtn, $<HTMLSpanElement>(
				'span',
				{},
				keelCockpitStrings.cardButtonStop(),
			));
			this.viewDisposables.add(addDisposableListener(stopBtn, EventType.CLICK, () => {
				// MVP: Warn-Prompt mit Ja/Nein - echter Stop-Dispatch folgt in Welle B.
				this.handlers.onConfirm(
					keelCockpitStrings.cardStopConfirm(),
					keelCockpitStrings.cardStopYes(),
					keelCockpitStrings.cardStopNo(),
					() => this.handlers.onNotify(keelCockpitStrings.cardStopComingSoon()),
				);
			}));
			// Pause-Stub: signalisiert, dass der Klick registriert wurde.
			this.viewDisposables.add(addDisposableListener(pauseBtn, EventType.CLICK, () => {
				this.handlers.onNotify(keelCockpitStrings.cardPauseComingSoon());
			}));
		} else if (task.status === 'paused') {
			const resumeBtn = append(actions, $<HTMLButtonElement>(
				'button.keel-cockpit-card-footer-btn.keel-cockpit-card-footer-btn-primary',
				{ type: 'button' },
			));
			append(resumeBtn, $<HTMLSpanElement>(
				'span.codicon.codicon-debug-start',
				{ 'aria-hidden': 'true' },
			));
			append(resumeBtn, $<HTMLSpanElement>(
				'span',
				{},
				keelCockpitStrings.cardButtonResume(),
			));
			this.viewDisposables.add(addDisposableListener(resumeBtn, EventType.CLICK, () => {
				this.handlers.onNotify(keelCockpitStrings.cardResumeComingSoon());
			}));
		} else if (task.status === 'completed') {
			const openBtn = append(actions, $<HTMLButtonElement>(
				'button.keel-cockpit-card-footer-btn.keel-cockpit-card-footer-btn-primary',
				{ type: 'button' },
			));
			append(openBtn, $<HTMLSpanElement>('span', {}, keelCockpitStrings.cardButtonOpen()));
			this.viewDisposables.add(addDisposableListener(openBtn, EventType.CLICK, () => {
				this.handlers.onNotify(keelCockpitStrings.cardOpenComingSoon());
			}));

			const exportBtn = append(actions, $<HTMLButtonElement>(
				'button.keel-cockpit-card-footer-btn',
				{ type: 'button' },
			));
			append(exportBtn, $<HTMLSpanElement>(
				'span.codicon.codicon-archive',
				{ 'aria-hidden': 'true' },
			));
			append(exportBtn, $<HTMLSpanElement>(
				'span',
				{},
				keelCockpitStrings.cardButtonExport(),
			));
			this.viewDisposables.add(addDisposableListener(exportBtn, EventType.CLICK, () => {
				this.handlers.onNotify(keelCockpitStrings.cardExportComingSoon());
			}));
		} else if (task.status === 'failed') {
			const retryBtn = append(actions, $<HTMLButtonElement>(
				'button.keel-cockpit-card-footer-btn.keel-cockpit-card-footer-btn-primary',
				{ type: 'button' },
			));
			append(retryBtn, $<HTMLSpanElement>(
				'span.codicon.codicon-history',
				{ 'aria-hidden': 'true' },
			));
			append(retryBtn, $<HTMLSpanElement>(
				'span',
				{},
				keelCockpitStrings.cardButtonRetry(),
			));
			this.viewDisposables.add(addDisposableListener(retryBtn, EventType.CLICK, () => {
				this.handlers.onNotify(keelCockpitStrings.cardRetryComingSoon());
			}));

			// Sekundaerer Button: Details ansehen (Stub - echtes Error-Modal folgt in Welle B).
			const detailsBtn = append(actions, $<HTMLButtonElement>(
				'button.keel-cockpit-card-footer-btn',
				{ type: 'button' },
			));
			append(detailsBtn, $<HTMLSpanElement>(
				'span.codicon.codicon-info',
				{ 'aria-hidden': 'true' },
			));
			append(detailsBtn, $<HTMLSpanElement>(
				'span',
				{},
				keelCockpitStrings.cardFailedDetailsLabel(),
			));
			this.viewDisposables.add(addDisposableListener(detailsBtn, EventType.CLICK, () => {
				this.handlers.onNotify(keelCockpitStrings.cardFailedDetailsComingSoon());
			}));
		}
	}

	// --- NewTaskSheet ---

	private openNewTaskSheet(): void {
		this.closeOverlay();

		const { overlay, sheet, disposables } = this.buildOverlay('new-task');

		const titleEl = append(sheet, $<HTMLLabelElement>(
			'label.keel-cockpit-sheet-label',
			{ for: 'keel-cockpit-new-task-input' },
			keelCockpitStrings.headerNewTask(),
		));
		// Doppel-Referenz vermeiden: label verbunden via `for`.
		void titleEl;

		const textarea = append(sheet, $<HTMLTextAreaElement>('textarea.keel-cockpit-sheet-textarea', {
			id: 'keel-cockpit-new-task-input',
			placeholder: keelCockpitStrings.newTaskPlaceholder(),
			rows: '3',
		}));

		const btnRow = append(sheet, $<HTMLDivElement>('div.keel-cockpit-sheet-button-row'));

		const cancelBtn = append(btnRow, $<HTMLButtonElement>(
			'button.keel-cockpit-btn.keel-cockpit-btn-tertiary',
			{ type: 'button' },
			keelCockpitStrings.newTaskCancel(),
		));
		const submitBtn = append(btnRow, $<HTMLButtonElement>(
			'button.keel-cockpit-btn.keel-cockpit-btn-primary',
			{ type: 'button' },
			keelCockpitStrings.newTaskSubmit(),
		));

		const submit = () => {
			const value = textarea.value.trim();
			if (value.length === 0) {
				textarea.focus();
				return;
			}
			this.handlers.onNewTask(value);
			this.closeOverlay();
		};

		disposables.add(addDisposableListener(cancelBtn, EventType.CLICK, () => this.closeOverlay()));
		disposables.add(addDisposableListener(submitBtn, EventType.CLICK, () => submit()));
		disposables.add(addDisposableListener(textarea, EventType.KEY_DOWN, (e: KeyboardEvent) => {
			const evt = new StandardKeyboardEvent(e);
			if (evt.keyCode === KeyCode.Enter && !evt.shiftKey) {
				evt.preventDefault();
				evt.stopPropagation();
				submit();
			} else if (evt.keyCode === KeyCode.Escape) {
				evt.preventDefault();
				evt.stopPropagation();
				this.closeOverlay();
			}
		}));

		// Fokus auf Textarea
		queueMicrotask(() => textarea.focus());

		// Overlay-Klick schliesst (ausser Sheet-Klick)
		disposables.add(addDisposableListener(overlay, EventType.CLICK, (e: MouseEvent) => {
			if (e.target === overlay) {
				this.closeOverlay();
			}
		}));
	}

	// --- PlanReviewSheet ---

	private openPlanReviewSheet(task: IKeelCockpitTask): void {
		this.closeOverlay();

		const { overlay, sheet, disposables } = this.buildOverlay('review', /*dialog*/ true);

		const titleId = 'keel-cockpit-review-title';
		sheet.setAttribute('aria-labelledby', titleId);

		// X-Close oben rechts
		const closeBtn = append(sheet, $<HTMLButtonElement>(
			'button.keel-cockpit-sheet-close',
			{
				type: 'button',
				'aria-label': keelCockpitStrings.reviewCloseAriaLabel(),
			},
		));
		append(closeBtn, $<HTMLSpanElement>(
			'span.codicon.codicon-close',
			{ 'aria-hidden': 'true' },
		));
		disposables.add(addDisposableListener(closeBtn, EventType.CLICK, () => this.closeOverlay()));

		// Titel
		append(sheet, $<HTMLHeadingElement>(
			'h2.keel-cockpit-review-title',
			{ id: titleId },
			keelCockpitStrings.reviewSheetTitle(task.title),
		));

		// Demo-Plan-Daten (MVP: hardcoded - echter Plan kommt in Welle B via Service).
		// allow-any-unicode-next-line
		const approach = 'Ich pruefe das Angebot gegen eure Standard-Konditionen und markiere Abweichungen.';
		const steps = [
			'Angebot einlesen (PDF oder Text)',
			// allow-any-unicode-next-line
			'Preis-Posten gegen eure Preisliste abgleichen',
			// allow-any-unicode-next-line
			'Liefer- und Zahlungskonditionen pruefen',
			'Zusammenfassung mit Abweichungen schreiben',
		];
		// allow-any-unicode-next-line
		const deliverable = 'Eine Datei "Angebotspruefung.md" mit Zusammenfassung, Abweichungs-Tabelle und Handlungsempfehlung.';
		const hints = [
			// allow-any-unicode-next-line
			'Wenn die Preisliste unvollstaendig ist, frage ich dich nach.',
		];

		// Ansatz
		this.renderReviewSection(sheet, keelCockpitStrings.reviewSectionApproach(), approach);

		// Schritte
		const stepsBlock = append(sheet, $<HTMLDivElement>('div.keel-cockpit-review-section'));
		append(stepsBlock, $<HTMLDivElement>(
			'div.keel-cockpit-review-section-label',
			{},
			keelCockpitStrings.reviewSectionSteps(),
		));
		const ol = append(stepsBlock, $<HTMLOListElement>('ol.keel-cockpit-review-steps'));
		for (const step of steps) {
			append(ol, $<HTMLLIElement>('li', {}, step));
		}

		// Deliverable
		this.renderReviewSection(
			sheet,
			keelCockpitStrings.reviewSectionDeliverable(),
			deliverable,
		);

		// Hints (optional)
		if (hints.length > 0) {
			const hintsBlock = append(sheet, $<HTMLDivElement>('div.keel-cockpit-review-section'));
			append(hintsBlock, $<HTMLDivElement>(
				'div.keel-cockpit-review-section-label',
				{},
				keelCockpitStrings.reviewSectionHints(),
			));
			const ul = append(hintsBlock, $<HTMLUListElement>('ul.keel-cockpit-review-hints'));
			for (const hint of hints) {
				append(ul, $<HTMLLIElement>('li', {}, hint));
			}
		}

		// Divider
		append(sheet, $<HTMLDivElement>('div.keel-cockpit-review-divider', {
			role: 'separator',
			'aria-hidden': 'true',
		}));

		// Button-Reihe
		const btnRow = append(sheet, $<HTMLDivElement>('div.keel-cockpit-sheet-button-row'));

		const approveBtn = append(btnRow, $<HTMLButtonElement>(
			'button.keel-cockpit-btn.keel-cockpit-btn-primary',
			{ type: 'button' },
			keelCockpitStrings.reviewButtonApprove(),
		));
		const changesBtn = append(btnRow, $<HTMLButtonElement>(
			'button.keel-cockpit-btn.keel-cockpit-btn-secondary',
			{ type: 'button' },
			keelCockpitStrings.reviewButtonChanges(),
		));
		const cancelBtn = append(btnRow, $<HTMLButtonElement>(
			'button.keel-cockpit-btn.keel-cockpit-btn-danger-tertiary',
			{ type: 'button' },
			keelCockpitStrings.reviewButtonCancel(),
		));

		disposables.add(addDisposableListener(approveBtn, EventType.CLICK, () => {
			this.handlers.onNotify(keelCockpitStrings.cardButtonReview());
			this.closeOverlay();
		}));

		disposables.add(addDisposableListener(changesBtn, EventType.CLICK, () => {
			// Button-Reihe durch Textarea ersetzen (inline revision flow)
			btnRow.remove();
			const revBlock = append(sheet, $<HTMLDivElement>('div.keel-cockpit-review-revision'));
			const ta = append(revBlock, $<HTMLTextAreaElement>('textarea.keel-cockpit-sheet-textarea', {
				placeholder: keelCockpitStrings.reviewChangesPlaceholder(),
				rows: '4',
			}));
			const row = append(revBlock, $<HTMLDivElement>('div.keel-cockpit-sheet-button-row'));
			const backBtn = append(row, $<HTMLButtonElement>(
				'button.keel-cockpit-btn.keel-cockpit-btn-tertiary',
				{ type: 'button' },
				keelCockpitStrings.reviewChangesBack(),
			));
			const sendBtn = append(row, $<HTMLButtonElement>(
				'button.keel-cockpit-btn.keel-cockpit-btn-primary',
				{ type: 'button' },
				keelCockpitStrings.reviewChangesSubmit(),
			));
			disposables.add(addDisposableListener(backBtn, EventType.CLICK, () => this.closeOverlay()));
			disposables.add(addDisposableListener(sendBtn, EventType.CLICK, () => {
				void ta.value;
				this.closeOverlay();
			}));
			queueMicrotask(() => ta.focus());
		}));

		disposables.add(addDisposableListener(cancelBtn, EventType.CLICK, () => {
			this.closeOverlay();
		}));

		// Focus-Trap-Basis: initialer Fokus auf Approve-Button
		queueMicrotask(() => approveBtn.focus());

		// Esc schliesst
		disposables.add(addDisposableListener(overlay, EventType.KEY_DOWN, (e: KeyboardEvent) => {
			const evt = new StandardKeyboardEvent(e);
			if (evt.keyCode === KeyCode.Escape) {
				evt.preventDefault();
				evt.stopPropagation();
				this.closeOverlay();
			}
		}));
	}

	private renderReviewSection(parent: HTMLElement, label: string, body: string): void {
		const block = append(parent, $<HTMLDivElement>('div.keel-cockpit-review-section'));
		append(block, $<HTMLDivElement>(
			'div.keel-cockpit-review-section-label',
			{},
			label,
		));
		append(block, $<HTMLParagraphElement>(
			'p.keel-cockpit-review-section-body',
			{},
			body,
		));
	}

	// --- Overlay-Infrastruktur ---

	private buildOverlay(
		kind: 'review' | 'new-task',
		isDialog = false,
	): { overlay: HTMLElement; sheet: HTMLElement; disposables: DisposableStore } {
		const overlay = append(this.parent, $<HTMLDivElement>(
			`div.keel-cockpit-overlay.keel-cockpit-overlay-${kind}`,
		));
		const sheet = append(overlay, $<HTMLDivElement>(
			`div.keel-cockpit-sheet.keel-cockpit-sheet-${kind}`,
			{
				role: isDialog ? 'dialog' : 'group',
				'aria-modal': isDialog ? 'true' : 'false',
			},
		));
		const disposables = new DisposableStore();
		this.activeOverlay = overlay;
		this.activeOverlayDisposables = disposables;
		return { overlay, sheet, disposables };
	}

	private closeOverlay(): void {
		if (this.activeOverlayDisposables) {
			this.activeOverlayDisposables.dispose();
			this.activeOverlayDisposables = undefined;
		}
		if (this.activeOverlay) {
			this.activeOverlay.remove();
			this.activeOverlay = undefined;
		}
	}

	// --- Helpers ---

	private iconForTask(task: IKeelCockpitTask): string {
		if (task.status === 'completed') {
			return 'sparkle';
		}
		if (task.status === 'failed') {
			return 'error';
		}
		if (task.status === 'paused') {
			return 'debug-pause';
		}
		if (task.phase !== undefined) {
			return PHASE_CODICON[task.phase];
		}
		return 'pulse';
	}

	private phaseLabel(phase: KeelCockpitTaskPhase): string {
		switch (phase) {
			case 1: return keelCockpitStrings.cardPhase1();
			case 2: return keelCockpitStrings.cardPhase2();
			case 3: return keelCockpitStrings.cardPhase3();
			case 4: return keelCockpitStrings.cardPhase4();
		}
	}

	private phaseHint(phase: KeelCockpitTaskPhase | undefined): string | undefined {
		switch (phase) {
			case 1: return keelCockpitStrings.cardPhase1Hint();
			case 2: return keelCockpitStrings.cardPhase2Hint();
			case 4: return keelCockpitStrings.cardPhase4Hint();
			default: return undefined;
		}
	}

	private statusLabel(task: IKeelCockpitTask): string {
		if (task.status === 'completed') {
			return keelCockpitStrings.cardCompletedTitle();
		}
		if (task.status === 'failed') {
			return keelCockpitStrings.cardFailedTitle();
		}
		if (task.status === 'paused') {
			return keelCockpitStrings.cardPausedTitle();
		}
		if (task.phase !== undefined) {
			return this.phaseLabel(task.phase);
		}
		return '';
	}

	private formatTime(date: Date): string {
		const h = String(date.getHours()).padStart(2, '0');
		const m = String(date.getMinutes()).padStart(2, '0');
		return `${h}:${m}`;
	}

	private formatBytes(bytes: number): string {
		if (bytes < 1024) {
			return `${bytes} B`;
		}
		if (bytes < 1024 * 1024) {
			return `${Math.round(bytes / 1024)} KB`;
		}
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}
}
