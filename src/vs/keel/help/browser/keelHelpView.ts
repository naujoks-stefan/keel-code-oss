/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { $, addDisposableListener, append, clearNode, EventType } from '../../../base/browser/dom.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { KeyCode } from '../../../base/common/keyCodes.js';
import { StandardKeyboardEvent } from '../../../base/browser/keyboardEvent.js';
import { URI } from '../../../base/common/uri.js';
import { keelHelpStrings } from './strings/keelHelpStrings.js';

/**
 * Callbacks, die die View an den EditorPane weiterreicht.
 */
export interface IKeelHelpViewHandlers {
	/** Wird aufgerufen, wenn Otto den Recover-Button klickt. */
	readonly onOpenCockpit: () => void;
	/** Wird aufgerufen, wenn Otto die Kontakt-E-Mail anklickt. */
	readonly onOpenEmail: (mailto: URI) => void;
}

/**
 * Zusatz-Daten, die die View fuer das FAQ-Rendering braucht (Welle 12, D-031).
 *
 * `dataLocation` wird in zwei FAQ-Antworten (Reports + Daten) als
 * Platzhalter eingesetzt. Der EditorPane liest sie aus dem
 * `IKeelSettingsService` und reicht sie hier durch, damit die View keine
 * Service-Dependencies zieht.
 */
export interface IKeelHelpViewData {
	readonly dataLocation: string;
	readonly contactEmail: string;
}

/**
 * DOM-Rendering-Logik fuer den Keel-Help-Editor (Welle 11).
 *
 * Die View ist bewusst minimal (MVP-Disziplin, final-decisions.md Abschnitt
 * 5.1):
 *  - Header mit Codicon `question`, Titel, Subheadline.
 *  - Body (vier kurze Saetze).
 *  - Kontakt-Block mit `hilfe@keel.app` als mailto-Link.
 *  - Recover-Button `[Cockpit oeffnen]`.
 *  - Footer-Hint "Mehr Hilfe-Themen kommen spaeter.".
 *
 * Keine FAQ, kein Troubleshooting, kein Log-Export — Welle 12+.
 */
export class KeelHelpView extends Disposable {

	private readonly viewDisposables = this._register(new DisposableStore());
	private recoverButton: HTMLButtonElement | undefined;

	constructor(
		private readonly parent: HTMLElement,
		private readonly handlers: IKeelHelpViewHandlers,
		private readonly data: IKeelHelpViewData,
	) {
		super();
	}

	/**
	 * Liefert den Recover-Button-Node, damit der EditorPane-Focus-Handler
	 * ihn beim Fokus-Wechsel direkt ansprechen kann (statt per querySelector).
	 */
	get recoverButtonNode(): HTMLButtonElement | undefined {
		return this.recoverButton;
	}

	render(): void {
		this.viewDisposables.clear();
		clearNode(this.parent);

		const container = append(this.parent, $<HTMLDivElement>('div.keel-help-container', {
			role: 'region',
			'aria-label': keelHelpStrings.containerAriaLabel(),
		}));

		const inner = append(container, $<HTMLDivElement>('div.keel-help-inner'));

		this.renderHeader(inner);
		this.renderBody(inner);
		this.renderContact(inner);
		this.renderFaq(inner);
		this.renderRecoverButton(inner);
		this.renderFooter(inner);
	}

	/**
	 * Welle-12 (D-031): FAQ-Accordion mit 5 Items. Ein Item zur Zeit offen,
	 * Klick-Toggle, Esc schliesst aktuelles. Mobile: Cards full-width
	 * (CSS-Grid mit `1fr`).
	 *
	 * Keyboard-Navigation:
	 *  - Enter / Space auf dem Header: toggelt das Item.
	 *  - Esc: schliesst das aktuell offene Item.
	 */
	private renderFaq(parent: HTMLElement): void {
		const block = append(parent, $<HTMLDivElement>('div.keel-help-faq', {
			'data-keel-help-faq': 'true',
			role: 'region',
			'aria-label': keelHelpStrings.faqHeader(),
		}));

		append(block, $<HTMLHeadingElement>('h2.keel-help-faq-header', {}, keelHelpStrings.faqHeader()));

		const list = append(block, $<HTMLDivElement>('div.keel-help-faq-list'));

		const items: Array<{ question: string; answer: string }> = [
			{
				question: keelHelpStrings.faqReportsQuestion(),
				answer: keelHelpStrings.faqReportsAnswer(this.data.dataLocation),
			},
			{
				question: keelHelpStrings.faqCockpitEmptyQuestion(),
				answer: keelHelpStrings.faqCockpitEmptyAnswer(),
			},
			{
				question: keelHelpStrings.faqSlowQuestion(),
				answer: keelHelpStrings.faqSlowAnswer(),
			},
			{
				question: keelHelpStrings.faqBugQuestion(),
				answer: keelHelpStrings.faqBugAnswer(this.data.contactEmail),
			},
			{
				question: keelHelpStrings.faqDataQuestion(),
				answer: keelHelpStrings.faqDataAnswer(this.data.dataLocation),
			},
		];

		// State: Index des offenen Items (oder -1, wenn alle zu sind).
		let openIndex = -1;
		const headers: HTMLButtonElement[] = [];
		const panels: HTMLDivElement[] = [];

		const applyState = () => {
			for (let i = 0; i < headers.length; i++) {
				const isOpen = i === openIndex;
				const header = headers[i];
				const panel = panels[i];
				if (!header || !panel) {
					continue;
				}
				header.setAttribute('aria-expanded', String(isOpen));
				panel.classList.toggle('keel-help-faq-panel-open', isOpen);
				panel.setAttribute('aria-hidden', String(!isOpen));
			}
		};

		items.forEach((item, index) => {
			const itemEl = append(list, $<HTMLDivElement>('div.keel-help-faq-item', {
				'data-keel-help-faq-item': String(index),
			}));

			const header = append(itemEl, $<HTMLButtonElement>('button.keel-help-faq-question', {
				type: 'button',
				'aria-expanded': 'false',
				'aria-label': keelHelpStrings.faqItemAriaLabel(item.question),
			}));
			append(header, $<HTMLSpanElement>('span.keel-help-faq-arrow.codicon.codicon-chevron-right', { 'aria-hidden': 'true' }));
			append(header, $<HTMLSpanElement>('span.keel-help-faq-question-text', {}, item.question));

			const panel = append(itemEl, $<HTMLDivElement>('div.keel-help-faq-panel', {
				role: 'region',
				'aria-hidden': 'true',
			}));
			append(panel, $<HTMLParagraphElement>('p.keel-help-faq-answer', {}, item.answer));

			headers.push(header);
			panels.push(panel);

			this.viewDisposables.add(addDisposableListener(header, EventType.CLICK, (e: MouseEvent) => {
				e.preventDefault();
				openIndex = openIndex === index ? -1 : index;
				applyState();
			}));

			this.viewDisposables.add(addDisposableListener(header, EventType.KEY_DOWN, (e: KeyboardEvent) => {
				const evt = new StandardKeyboardEvent(e);
				if (evt.keyCode === KeyCode.Enter || evt.keyCode === KeyCode.Space) {
					evt.preventDefault();
					evt.stopPropagation();
					openIndex = openIndex === index ? -1 : index;
					applyState();
				}
			}));
		});

		// Esc schliesst das aktuell offene Item. Wir binden an die Liste
		// (bubble-up), damit der Listener unabhaengig vom Fokus-Item
		// greift, solange Otto sich innerhalb der FAQ bewegt.
		this.viewDisposables.add(addDisposableListener(list, EventType.KEY_DOWN, (e: KeyboardEvent) => {
			const evt = new StandardKeyboardEvent(e);
			if (evt.keyCode === KeyCode.Escape && openIndex !== -1) {
				evt.preventDefault();
				evt.stopPropagation();
				openIndex = -1;
				applyState();
			}
		}));

		applyState();
	}

	private renderHeader(parent: HTMLElement): void {
		const header = append(parent, $<HTMLDivElement>('div.keel-help-header'));
		append(header, $<HTMLSpanElement>('span.keel-help-icon.codicon.codicon-question', { 'aria-hidden': 'true' }));
		append(header, $<HTMLHeadingElement>('h1.keel-help-title', {}, keelHelpStrings.header()));
		append(header, $<HTMLParagraphElement>('p.keel-help-subheadline', {}, keelHelpStrings.subheadline()));
	}

	private renderBody(parent: HTMLElement): void {
		append(parent, $<HTMLParagraphElement>('p.keel-help-body', {}, keelHelpStrings.body()));
	}

	private renderContact(parent: HTMLElement): void {
		const block = append(parent, $<HTMLDivElement>('div.keel-help-contact'));
		append(block, $<HTMLParagraphElement>('p.keel-help-contact-label', {}, keelHelpStrings.contactLabel()));

		const email = keelHelpStrings.contactEmail();
		const link = append(block, $<HTMLAnchorElement>('a.keel-help-contact-email', {
			href: `mailto:${email}`,
			'aria-label': keelHelpStrings.contactEmailAria(),
		}, email));

		this.viewDisposables.add(addDisposableListener(link, EventType.CLICK, (e: MouseEvent) => {
			e.preventDefault();
			this.handlers.onOpenEmail(URI.parse(`mailto:${email}`));
		}));
	}

	private renderRecoverButton(parent: HTMLElement): void {
		const wrapper = append(parent, $<HTMLDivElement>('div.keel-help-recover-wrapper'));
		const btn = append(wrapper, $<HTMLButtonElement>('button.keel-help-recover-button', {
			type: 'button',
			'aria-label': keelHelpStrings.recoverButtonAria(),
		}, keelHelpStrings.recoverButtonLabel()));
		this.recoverButton = btn;

		this.viewDisposables.add(addDisposableListener(btn, EventType.CLICK, (e: MouseEvent) => {
			e.preventDefault();
			this.handlers.onOpenCockpit();
		}));
	}

	private renderFooter(parent: HTMLElement): void {
		append(parent, $<HTMLParagraphElement>('p.keel-help-footer', {}, keelHelpStrings.footerHint()));
	}
}
