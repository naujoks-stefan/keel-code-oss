/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { $, append, addDisposableListener, EventType, clearNode } from '../../../base/browser/dom.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { KeyCode } from '../../../base/common/keyCodes.js';
import { StandardKeyboardEvent } from '../../../base/browser/keyboardEvent.js';
import {
	IKeelCockpitTask,
	KeelCockpitTaskPhase,
	KEEL_COCKPIT_MAX_ACTIVE_TASKS,
} from '../common/keelCockpit.js';
import { IKeelCockpitService } from './keelCockpitService.js';
import { keelCockpitStrings } from './strings/keelCockpitStrings.js';

/**
 * Callbacks, die die View an den EditorPane weiterreicht.
 */
export interface IKeelCockpitViewHandlers {
	/** Wird aufgerufen, wenn der User einen neuen Auftrag startet. */
	readonly onNewTask: (prompt: string) => void;
	/** Informations-Toast an den NotificationService delegieren. */
	readonly onNotify: (message: string) => void;
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
 * DOM-Rendering-Logik fuer das Keel-Cockpit.
 *
 * Die Klasse abonniert den `IKeelCockpitService`, haelt selbst aber keinen
 * Task-State - sie re-rendert komplett bei jedem `onTasksChanged`-Event. Das
 * ist fuer die MVP-Karten-Zahl (max. 4 aktiv + Queue) ausreichend; fuer spaetere
 * Optimierung koennte ein Diff-Rendering eingefuehrt werden.
 *
 * Visuelle Icons werden ausschliesslich als Codicons gerendert (Spec-Vorgabe,
 * keine Emojis). Der View nutzt die CSS-Klassen-Variante
 * `<span class="codicon codicon-<id>">`.
 */
export class KeelCockpitView extends Disposable {

	private readonly viewDisposables = this._register(new DisposableStore());

	private container: HTMLElement | undefined;
	private queueBadge: HTMLElement | undefined;

	/** Overlay fuer PlanReview und NewTask. Nur eins aktiv gleichzeitig. */
	private activeOverlay: HTMLElement | undefined;
	private activeOverlayDisposables: DisposableStore | undefined;

	constructor(
		private readonly parent: HTMLElement,
		private readonly handlers: IKeelCockpitViewHandlers,
		private readonly cockpitService: IKeelCockpitService,
	) {
		super();
		this._register(this.cockpitService.onTasksChanged(() => this.rerender()));
	}

	/**
	 * Baut die komplette Cockpit-DOM auf. Mehrfach aufrufbar.
	 */
	render(): void {
		this.viewDisposables.clear();
		clearNode(this.parent);

		this.container = append(this.parent, $<HTMLDivElement>('div.keel-cockpit-container'));

		this.renderHeader(this.container);
		this.renderBody(this.container);
	}

	focus(): void {
		// Fokus auf den primaeren Button, wenn Empty-State oder Header-Button.
		// eslint-disable-next-line no-restricted-syntax -- MVP-Refactor in Welle 9
		const cta = this.container?.querySelector<HTMLButtonElement>('.keel-cockpit-new-task-btn');
		cta?.focus();
	}

	override dispose(): void {
		this.closeOverlay();
		super.dispose();
	}

	// --- Rerender ---

	private rerender(): void {
		// Wenn ein Overlay gerade offen ist (PlanReview zeigt Plan einer Task,
		// die jetzt moeglicherweise aktualisiert wurde), lassen wir es stehen -
		// die View aktualisiert nur das Grid.
		if (!this.container) {
			return;
		}
		this.renderBody(this.container);
	}

	// --- Header ---

	private renderHeader(parent: HTMLElement): void {
		const header = append(parent, $<HTMLDivElement>('header.keel-cockpit-header'));

		const left = append(header, $<HTMLDivElement>('div.keel-cockpit-header-left'));
		append(left, $<HTMLSpanElement>('span.keel-cockpit-header-logo', {}, 'Keel'));
		append(left, $<HTMLHeadingElement>(
			'h1.keel-cockpit-header-title',
			{},
			keelCockpitStrings.headerTitle(),
		));

		const right = append(header, $<HTMLDivElement>('div.keel-cockpit-header-right'));

		// QueueIndicator - nur sichtbar wenn queue.length > 0.
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

		const newTaskBtn = append(right, $<HTMLButtonElement>('button.keel-cockpit-new-task-btn', {
			type: 'button',
		}));
		append(newTaskBtn, $<HTMLSpanElement>(
			'span.codicon.codicon-add.keel-cockpit-new-task-icon',
			{ 'aria-hidden': 'true' },
		));
		append(newTaskBtn, $<HTMLSpanElement>(
			'span.keel-cockpit-new-task-label',
			{},
			keelCockpitStrings.headerNewTask(),
		));

		this.viewDisposables.add(addDisposableListener(newTaskBtn, EventType.CLICK, () => {
			this.openNewTaskSheet();
		}));
	}

	// --- Body ---

	/**
	 * Rendert den Body-Bereich. Bei jedem `rerender()` wird dieser Teil
	 * komplett neu aufgebaut; der Header bleibt stehen.
	 */
	private renderBody(parent: HTMLElement): void {
		// Alten Body entfernen
		// eslint-disable-next-line no-restricted-syntax -- MVP-Refactor (dom.ts h-Builder) in Welle 9
		const oldBody = parent.querySelector('.keel-cockpit-body');
		oldBody?.remove();

		const body = append(parent, $<HTMLDivElement>('div.keel-cockpit-body'));

		const allTasks = this.cockpitService.getTasks();
		const activeTasks = allTasks.slice(0, KEEL_COCKPIT_MAX_ACTIVE_TASKS);
		const queue = allTasks.slice(KEEL_COCKPIT_MAX_ACTIVE_TASKS);

		this.updateQueueBadge(queue.length);

		if (activeTasks.length === 0) {
			this.renderEmpty(body);
		} else {
			this.renderGrid(body, activeTasks);
		}
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
		// eslint-disable-next-line no-restricted-syntax -- MVP-Refactor in Welle 9
		const textEl = this.queueBadge.querySelector<HTMLElement>('.keel-cockpit-queue-text');
		if (textEl) {
			textEl.textContent = keelCockpitStrings.queueIndicator(count);
		}
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

		const cta = append(block, $<HTMLButtonElement>(
			'button.keel-cockpit-new-task-btn.keel-cockpit-empty-cta',
			{ type: 'button' },
		));
		append(cta, $<HTMLSpanElement>(
			'span.codicon.codicon-add.keel-cockpit-new-task-icon',
			{ 'aria-hidden': 'true' },
		));
		append(cta, $<HTMLSpanElement>(
			'span.keel-cockpit-new-task-label',
			{},
			keelCockpitStrings.emptyCta(),
		));

		this.viewDisposables.add(addDisposableListener(cta, EventType.CLICK, () => {
			this.openNewTaskSheet();
		}));
	}

	// --- Grid ---

	private renderGrid(parent: HTMLElement, tasks: ReadonlyArray<IKeelCockpitTask>): void {
		const grid = append(parent, $<HTMLDivElement>(
			`div.keel-cockpit-grid.keel-cockpit-grid-${tasks.length}`,
		));

		for (const task of tasks) {
			this.renderTaskCard(grid, task);
		}
	}

	// --- TaskCard ---

	private renderTaskCard(parent: HTMLElement, task: IKeelCockpitTask): void {
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
