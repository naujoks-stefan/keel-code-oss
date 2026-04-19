/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { createDecorator, IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { IEditorService } from '../../../workbench/services/editor/common/editorService.js';
import { InstantiationType, registerSingleton } from '../../../platform/instantiation/common/extensions.js';
import { IKeelCockpitTask } from '../common/keelCockpit.js';
import { KeelCockpitInput } from './keelCockpitInput.js';

/**
 * Oeffentliche API des Cockpits fuer andere Keel-Bereiche (z.B. Welcome-Submit,
 * Dev-C Dispatch-Integration).
 *
 * Die Implementierung im MVP ist ein Mock-Store mit drei Demo-Karten; Dev-C
 * tauscht sie spaeter gegen die echte DispatchEngine-Anbindung aus
 * `@keel/core` aus.
 */
export interface IKeelCockpitService {
	readonly _serviceBrand: undefined;

	/**
	 * Oeffnet den Cockpit-Editor in der aktuellen Editor-Gruppe. No-op, wenn
	 * bereits geoeffnet.
	 */
	openCockpit(): Promise<void>;

	/**
	 * Legt einen neuen Auftrag an. Im MVP: fuellt den Mock-Store und liefert
	 * die generierte Task-ID zurueck. Dev-C ersetzt die Implementierung spaeter
	 * durch einen echten Dispatch-Call.
	 *
	 * @param prompt Der Auftrags-Text des Users.
	 * @returns Die generierte Task-ID.
	 */
	addTask(prompt: string): Promise<string>;

	/**
	 * Liefert alle aktuell verfolgten Tasks (inkl. completed/failed/paused).
	 * Reihenfolge ist nicht garantiert - die View sortiert selbst nach
	 * `createdAt` aufsteigend.
	 */
	getTasks(): ReadonlyArray<IKeelCockpitTask>;

	/**
	 * Event, das nach jeder Store-Aenderung feuert. Die View subscribt sich und
	 * rendert neu.
	 */
	readonly onTasksChanged: Event<void>;
}

export const IKeelCockpitService = createDecorator<IKeelCockpitService>('keelCockpitService');

/**
 * MVP-Implementierung des Cockpit-Service.
 *
 * Verwaltet einen In-Memory-Task-Store mit drei Demo-Karten (Seed), die in drei
 * verschiedenen Phasen liegen - das ist der Marketing-Must fuer spaetere
 * Screenshots/GIFs. Siehe `seedDemoTasks()`.
 *
 * `addTask()` legt eine neue Karte in Phase 1 an. Ein echter Phasen-Wechsel
 * findet aktuell NICHT statt - das ist Aufgabe von Dev-B (`@keel/core`).
 */
export class KeelCockpitService extends Disposable implements IKeelCockpitService {

	declare readonly _serviceBrand: undefined;

	private readonly _onTasksChanged = this._register(new Emitter<void>());
	readonly onTasksChanged: Event<void> = this._onTasksChanged.event;

	private readonly tasks: Map<string, IKeelCockpitTask> = new Map();

	/**
	 * Markierung, ob bereits eine echte User-Task angelegt wurde. Beim ersten
	 * echten `addTask()`-Aufruf werden die Demo-Seed-Karten entfernt, damit
	 * das Cockpit nach dem Welcome-Submit nicht ueberladen wirkt. Die
	 * Demo-Karten existieren nur, damit ein direkt aufgerufenes Cockpit
	 * (ohne Welcome-Sprung) nicht gaehnend leer ist.
	 */
	private hasRealTaskBeenAdded: boolean = false;

	constructor(
		@IEditorService private readonly editorService: IEditorService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
	) {
		super();
		this.seedDemoTasks();
	}

	async openCockpit(): Promise<void> {
		const input = this.instantiationService.createInstance(KeelCockpitInput, {});
		await this.editorService.openEditor(input, { pinned: true });
	}

	async addTask(prompt: string): Promise<string> {
		// Erster echter Auftrag: Demo-Seed entfernen, damit der User nicht
		// Demo-Karten neben seiner echten Task sieht. Ab dann bleibt der
		// Store ausschliesslich durch echte Tasks gefuellt.
		if (!this.hasRealTaskBeenAdded) {
			this.clearDemoTasks();
			this.hasRealTaskBeenAdded = true;
		}

		const id = generateUuid();
		const title = prompt.length > 60 ? `${prompt.slice(0, 60)}...` : prompt;
		const task: IKeelCockpitTask = {
			id,
			title,
			status: 'running',
			phase: 1,
			createdAt: new Date(),
			progressText: undefined,
			currentOutput: prompt,
			resultSummary: undefined,
			resultArtifact: undefined,
			projectLabel: undefined,
		};
		this.tasks.set(id, task);
		this._onTasksChanged.fire();
		return id;
	}

	/**
	 * Entfernt die Demo-Seed-Karten aus dem Store. Wird beim ersten echten
	 * `addTask()`-Aufruf getriggert. Kein Event-Fire hier - der Caller
	 * (`addTask`) emittiert direkt danach sowieso.
	 */
	private clearDemoTasks(): void {
		this.tasks.delete('demo-1');
		this.tasks.delete('demo-2');
		this.tasks.delete('demo-3');
	}

	getTasks(): ReadonlyArray<IKeelCockpitTask> {
		return Array.from(this.tasks.values()).sort(
			(a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
		);
	}

	/**
	 * TODO(marketing): seed demo 3 phases.
	 *
	 * Laedt drei Demo-Karten in DREI verschiedenen Phasen (Laeuft Phase 2,
	 * Warte auf Freigabe Phase 3, Arbeite Phase 4). Die dritte Karte in
	 * `waiting-for-review` bekommt in der View das Scale-Lift-Styling (USP).
	 *
	 * In Produktion (Dev-C) wird dieser Seed entfernt - dann kommen die
	 * Tasks echt aus dem DispatchEngine-Store.
	 */
	private seedDemoTasks(): void {
		const now = Date.now();

		const t1: IKeelCockpitTask = {
			id: 'demo-1',
			title: 'Monatsbericht Vertrieb',
			status: 'running',
			phase: 2,
			createdAt: new Date(now - 5 * 60_000),
			progressText: undefined,
			// allow-any-unicode-next-line
			currentOutput: '1. Lese Umsatz-Tabelle aus Q1 2026\n2. Extrahiere Top-5-Kunden\n3. ...',
			resultSummary: undefined,
			resultArtifact: undefined,
			projectLabel: undefined,
		};

		const t2: IKeelCockpitTask = {
			id: 'demo-2',
			// allow-any-unicode-next-line
			title: 'Angebot pruefen',
			status: 'waiting-for-review',
			phase: 3,
			createdAt: new Date(now - 4 * 60_000),
			progressText: undefined,
			currentOutput: undefined,
			resultSummary: undefined,
			resultArtifact: undefined,
			projectLabel: undefined,
		};

		const t3: IKeelCockpitTask = {
			id: 'demo-3',
			title: 'Meeting-Vorbereitung',
			status: 'running',
			phase: 4,
			createdAt: new Date(now - 3 * 60_000),
			// allow-any-unicode-next-line
			progressText: 'Schritt 2 von 5: Agenda zusammenstellen',
			currentOutput: undefined,
			resultSummary: undefined,
			resultArtifact: undefined,
			projectLabel: undefined,
		};

		this.tasks.set(t1.id, t1);
		this.tasks.set(t2.id, t2);
		this.tasks.set(t3.id, t3);
	}
}

registerSingleton(IKeelCockpitService, KeelCockpitService, InstantiationType.Delayed);
