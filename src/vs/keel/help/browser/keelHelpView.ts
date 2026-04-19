/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { $, addDisposableListener, append, clearNode, EventType } from '../../../base/browser/dom.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
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
		this.renderRecoverButton(inner);
		this.renderFooter(inner);
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
