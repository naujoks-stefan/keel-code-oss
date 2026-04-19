/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { $, append, addDisposableListener, EventType, clearNode } from '../../../base/browser/dom.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { KeyCode } from '../../../base/common/keyCodes.js';
import { StandardKeyboardEvent } from '../../../base/browser/keyboardEvent.js';
import { keelWelcomeStrings, keelWelcomeExamples, KeelWelcomeExampleDefinition } from './strings/keelWelcomeStrings.js';

/**
 * Callbacks, die die View an den EditorPane weiterreicht.
 *
 * Event-basiertes Modell ist hier bewusst vermieden - die Kontroll-Flows
 * laufen synchron vom Input zur Dispatch-Ebene.
 */
export interface IKeelWelcomeViewHandlers {
	/** Wird aufgerufen, wenn der User Enter drueckt und die Eingabe nicht leer ist. */
	readonly onSubmit: (prompt: string) => void;
	/** Wird aufgerufen, wenn der User auf den Regeln-Link klickt. */
	readonly onOpenRules: () => void;
}

export interface IKeelWelcomeViewOptions {
	/** Steuert Autofokus: beim First-Run `true`, beim manuellen Oeffnen `false`. */
	readonly autoFocusInput: boolean;

	/**
	 * Welle-12 (D-029): Zeigt den Lead-Ref-Block zwischen Subtitle und
	 * Prompt-Eingabe. Der Caller entscheidet anhand des Storage-Flags
	 * `keel.welcome.leadIntroSeen`, ob der Block noch angezeigt wird. Nach
	 * dem ersten Submit wird das Flag gesetzt und der Block verschwindet.
	 */
	readonly showLeadIntro: boolean;
}

/**
 * DOM-Rendering-Logik fuer das Keel-Welcome.
 *
 * Die Klasse ist rein View - sie haelt keinen globalen Zustand ausser dem Inhalt
 * der Eingabezeile. Alle Services (Storage, Notification etc.) werden vom
 * EditorPane verwaltet.
 *
 * Visuelle Icons werden ausschliesslich als Codicons gerendert. Der View nutzt
 * die CSS-Klassen-Variante `<span class="codicon codicon-<id>">`; der Name
 * stammt aus `vs/base/common/codicons.ts`. Emojis sind verboten (Spec v1.1).
 */
export class KeelWelcomeView extends Disposable {

	private readonly viewDisposables = this._register(new DisposableStore());

	private promptTextarea: HTMLTextAreaElement | undefined;
	private howItWorksExpanded: boolean = true;

	constructor(
		private readonly parent: HTMLElement,
		private readonly handlers: IKeelWelcomeViewHandlers,
		private readonly options: IKeelWelcomeViewOptions,
	) {
		super();
	}

	/**
	 * Baut die komplette Welcome-DOM auf. Mehrfach aufrufbar - vorhandener Inhalt
	 * wird beim Re-Render verworfen.
	 */
	render(): void {
		this.viewDisposables.clear();
		clearNode(this.parent);

		const container = append(this.parent, $<HTMLDivElement>('div.keel-welcome-container', {
			role: 'region',
			'aria-label': keelWelcomeStrings.containerAriaLabel(),
		}));

		const inner = append(container, $<HTMLDivElement>('div.keel-welcome-inner'));

		this.renderHeadline(inner);
		if (this.options.showLeadIntro) {
			this.renderLeadIntro(inner);
		}
		this.renderPromptInput(inner);
		this.renderExamples(inner);
		this.renderDivider(inner);
		this.renderHowItWorks(inner);
		this.renderPrivacyFootnote(inner);

		if (this.options.autoFocusInput) {
			// Nach dem Mount den Fokus setzen - nicht vorher, da das Element erst
			// nach dem appendChild im DOM ist.
			queueMicrotask(() => this.focusPrompt());
		}
	}

	/**
	 * Setzt Fokus auf die Eingabezeile und stellt den Cursor ans Textende.
	 */
	focusPrompt(): void {
		const ta = this.promptTextarea;
		if (!ta) {
			return;
		}
		ta.focus();
		const end = ta.value.length;
		ta.setSelectionRange(end, end);
	}

	// --- Teil-Renderer ---

	private renderHeadline(parent: HTMLElement): void {
		const block = append(parent, $<HTMLDivElement>('div.keel-welcome-headline'));
		append(block, $<HTMLHeadingElement>('h1.keel-welcome-h1', {}, keelWelcomeStrings.headline()));
		append(block, $<HTMLParagraphElement>('p.keel-welcome-subtitle', {}, keelWelcomeStrings.subtitle()));
	}

	/**
	 * Welle-12 (D-029): Lead-Ref-Block zwischen Subtitle und Prompt-Eingabe.
	 * Zwei kurze Saetze, die Otto auf den Keel-Koordinator einstimmen. Nach
	 * dem ersten Submit setzt der EditorPane das Flag `keel.welcome.
	 * leadIntroSeen` und der Block wird beim naechsten Render nicht mehr
	 * gezeigt.
	 *
	 * Semantisch ist der Block ein `note`-Region, damit Screen-Reader ihn
	 * als zusammenhaengenden Hinweis wiedergeben.
	 */
	private renderLeadIntro(parent: HTMLElement): void {
		const block = append(parent, $<HTMLDivElement>('div.keel-welcome-lead-intro', {
			role: 'note',
			'data-keel-welcome-lead-intro': 'true',
		}));
		append(block, $<HTMLParagraphElement>('p.keel-welcome-lead-intro-line1', {}, keelWelcomeStrings.leadIntroLine1()));
		append(block, $<HTMLParagraphElement>('p.keel-welcome-lead-intro-line2', {}, keelWelcomeStrings.leadIntroLine2()));
	}

	private renderPromptInput(parent: HTMLElement): void {
		const wrapper = append(parent, $<HTMLDivElement>('div.keel-welcome-prompt-wrapper'));

		const ta = append(wrapper, $<HTMLTextAreaElement>('textarea.keel-welcome-prompt', {
			placeholder: keelWelcomeStrings.promptPlaceholder(),
			'aria-label': keelWelcomeStrings.promptAriaLabel(),
			rows: '1',
			spellcheck: 'false',
			autocapitalize: 'sentences',
		}));
		this.promptTextarea = ta;

		append(wrapper, $<HTMLDivElement>('div.keel-welcome-prompt-hint', {}, keelWelcomeStrings.promptHint()));

		// Auto-Grow bis max. 200px - danach interner Scroll.
		this.viewDisposables.add(addDisposableListener(ta, EventType.INPUT, () => this.autoGrowPrompt()));

		// Enter submittet, Shift+Enter fuegt Zeilenumbruch ein.
		this.viewDisposables.add(addDisposableListener(ta, EventType.KEY_DOWN, (e: KeyboardEvent) => {
			const evt = new StandardKeyboardEvent(e);
			if (evt.keyCode === KeyCode.Enter && !evt.shiftKey) {
				evt.preventDefault();
				evt.stopPropagation();
				this.handleSubmit();
			} else if (evt.keyCode === KeyCode.Escape) {
				// Esc loescht den Inhalt, schliesst aber Welcome NICHT (siehe Spec).
				evt.preventDefault();
				evt.stopPropagation();
				ta.value = '';
				this.autoGrowPrompt();
			}
		}));
	}

	private autoGrowPrompt(): void {
		const ta = this.promptTextarea;
		if (!ta) {
			return;
		}
		ta.style.height = 'auto';
		const maxHeight = 200;
		const newHeight = Math.min(ta.scrollHeight, maxHeight);
		ta.style.height = `${newHeight}px`;
		ta.style.overflowY = ta.scrollHeight > maxHeight ? 'auto' : 'hidden';
	}

	private handleSubmit(): void {
		const ta = this.promptTextarea;
		if (!ta) {
			return;
		}
		const value = ta.value.trim();
		if (value.length === 0) {
			this.shakePrompt();
			return;
		}
		this.handlers.onSubmit(value);
	}

	private shakePrompt(): void {
		const ta = this.promptTextarea;
		if (!ta) {
			return;
		}
		// `prefers-reduced-motion` wird per CSS respektiert - dort wird die Animation deaktiviert.
		ta.classList.remove('keel-welcome-shake');
		// Reflow erzwingen, damit die Klasse erneut triggert.
		void ta.offsetWidth;
		ta.classList.add('keel-welcome-shake');
		ta.setAttribute('aria-invalid', 'true');
		ta.setAttribute('aria-errormessage', keelWelcomeStrings.emptyShake());
	}

	private renderExamples(parent: HTMLElement): void {
		append(parent, $<HTMLParagraphElement>('p.keel-welcome-examples-label', {}, keelWelcomeStrings.examplesLabel()));

		const grid = append(parent, $<HTMLDivElement>('div.keel-welcome-examples-grid'));
		for (const example of keelWelcomeExamples) {
			this.renderExampleCard(grid, example);
		}
	}

	private renderExampleCard(parent: HTMLElement, example: KeelWelcomeExampleDefinition): void {
		const title = example.title();
		const subtitle = example.subtitle();

		const card = append(parent, $<HTMLDivElement>('div.keel-welcome-example-card', {
			role: 'button',
			tabindex: '0',
			'aria-label': keelWelcomeStrings.exampleCardAriaLabel(title, subtitle),
			'data-example-id': example.id,
		}));

		const header = append(card, $<HTMLDivElement>('div.keel-welcome-example-header'));
		// Icon ist rein dekorativ (aria-hidden). Die semantische Last tragen Titel + Subtitle.
		append(header, $<HTMLSpanElement>(`span.keel-welcome-example-icon.codicon.codicon-${example.codiconId}`, { 'aria-hidden': 'true' }));
		append(header, $<HTMLSpanElement>('span.keel-welcome-example-title', {}, title));

		append(card, $<HTMLParagraphElement>('p.keel-welcome-example-subtitle', {}, subtitle));

		const pick = () => this.applyExamplePrompt(example.prompt());

		this.viewDisposables.add(addDisposableListener(card, EventType.CLICK, (e: MouseEvent) => {
			e.preventDefault();
			pick();
		}));

		this.viewDisposables.add(addDisposableListener(card, EventType.KEY_DOWN, (e: KeyboardEvent) => {
			const evt = new StandardKeyboardEvent(e);
			if (evt.keyCode === KeyCode.Enter || evt.keyCode === KeyCode.Space) {
				evt.preventDefault();
				evt.stopPropagation();
				pick();
			}
		}));
	}

	private applyExamplePrompt(prompt: string): void {
		const ta = this.promptTextarea;
		if (!ta) {
			return;
		}
		ta.value = prompt;
		ta.removeAttribute('aria-invalid');
		ta.removeAttribute('aria-errormessage');
		this.autoGrowPrompt();
		this.focusPrompt();
	}

	private renderDivider(parent: HTMLElement): void {
		append(parent, $<HTMLDivElement>('div.keel-welcome-divider', { role: 'separator', 'aria-hidden': 'true' }));
	}

	private renderHowItWorks(parent: HTMLElement): void {
		const block = append(parent, $<HTMLDivElement>('div.keel-welcome-how'));

		const toggle = append(block, $<HTMLButtonElement>('button.keel-welcome-how-toggle', {
			type: 'button',
			'aria-expanded': String(this.howItWorksExpanded),
		}));
		// Chevron als Codicon - aufgeklappt `chevron-down`, zugeklappt `chevron-right`.
		// Das aria-expanded am Button traegt die semantische Information; das Icon
		// selbst ist dekorativ (aria-hidden).
		const arrow = append(toggle, $<HTMLSpanElement>('span.keel-welcome-how-arrow.codicon.codicon-chevron-down', { 'aria-hidden': 'true' }));
		append(toggle, $<HTMLSpanElement>('span.keel-welcome-how-title', {}, keelWelcomeStrings.howItWorksTitle()));

		const list = append(block, $<HTMLOListElement>('ol.keel-welcome-how-list'));
		append(list, $<HTMLLIElement>('li', {}, keelWelcomeStrings.howItWorksStep1()));
		append(list, $<HTMLLIElement>('li', {}, keelWelcomeStrings.howItWorksStep2()));
		append(list, $<HTMLLIElement>('li', {}, keelWelcomeStrings.howItWorksStep3()));

		const setExpanded = (expanded: boolean) => {
			this.howItWorksExpanded = expanded;
			toggle.setAttribute('aria-expanded', String(expanded));
			arrow.classList.toggle('codicon-chevron-down', expanded);
			arrow.classList.toggle('codicon-chevron-right', !expanded);
			list.classList.toggle('keel-welcome-how-list-collapsed', !expanded);
		};
		setExpanded(this.howItWorksExpanded);

		this.viewDisposables.add(addDisposableListener(toggle, EventType.CLICK, () => setExpanded(!this.howItWorksExpanded)));
	}

	private renderPrivacyFootnote(parent: HTMLElement): void {
		const footnote = append(parent, $<HTMLDivElement>('div.keel-welcome-privacy'));
		// Shield-Codicon als dezenter Datenschutz-Hinweis (aria-hidden, Text traegt die Semantik).
		append(footnote, $<HTMLSpanElement>('span.keel-welcome-privacy-icon.codicon.codicon-shield', { 'aria-hidden': 'true' }));
		append(footnote, $<HTMLSpanElement>('span.keel-welcome-privacy-text', {}, keelWelcomeStrings.privacyText()));

		const link = append(footnote, $<HTMLButtonElement>('button.keel-welcome-privacy-link', {
			type: 'button',
		}, keelWelcomeStrings.privacyLink()));

		this.viewDisposables.add(addDisposableListener(link, EventType.CLICK, () => this.handlers.onOpenRules()));
	}
}
