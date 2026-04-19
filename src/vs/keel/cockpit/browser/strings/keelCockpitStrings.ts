/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from '../../../../nls.js';

/**
 * Zentrale String-Ressource fuer das Cockpit.
 *
 * Alle User-facing-Texte laufen ueber `nls.localize` - Inline-Literale in den
 * UI-Dateien sind verboten (Review-Kriterium). Die Keys folgen der Spec
 * `project-design/specs/keel-cockpit.md`.
 *
 * Alle Phasen-Labels sind bewusst als Verben formuliert (Marketing-Must):
 * "Verstehe Auftrag", "Erstelle Plan", "Warte auf Freigabe", "Arbeite...".
 *
 * Umlaute in den localize-Strings sind erhalten; jede betroffene Zeile traegt
 * ein `allow-any-unicode-next-line`-Pragma, damit der Hygiene-Unicode-Check
 * nicht greift. Ueberall sonst in dieser Datei werden Umlaute durch ASCII
 * ersetzt.
 */
export const keelCockpitStrings = {
	// --- Header (Welle 9: Projekt-Header ersetzt den alten Workspace-Header) ---
	// Bleibt als Fallback fuer Tests, wird in der View nicht mehr gerendert.
	// allow-any-unicode-next-line
	headerTitle: (): string => localize('keel.cockpit.header.title', "Dein Arbeitsbereich"),
	headerNewTask: (): string => localize('keel.cockpit.header.newTask', "+ Neuer Auftrag"),

	// --- Projekt (Welle 9) ---
	// allow-any-unicode-next-line
	projectDefaultName: (): string => localize('keel.project.default.name', "Mein Arbeitsbereich"),
	projectHeaderTitle: (projectName: string): string =>
		localize('keel.project.header.title', "{0}", projectName),
	projectHeaderNewTask: (): string =>
		localize('keel.project.header.newTask', "+ Neuer Auftrag"),
	projectHeaderNewTaskAria: (): string =>
		// allow-any-unicode-next-line
		localize('keel.project.header.newTask.aria', "Neuen Auftrag starten"),
	projectRenameMenuItem: (): string =>
		localize('keel.project.rename.menu.item', "Umbenennen"),
	projectRenameAriaChevron: (): string =>
		// allow-any-unicode-next-line
		localize('keel.project.rename.aria.chevron', "Projekt-Optionen oeffnen"),
	projectRenameInvalid: (): string =>
		// allow-any-unicode-next-line
		localize('keel.project.rename.invalid', "Der Projekt-Name darf nicht leer sein."),
	projectRenamePlaceholder: (): string =>
		localize('keel.project.rename.placeholder', "Projekt-Name..."),

	// --- Projektleiter-Card (Welle 9) ---
	projectLeadTitle: (): string => localize('keel.project.coordinator.title', "Projektleiter"),
	projectLeadAria: (statusText: string): string =>
		// allow-any-unicode-next-line
		localize('keel.project.coordinator.aria', "Projektleiter, {0}", statusText),
	projectLeadStatusIdle: (): string =>
		// allow-any-unicode-next-line
		localize('keel.project.coordinator.status.idle', "Bereit fuer deinen ersten Auftrag"),
	projectLeadStatusActiveOne: (): string =>
		// allow-any-unicode-next-line
		localize('keel.project.coordinator.status.active.one', "Koordiniert 1 Auftrag fuer dich"),
	projectLeadStatusActiveMany: (count: number): string =>
		// allow-any-unicode-next-line
		localize('keel.project.coordinator.status.active.many', "Koordiniert {0} Auftraege fuer dich", String(count)),
	projectLeadStatusWaitingOne: (): string =>
		// allow-any-unicode-next-line
		localize('keel.project.coordinator.status.waiting.one', "Wartet auf deine Freigabe bei 1 Auftrag"),
	projectLeadStatusWaitingMany: (count: number): string =>
		// allow-any-unicode-next-line
		localize('keel.project.coordinator.status.waiting.many', "Wartet auf deine Freigabe bei {0} Auftraegen", String(count)),
	projectLeadAggregateActive: (count: number): string =>
		localize('keel.project.coordinator.aggregate.active', "{0} aktiv", String(count)),
	projectLeadAggregateWaiting: (count: number): string =>
		// allow-any-unicode-next-line
		localize('keel.project.coordinator.aggregate.waiting', "{0} wartet", String(count)),

	// --- Sub-Task-Zone (Welle 9) ---
	subTaskZoneChip: (): string => localize('keel.project.subtaskZone.chip', "Auftraege"),
	subTaskZoneChipAria: (): string =>
		// allow-any-unicode-next-line
		localize('keel.project.subtaskZone.chip.aria', "Auftraege vom Projektleiter"),

	// --- Queue-Indicator ---
	// allow-any-unicode-next-line
	queueIndicator: (count: number): string => localize('keel.cockpit.queue.indicator', "{0} warten", String(count)),
	queueTooltip: (): string =>
		// allow-any-unicode-next-line
		localize('keel.cockpit.queue.tooltip', "Diese Auftraege starten, sobald ein Platz frei wird."),

	// --- Empty-State ---
	emptyTitle: (): string =>
		// allow-any-unicode-next-line
		localize('keel.cockpit.empty.title', "Hier ist's gerade ruhig."),
	emptySubtitle: (): string =>
		// allow-any-unicode-next-line
		localize('keel.cockpit.empty.subtitle', "Starte einen Auftrag, dann geht es los."),
	emptyCta: (): string => localize('keel.cockpit.empty.cta', "+ Neuer Auftrag"),

	// --- TaskCard Phase-Labels (alle Verben!) ---
	cardPhase1: (): string => localize('keel.cockpit.card.phase.1', "Verstehe Auftrag"),
	cardPhase2: (): string => localize('keel.cockpit.card.phase.2', "Erstelle Plan"),
	cardPhase3: (): string =>
		// allow-any-unicode-next-line
		localize('keel.cockpit.card.phase.3', "Warte auf Freigabe"),
	cardPhase4: (): string => localize('keel.cockpit.card.phase.4', "Arbeite..."),
	cardPhaseCounter: (current: number): string =>
		localize('keel.cockpit.card.phase.counter', "Phase {0} von 4", String(current)),

	// --- TaskCard Live-Hints pro Phase ---
	cardPhase1Hint: (): string =>
		// allow-any-unicode-next-line
		localize('keel.cockpit.card.phase1.hint', "Ich lese deinen Auftrag..."),
	cardPhase2Hint: (): string =>
		localize('keel.cockpit.card.phase2.hint', "Ich erstelle einen Plan..."),
	cardPhase3Hint: (): string =>
		// allow-any-unicode-next-line
		localize('keel.cockpit.card.phase3.hint', "Dein Plan ist fertig. Schau ihn dir an, bevor ich loslege."),
	cardPhase4Hint: (): string => localize('keel.cockpit.card.phase4.hint', "Ich arbeite..."),

	// --- TaskCard State-Titel ---
	cardCompletedTitle: (): string => localize('keel.cockpit.card.completed.title', "Geschafft"),
	cardFailedTitle: (): string =>
		localize('keel.cockpit.card.failed.title', "Etwas ist schiefgelaufen"),
	cardPausedTitle: (): string => localize('keel.cockpit.card.paused.title', "Pausiert"),
	cardFailedHint: (): string =>
		// allow-any-unicode-next-line
		localize('keel.cockpit.card.failed.hint', "Schau in die Details - dann entscheidest du, ob wir es nochmal probieren."),

	// --- TaskCard Fusszeile ---
	cardStartedAt: (time: string): string =>
		localize('keel.cockpit.card.startedAt', "Gestartet um {0}", time),
	cardDuration: (start: string, end: string): string =>
		localize('keel.cockpit.card.duration', "{0} - {1}", start, end),

	// --- TaskCard Buttons ---
	cardButtonPause: (): string => localize('keel.cockpit.card.button.pause', "Pause"),
	cardButtonResume: (): string => localize('keel.cockpit.card.button.resume', "Fortsetzen"),
	cardButtonStop: (): string => localize('keel.cockpit.card.button.stop', "Stop"),
	cardButtonReview: (): string => localize('keel.cockpit.card.button.review', "Plan ansehen"),
	cardButtonRetry: (): string =>
		localize('keel.cockpit.card.button.retry', "Noch einmal versuchen"),
	cardButtonOpen: (): string =>
		// allow-any-unicode-next-line
		localize('keel.cockpit.card.button.open', "Oeffnen"),
	cardButtonExport: (): string =>
		localize('keel.cockpit.card.button.export', "Exportieren"),

	// --- TaskCard Menue ---
	cardMenuAudit: (): string =>
		localize('keel.cockpit.card.menu.audit', "Als Audit exportieren"),
	cardMenuArchive: (): string => localize('keel.cockpit.card.menu.archive', "Archivieren"),
	cardMenuRename: (): string => localize('keel.cockpit.card.menu.rename', "Umbenennen"),
	cardMenuRetry: (): string => localize('keel.cockpit.card.menu.retry', "Erneut starten"),
	cardMenuAriaLabel: (title: string): string =>
		// allow-any-unicode-next-line
		localize('keel.cockpit.card.menu.ariaLabel', "Weitere Aktionen fuer {0}", title),
	cardCloseAriaLabel: (title: string): string =>
		// allow-any-unicode-next-line
		localize('keel.cockpit.card.close.ariaLabel', "Karte {0} schliessen", title),
	cardCloseDisabledTooltip: (): string =>
		// allow-any-unicode-next-line
		localize('keel.cockpit.card.close.disabledTooltip', "Erst beenden"),

	// --- Stop-Confirm-Toast ---
	cardStopConfirm: (): string =>
		// allow-any-unicode-next-line
		localize('keel.cockpit.card.stop.confirm', "Diesen Auftrag wirklich stoppen? Fortschritt geht verloren."),
	cardStopYes: (): string => localize('keel.cockpit.card.stop.yes', "Stoppen"),
	cardStopNo: (): string =>
		localize('keel.cockpit.card.stop.no', "Weiterlaufen lassen"),

	// --- Coming-Soon-Stubs (MVP: echte Action-Logik folgt in Welle B) ---
	cardPauseComingSoon: (): string =>
		// allow-any-unicode-next-line
		localize('keel.cockpit.card.pause.comingSoon', "Pause-Funktion kommt in einer spaeteren Version."),
	cardResumeComingSoon: (): string =>
		// allow-any-unicode-next-line
		localize('keel.cockpit.card.resume.comingSoon', "Fortsetzen-Funktion kommt in einer spaeteren Version."),
	cardOpenComingSoon: (): string =>
		// allow-any-unicode-next-line
		localize('keel.cockpit.card.open.comingSoon', "Oeffnen-Funktion kommt in einer spaeteren Version."),
	cardExportComingSoon: (): string =>
		// allow-any-unicode-next-line
		localize('keel.cockpit.card.export.comingSoon', "Export-Funktion kommt in einer spaeteren Version."),
	cardRetryComingSoon: (): string =>
		// allow-any-unicode-next-line
		localize('keel.cockpit.card.retry.comingSoon', "Retry-Funktion kommt in einer spaeteren Version."),
	cardStopComingSoon: (): string =>
		// allow-any-unicode-next-line
		localize('keel.cockpit.card.stop.comingSoon', "Stop-Funktion kommt in einer spaeteren Version."),
	cardFailedDetailsLabel: (): string =>
		localize('keel.cockpit.card.failed.details.label', "Details ansehen"),
	cardFailedDetailsComingSoon: (): string =>
		// allow-any-unicode-next-line
		localize('keel.cockpit.card.failed.details.comingSoon', "Fehler-Details werden in einer spaeteren Version angezeigt."),

	// --- PlanReviewSheet ---
	reviewSheetTitle: (taskTitle: string): string =>
		localize('keel.cockpit.review.sheet.title', "Plan: {0}", taskTitle),
	reviewSectionApproach: (): string =>
		localize('keel.cockpit.review.section.approach', "Ansatz"),
	reviewSectionSteps: (): string => localize('keel.cockpit.review.section.steps', "Schritte"),
	reviewSectionDeliverable: (): string =>
		localize('keel.cockpit.review.section.deliverable', "Was ich dir liefere"),
	reviewSectionHints: (): string =>
		localize('keel.cockpit.review.section.hints', "Hinweise"),
	reviewRemember: (): string =>
		// allow-any-unicode-next-line
		localize('keel.cockpit.review.remember', "Aehnliche Auftraege zukuenftig ohne Freigabe starten"),
	reviewButtonApprove: (): string => localize('keel.cockpit.review.button.approve', "Loslegen"),
	reviewButtonChanges: (): string =>
		// allow-any-unicode-next-line
		localize('keel.cockpit.review.button.changes', "Aendern..."),
	reviewButtonCancel: (): string => localize('keel.cockpit.review.button.cancel', "Abbrechen"),
	reviewChangesPlaceholder: (): string =>
		// allow-any-unicode-next-line
		localize('keel.cockpit.review.changes.placeholder', "Was soll der Plan anders machen?"),
	reviewChangesSubmit: (): string =>
		localize('keel.cockpit.review.changes.submit', "Senden"),
	reviewChangesBack: (): string =>
		// allow-any-unicode-next-line
		localize('keel.cockpit.review.changes.back', "Zurueck"),
	reviewCloseAriaLabel: (): string =>
		// allow-any-unicode-next-line
		localize('keel.cockpit.review.close.ariaLabel', "Plan-Ansicht schliessen"),

	// --- NewTaskSheet ---
	newTaskPlaceholder: (): string =>
		localize('keel.cockpit.newTask.placeholder', "Beschreibe deinen neuen Auftrag..."),
	newTaskSubmit: (): string => localize('keel.cockpit.newTask.submit', "Starten"),
	newTaskCancel: (): string => localize('keel.cockpit.newTask.cancel', "Abbrechen"),

	// --- Export-Success ---
	cardExportSuccess: (path: string): string =>
		localize('keel.cockpit.card.export.success', "Export gespeichert unter {0}.", path),

	// --- Editor-Name / Container / Command ---
	editorName: (): string => localize('keel.cockpit.editor.name', "Cockpit"),
	containerAriaLabel: (): string =>
		localize('keel.cockpit.container.ariaLabel', "Keel Cockpit"),
	// allow-any-unicode-next-line
	showCommandTitle: (): string => localize('keel.cockpit.command.show', "Cockpit öffnen"),
};
