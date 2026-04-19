/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from '../../../../nls.js';

/**
 * Zentrale String-Ressource fuer das Welcome.
 *
 * Alle User-facing-Texte laufen ueber `nls.localize` - Inline-Literale in den
 * UI-Dateien sind verboten (Review-Kriterium). Die Keys folgen der Spec
 * `project-design/specs/keel-welcome.md`.
 *
 * Umlaute in den localize-Strings sind bewusst erhalten (User-facing, i18n-ready);
 * jede betroffene Zeile traegt ein `allow-any-unicode-next-line`-Pragma, damit
 * der Hygiene-Unicode-Check nicht greift. Ueberall sonst in dieser Datei werden
 * Umlaute durch ASCII-Aequivalente ersetzt.
 */
export const keelWelcomeStrings = {
	headline: (): string => localize('keel.welcome.headline', "Willkommen bei Keel."),
	// allow-any-unicode-next-line
	subtitle: (): string => localize('keel.welcome.subtitle', "Was soll ich für dich tun?"),

	promptPlaceholder: (): string => localize('keel.welcome.prompt.placeholder', "Beschreibe deinen Auftrag …"),
	// allow-any-unicode-next-line
	promptHint: (): string => localize('keel.welcome.prompt.hint', "Enter zum Starten ↵"),
	promptAriaLabel: (): string => localize('keel.welcome.prompt.ariaLabel', "Auftrag beschreiben"),
	emptyShake: (): string => localize('keel.welcome.empty.shake', "Bitte beschreibe zuerst deinen Auftrag."),

	/**
	 * Welle-12 (D-029): Lead-Ref-Block zwischen Subtitle und Prompt-Eingabe.
	 * Erscheint beim Erststart, verschwindet nach dem ersten erfolgreichen
	 * Submit (Flag `keel.welcome.leadIntroSeen`).
	 */
	// allow-any-unicode-next-line
	leadIntroLine1: (): string => localize('keel.welcome.leadIntro.line1', "Das ist dein Keel-Koordinator."),
	// allow-any-unicode-next-line
	leadIntroLine2: (): string => localize('keel.welcome.leadIntro.line2', "Er plant, delegiert und haelt den Ueberblick — du entscheidest, was losgeht."),

	examplesLabel: (): string => localize('keel.welcome.examples.label', "Oder starte mit einem Beispiel:"),

	example1Title: (): string => localize('keel.welcome.example1.title', "Monatsbericht schreiben"),
	// allow-any-unicode-next-line
	example1Subtitle: (): string => localize('keel.welcome.example1.subtitle', "Zahlen aus einer Tabelle holen und in Fließtext fassen."),

	example2Title: (): string => localize('keel.welcome.example2.title', "E-Mail-Stapel zusammenfassen"),
	// allow-any-unicode-next-line
	example2Subtitle: (): string => localize('keel.welcome.example2.subtitle', "Outlook-Export lesen und als Übersicht antworten."),

	example3Title: (): string => localize('keel.welcome.example3.title', "Recherche starten"),
	// allow-any-unicode-next-line
	example3Subtitle: (): string => localize('keel.welcome.example3.subtitle', "Überblick zu einem Thema, mit Quellen."),

	example4Title: (): string => localize('keel.welcome.example4.title', "Meeting vorbereiten"),
	example4Subtitle: (): string => localize('keel.welcome.example4.subtitle', "Agenda, Stichworte, Fragen aus den letzten Protokollen."),

	// Welle-12 (D-029): Card 5 von "Wettbewerbs-Scan" auf "Wettbewerbsanalyse"
	// umbenannt (final-decisions: Wettbewerbsanalyse ist der neutrale DACH-
	// Business-Begriff und passt zu Otto-Sprache).
	example5Title: (): string => localize('keel.welcome.example5.title', "Wettbewerbsanalyse"),
	// allow-any-unicode-next-line
	example5Subtitle: (): string => localize('keel.welcome.example5.subtitle', "Was machen die drei größten Mitbewerber gerade?"),

	/**
	 * ARIA-Label fuer Example-Cards. Enthaelt Titel, Subtitle und Hinweis zur Tastatur-Bedienung.
	 */
	exampleCardAriaLabel: (title: string, subtitle: string): string =>
		// allow-any-unicode-next-line
		localize('keel.welcome.example.ariaLabel', "Beispiel: {0}. {1}. Enter zum Übernehmen.", title, subtitle),

	howItWorksTitle: (): string => localize('keel.welcome.howItWorks.title', "So funktioniert Keel"),
	howItWorksStep1: (): string => localize('keel.welcome.howItWorks.step1', "Du beschreibst deinen Auftrag."),
	howItWorksStep2: (): string => localize('keel.welcome.howItWorks.step2', "Keel zeigt dir einen Plan — du entscheidest, ob er startet."),
	howItWorksStep3: (): string => localize('keel.welcome.howItWorks.step3', "Du siehst, was getan wurde, und kannst es exportieren."),

	privacyText: (): string => localize('keel.welcome.privacy.text', "Deine Daten bleiben auf deinem Rechner."),
	privacyLink: (): string => localize('keel.welcome.privacy.link', "Regeln ansehen"),

	// allow-any-unicode-next-line
	containerAriaLabel: (): string => localize('keel.welcome.container.ariaLabel', "Start-Einführung"),
	editorName: (): string => localize('keel.welcome.editor.name', "Willkommen"),

	toastDispatchAccepted: (): string => localize('keel.welcome.toast.dispatchAccepted', "Dein Auftrag wurde angenommen."),

	showOnStartupDescription: (): string =>
		// allow-any-unicode-next-line
		localize('keel.welcome.config.showOnStartup', "Zeigt die Start-Einführung beim nächsten Start wieder an."),

	// allow-any-unicode-next-line
	showCommandTitle: (): string => localize('keel.welcome.command.show', "Start-Einführung öffnen"),
};

/**
 * Deklarative Definition der Example-Cards.
 *
 * Die `prompt`-Strings sind bewusst nicht ueber `nls.localize` gefuehrt -
 * sie sind User-facing, aber ihre Laenge und Natur machen sie zu Content-Strings,
 * nicht zu UI-Labels. Sie werden beim Klick in die Eingabezeile geschrieben.
 * Fuer v2/Multi-Language werden sie als separater Content-Resource-Block migriert.
 *
 * `codiconId` ist der String-Name eines Codicons aus `vs/base/common/codicons.ts`
 * (z.B. `'graph'`, `'mail'`). Der View rendert `<span class="codicon codicon-<id>">`.
 */
export interface KeelWelcomeExampleDefinition {
	readonly id: string;
	readonly codiconId: string;
	readonly title: () => string;
	readonly subtitle: () => string;
	readonly prompt: () => string;
}

export const keelWelcomeExamples: readonly KeelWelcomeExampleDefinition[] = [
	{
		id: 'example1',
		codiconId: 'graph',
		title: keelWelcomeStrings.example1Title,
		subtitle: keelWelcomeStrings.example1Subtitle,
		prompt: () => localize('keel.welcome.example1.prompt', "Schreibe mir einen Monatsbericht aus den Zahlen einer Excel-Tabelle. Frag mich, welche Tabelle und welcher Zeitraum, bevor du loslegst."),
	},
	{
		id: 'example2',
		codiconId: 'mail',
		title: keelWelcomeStrings.example2Title,
		subtitle: keelWelcomeStrings.example2Subtitle,
		prompt: () => localize('keel.welcome.example2.prompt', "Fasse mir einen Stapel E-Mails zusammen. Ich gebe dir gleich eine Export-Datei — pro Thread eine Zeile: Absender, Thema, Kernaussage, offene Frage."),
	},
	{
		id: 'example3',
		codiconId: 'search',
		title: keelWelcomeStrings.example3Title,
		subtitle: keelWelcomeStrings.example3Subtitle,
		// allow-any-unicode-next-line
		prompt: () => localize('keel.welcome.example3.prompt', "Recherchiere mir ein Thema und schreib mir einen Überblick mit drei bis fünf Quellen. Sag mir einfach, welches Thema."),
	},
	{
		id: 'example4',
		codiconId: 'calendar',
		title: keelWelcomeStrings.example4Title,
		subtitle: keelWelcomeStrings.example4Subtitle,
		prompt: () => localize('keel.welcome.example4.prompt', "Bereite mir ein Meeting vor. Ich nenne dir gleich das Thema und die Teilnehmer — du erstellst Agenda, Stichworte und Fragen, die ich stellen sollte."),
	},
	{
		id: 'example5',
		codiconId: 'telescope',
		title: keelWelcomeStrings.example5Title,
		subtitle: keelWelcomeStrings.example5Subtitle,
		// allow-any-unicode-next-line
		prompt: () => localize('keel.welcome.example5.prompt', "Mach mir einen Wettbewerbs-Scan. Ich nenne dir die drei Mitbewerber und die Branche — du lieferst mir aktuelle Aktivitäten, Pricing und Kommunikations-Schwerpunkte."),
	},
];
