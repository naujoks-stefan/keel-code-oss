/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from '../../../../nls.js';

/**
 * Zentrale String-Ressource fuer den Keel-Help-Editor (Welle 11).
 *
 * Alle User-facing-Texte laufen ueber `nls.localize`. Die Keys und Werte
 * folgen der Spec `project-design/specs/keel-settings-help-final-decisions.md`
 * (Abschnitt "Help-Editor"). Bei Widerspruch zum Designer-Spec gewinnt die
 * `final-decisions`-Spec.
 *
 * Umlaute in den localize-Strings sind bewusst erhalten (User-facing,
 * i18n-ready); jede betroffene Zeile traegt ein
 * `allow-any-unicode-next-line`-Pragma, damit der Hygiene-Unicode-Check nicht
 * greift.
 */
export const keelHelpStrings = {
	// --- Editor-Tab ---
	editorName: (): string =>
		localize('keel.help.editor.name', "Hilfe"),
	editorTabAria: (): string =>
		localize('keel.help.editor.tab.aria', "Hilfe"),
	containerAriaLabel: (): string =>
		localize('keel.help.container.aria', "Hilfe-Bereich"),

	// --- Header ---
	header: (): string =>
		localize('keel.help.header', "Hilfe"),
	subheadline: (): string =>
		// allow-any-unicode-next-line
		localize('keel.help.subheadline', "Du bist nicht allein. So erreichst du uns."),

	// --- Body ---
	// Body als ein einzelner Block (entspricht final-decisions.md Abschnitt
	// Help-Editor). Vier kurze Saetze ohne Telefon-Zeile (v1-Beschluss in
	// final-decisions: Telefon-Zeile weglassen wenn keine feste Nummer).
	body: (): string =>
		// allow-any-unicode-next-line
		localize('keel.help.body', "Wenn Keel nicht tut, was du erwartest, schreib uns. Wir lesen jede Nachricht und antworten meist am gleichen Werktag. Fuer dringende Faelle ruf an — wir sind werktags von 9 bis 17 Uhr erreichbar. Wenn du zurueck ins Cockpit willst, klick unten."),

	// --- Kontakt-Block ---
	contactLabel: (): string =>
		// allow-any-unicode-next-line
		localize('keel.help.contact.label', "Schreib uns eine E-Mail:"),
	contactEmail: (): string =>
		// kein localize — E-Mail-Adresse ist keine Sprach-Variante, sondern
		// ein Marken-Konstante.
		'hilfe@keel.app',
	contactEmailAria: (): string =>
		// allow-any-unicode-next-line
		localize('keel.help.contact.email.aria', "E-Mail an {0} senden", 'hilfe@keel.app'),

	// --- Recover-Action ---
	recoverButtonLabel: (): string =>
		// allow-any-unicode-next-line
		localize('keel.help.recover.label', "Cockpit oeffnen"),
	recoverButtonAria: (): string =>
		// allow-any-unicode-next-line
		localize('keel.help.recover.aria', "Cockpit oeffnen"),

	// --- Footer-Hint (MVP-Disziplin) ---
	footerHint: (): string =>
		// allow-any-unicode-next-line
		localize('keel.help.footer.hint', "Mehr Hilfe-Themen kommen spaeter."),

	// --- Command-Titel ---
	showCommandTitle: (): string =>
		// allow-any-unicode-next-line
		localize('keel.help.command.show', "Hilfe oeffnen"),

	// --- Toast-Stufe-2 (wird hier gebuendelt, weil die Buttons den
	// Help-Editor triggern — Stringherkunft passt ins Help-Modul) ---
	toastStage2Body: (): string =>
		// allow-any-unicode-next-line
		localize('keel.platform.start.failed', "Keel laesst sich gerade nicht starten."),
	toastStage2Retry: (): string =>
		localize('keel.platform.start.retry', "Erneut versuchen"),
	toastStage2Help: (): string =>
		localize('keel.platform.start.help', "Hilfe"),

	// --- FAQ-Accordion (Welle 12, D-031) ---
	faqHeader: (): string =>
		// allow-any-unicode-next-line
		localize('keel.help.faq.header', "Haeufige Fragen"),
	faqReportsQuestion: (): string =>
		localize('keel.help.faq.reports.question', "Wo finde ich meine Reports?"),
	faqReportsAnswer: (dataLocation: string): string =>
		// allow-any-unicode-next-line
		localize('keel.help.faq.reports.answer', "Alle Auftraege werden automatisch gespeichert. Du findest sie im Cockpit unter 'Abgeschlossen' — oder direkt im Ordner {0}.", dataLocation),
	faqCockpitEmptyQuestion: (): string =>
		// allow-any-unicode-next-line
		localize('keel.help.faq.cockpitEmpty.question', "Warum ist mein Cockpit leer?"),
	faqCockpitEmptyAnswer: (): string =>
		// allow-any-unicode-next-line
		localize('keel.help.faq.cockpitEmpty.answer', "Beim ersten Start hast du noch keine Auftraege. Beschreibe einfach deinen ersten Auftrag oben — Keel nimmt ihn entgegen und bearbeitet ihn."),
	faqSlowQuestion: (): string =>
		// allow-any-unicode-next-line
		localize('keel.help.faq.slow.question', "Warum ist Keel langsam?"),
	faqSlowAnswer: (): string =>
		// allow-any-unicode-next-line
		localize('keel.help.faq.slow.answer', "Keel startet mit allen Diensten. Wenn das beim ersten Mal laenger dauert, ist das normal. Dauerhaft langsam? Dann schreib uns."),
	faqBugQuestion: (): string =>
		// allow-any-unicode-next-line
		localize('keel.help.faq.bug.question', "Wie melde ich einen Fehler?"),
	faqBugAnswer: (email: string): string =>
		// allow-any-unicode-next-line
		localize('keel.help.faq.bug.answer', "Schreib uns eine Mail an {0} mit kurzer Beschreibung, was du gemacht hast und was nicht funktionierte. Wir antworten meist am gleichen Werktag.", email),
	faqDataQuestion: (): string =>
		// allow-any-unicode-next-line
		localize('keel.help.faq.data.question', "Wo liegen meine Daten?"),
	faqDataAnswer: (dataLocation: string): string =>
		// allow-any-unicode-next-line
		localize('keel.help.faq.data.answer', "Alles, was du mit Keel arbeitest, bleibt lokal auf deinem Rechner im Ordner {0}. Wir uebertragen keine Inhalte deiner Auftraege an unsere Server.", dataLocation),

	faqItemAriaLabel: (question: string): string =>
		// allow-any-unicode-next-line
		localize('keel.help.faq.item.aria', "Frage: {0}. Enter zum Oeffnen oder Schliessen.", question),
};
