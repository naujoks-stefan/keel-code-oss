/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from '../../../../nls.js';

/**
 * Zentrale String-Ressource fuer den Keel-Einstellungen-Bereich (Welle 11).
 *
 * Alle User-facing-Texte laufen ueber `nls.localize` - Inline-Literale in den
 * UI-Dateien sind verboten (Review-Kriterium). Die Keys und Werte folgen der
 * Spec `project-design/specs/keel-settings-help-final-decisions.md` und
 * `project-design/specs/keel-settings-help-marketing-brief.md`. Bei
 * Widerspruch gewinnt die `final-decisions`-Spec.
 *
 * Umlaute in den localize-Strings sind bewusst erhalten (User-facing,
 * i18n-ready); jede betroffene Zeile traegt ein
 * `allow-any-unicode-next-line`-Pragma, damit der Hygiene-Unicode-Check nicht
 * greift. Ueberall sonst in dieser Datei werden Umlaute durch ASCII
 * ersetzt.
 */
export const keelSettingsStrings = {
	// --- Activity-Bar Gear-Icon-Ersatz ---
	activitybarSettingsTooltip: (): string =>
		localize('keel.settings.activitybar.tooltip', "Einstellungen"),
	activitybarSettingsAria: (): string =>
		// allow-any-unicode-next-line
		localize('keel.settings.activitybar.aria', "Einstellungen oeffnen"),

	// --- Flyout-Header ---
	flyoutHeader: (): string =>
		localize('keel.settings.flyout.header', "Einstellungen"),
	flyoutAria: (): string =>
		localize('keel.settings.flyout.aria', "Einstellungen"),
	flyoutCloseAria: (): string =>
		// allow-any-unicode-next-line
		localize('keel.settings.flyout.close.aria', "Einstellungen schliessen"),

	// --- Item 1: Sprache ---
	languageLabel: (): string =>
		localize('keel.settings.language.label', "Sprache"),
	languageDescription: (): string =>
		localize('keel.settings.language.description', "In welcher Sprache Keel mit dir spricht."),
	languageGerman: (): string =>
		localize('keel.settings.language.german', "Deutsch"),
	languageEnglishComingSoon: (): string =>
		// allow-any-unicode-next-line
		localize('keel.settings.language.englishComingSoon', "Englisch (Verfuegbar ab Welle 12)"),
	// Welle 12 (D-030): Aktivierter Englisch-Eintrag (ohne "Coming Soon"-
	// Suffix). Der alte `languageEnglishComingSoon`-Getter bleibt fuer
	// eventuelle Rueckkompat-Zugriffe erhalten, wird aber nicht mehr genutzt.
	languageEnglish: (): string =>
		localize('keel.settings.language.english', "Englisch"),
	languageRestartHint: (): string =>
		// allow-any-unicode-next-line
		localize('keel.settings.language.restartHint', "Sprachaenderung greift beim naechsten Start."),

	// --- Item 2: Helligkeit ---
	brightnessLabel: (): string =>
		localize('keel.settings.brightness.label', "Helligkeit"),
	brightnessDescription: (): string =>
		localize('keel.settings.brightness.description', "Heller oder dunkler Hintergrund."),
	brightnessLight: (): string =>
		localize('keel.settings.brightness.light', "Hell"),
	brightnessDark: (): string =>
		localize('keel.settings.brightness.dark', "Dunkel"),
	brightnessSystem: (): string =>
		localize('keel.settings.brightness.system', "Wie das System"),

	// --- Item 3: Wo liegen meine Daten? ---
	dataLocationLabel: (): string =>
		// allow-any-unicode-next-line
		localize('keel.settings.dataLocation.label', "Wo liegen meine Daten?"),
	dataLocationDescription: (path: string): string =>
		localize('keel.settings.dataLocation.description', "Keel speichert alles im Ordner {0}.", path),
	dataLocationOpenInExplorer: (): string =>
		// allow-any-unicode-next-line
		localize('keel.settings.dataLocation.openInExplorer', "Im Datei-Explorer oeffnen"),
	dataLocationOpenInFinder: (): string =>
		// allow-any-unicode-next-line
		localize('keel.settings.dataLocation.openInFinder', "Im Finder oeffnen"),
	dataLocationNotYetCreated: (): string =>
		localize('keel.settings.dataLocation.notYetCreated', "Wird beim ersten Speichern angelegt."),
	dataLocationNotYetCreatedTooltip: (): string =>
		localize('keel.settings.dataLocation.notYetCreatedTooltip', "Der Ordner existiert noch nicht."),

	// --- Item 4: Benachrichtigungen ---
	notificationsLabel: (): string =>
		localize('keel.settings.notifications.label', "Benachrichtigungen"),
	notificationsDescription: (): string =>
		localize('keel.settings.notifications.description', "Ob Keel dich auf dem Desktop benachrichtigt, wenn ein Auftrag fertig ist."),
	notificationsOn: (): string =>
		localize('keel.settings.notifications.on', "An"),
	notificationsOff: (): string =>
		localize('keel.settings.notifications.off', "Aus"),

	// --- Item 5: Nutzungs-Daten an Keel senden ---
	telemetryLabel: (): string =>
		localize('keel.settings.telemetry.label', "Nutzungs-Daten an Keel senden"),
	telemetryDescription: (): string =>
		// allow-any-unicode-next-line
		localize('keel.settings.telemetry.description', "Hilft uns, Keel zu verbessern. Keine Inhalte deiner Auftraege, nur anonyme Nutzungsmuster."),
	telemetryOn: (): string =>
		localize('keel.settings.telemetry.on', "An"),
	telemetryOff: (): string =>
		localize('keel.settings.telemetry.off', "Aus"),

	// --- Item 6: Zugang zu deinem Assistenten ---
	assistantLabel: (): string =>
		localize('keel.settings.assistant.label', "Zugang zu deinem Assistenten"),
	assistantStatusConnected: (account: string): string =>
		localize('keel.settings.assistant.status.connected', "Angemeldet als {0}.", account),
	assistantStatusNotConnected: (): string =>
		localize('keel.settings.assistant.status.notConnected', "Nicht angemeldet."),
	assistantSignIn: (): string =>
		localize('keel.settings.assistant.signIn', "Anmelden"),
	assistantSignOut: (): string =>
		localize('keel.settings.assistant.signOut', "Abmelden"),
	assistantComingSoon: (): string =>
		// allow-any-unicode-next-line
		localize('keel.settings.assistant.comingSoon', "Verfuegbar in Kuerze"),
	/**
	 * Welle 12 (D-032): Reauth-Banner-Text, wenn Otto nicht angemeldet ist
	 * (oder der Token expired ist). Wird im Assistant-Item als dezenter
	 * Warn-Hinweis angezeigt.
	 */
	assistantReauthBanner: (): string =>
		// allow-any-unicode-next-line
		localize('keel.settings.assistant.reauthBanner', "Melde dich bitte neu an, damit dein Assistent weiterarbeiten kann."),

	// --- Item 7: Ueber Keel ---
	aboutLabel: (): string =>
		// allow-any-unicode-next-line
		localize('keel.settings.about.label', "Ueber Keel"),
	aboutProductName: (): string =>
		localize('keel.settings.about.productName', "Keel — The AI Cockpit"),
	aboutVersion: (version: string): string =>
		localize('keel.settings.about.version', "Version {0}", version),
	aboutCopyright: (year: string): string =>
		// allow-any-unicode-next-line
		localize('keel.settings.about.copyright', "© {0} Keel", year),

	// --- Command-Titel ---
	showCommandTitle: (): string =>
		// allow-any-unicode-next-line
		localize('keel.settings.command.show', "Einstellungen oeffnen"),
};
