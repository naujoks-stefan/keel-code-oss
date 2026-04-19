/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Gemeinsame Konstanten und Typen fuer das Keel-Cockpit.
 *
 * Diese Datei enthaelt nur Identifier und Datenklassen - keine Abhaengigkeiten zu
 * Workbench/Browser-APIs, damit sie unabhaengig importiert werden kann (z.B. von
 * Tests oder vom Core-Layer).
 */

/**
 * ID des Cockpit-EditorPane. Wird bei der Registry-Registrierung und zum
 * Identifizieren des Editors in Command-Handlern verwendet.
 */
export const KEEL_COCKPIT_EDITOR_ID = 'keel.cockpit.editor';

/**
 * Type-ID der EditorInput. Wird bei der Serializer-Registrierung genutzt.
 */
export const KEEL_COCKPIT_INPUT_TYPE_ID = 'keel.cockpit.input';

/**
 * Command-ID zum expliziten Oeffnen des Cockpits.
 */
export const KEEL_COCKPIT_SHOW_COMMAND_ID = 'keel.cockpit.show';

/**
 * URI-Authority fuer die Cockpit-Resource. Damit wird der Cockpit-Editor eindeutig
 * identifizierbar, ohne eine echte Datei-Resource zu benoetigen.
 */
export const KEEL_COCKPIT_RESOURCE_AUTHORITY = 'keel_cockpit';

/**
 * Maximale Anzahl parallel laufender Auftraege im Cockpit. Weitere Auftraege landen
 * in der Warteschlange (Queue) und werden vom Header-Indikator angezeigt.
 */
export const KEEL_COCKPIT_MAX_ACTIVE_TASKS = 4;

/**
 * Lebenszyklus-Status einer Auftrags-Karte.
 */
export type KeelCockpitTaskStatus =
	| 'running'
	| 'waiting-for-review'
	| 'completed'
	| 'failed'
	| 'paused';

/**
 * Phase einer laufenden Karte (1-4). Nur relevant solange `status` in
 * `'running' | 'waiting-for-review'` ist.
 *
 * Phase 1: Verstehe Auftrag
 * Phase 2: Erstelle Plan
 * Phase 3: Warte auf Freigabe
 * Phase 4: Arbeite...
 */
export type KeelCockpitTaskPhase = 1 | 2 | 3 | 4;

/**
 * Beschreibt das Ergebnis-Artefakt einer abgeschlossenen Karte.
 */
export interface IKeelCockpitTaskArtifact {
	readonly name: string;
	readonly sizeBytes: number;
	readonly kind: 'file' | 'text';
}

/**
 * Reine Datenklasse einer Auftrags-Karte. Kein Verhalten - nur Status.
 *
 * Die Karte wird vom Cockpit-View gerendert und ausschliesslich ueber den
 * `IKeelCockpitMockTaskStore` (MVP) bzw. den echten Dispatch-Store (ab Welle B)
 * geliefert.
 */
export interface IKeelCockpitTask {
	readonly id: string;
	readonly title: string;
	readonly status: KeelCockpitTaskStatus;
	readonly phase: KeelCockpitTaskPhase | undefined;
	readonly createdAt: Date;
	readonly progressText: string | undefined;
	readonly currentOutput: string | undefined;
	readonly resultSummary: string | undefined;
	readonly resultArtifact: IKeelCockpitTaskArtifact | undefined;
	readonly projectLabel: string | undefined;
}
