/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { InstantiationType, registerSingleton } from '../../../platform/instantiation/common/extensions.js';
import { IKeelCockpitService } from './keelCockpitService.js';
import { IKeelProjectService } from './keelProjectService.js';

/**
 * Zustand des Projektleiters als Projektion ueber die Task-Liste.
 *
 * - `idle`    - keine Tasks
 * - `waiting` - mindestens eine Task in `waiting-for-review`
 * - `active`  - Tasks aktiv, keine wartet auf Freigabe
 *
 * Der Projektleiter bleibt ruhig: `failed`-Tasks veraendern den Status NICHT
 * (Marketing-Must: Keel/Projektleiter strahlt Ruhe aus, Sub-Tasks tragen
 * Probleme). Diese Entscheidung ist aus der Designer-Spec uebernommen.
 */
export type ProjectLeadState = 'idle' | 'active' | 'waiting';

/**
 * Aggregat-Status des Projektleiters fuer ein Projekt. Reine Projektion
 * ueber den bestehenden Task-Store - keine eigene Persistenz.
 */
export interface IProjectLeadStatus {
	readonly projectId: string;
	readonly state: ProjectLeadState;
	/** Gesamt-Zahl aller verfolgten Tasks (running + waiting). Ohne failed/paused/completed. */
	readonly subTaskCount: number;
	/** Zahl der Tasks, die aktuell aktiv koordiniert werden (running). */
	readonly activeSubTaskCount: number;
	/** Zahl der Tasks in `waiting-for-review`. */
	readonly waitingSubTaskCount: number;
}

/**
 * Oeffentliche API des Projektleiter-Service.
 *
 * Der Service ist eine reine Projektion ueber `IKeelCockpitService`. MVP hat
 * keine eigene Koordinations-Logik - in v2 wird er durch einen echten
 * Koordinator-Agent ersetzt (analog keel-ai-Vault).
 */
export interface IKeelProjectLeadService {
	readonly _serviceBrand: undefined;

	/**
	 * Liefert den aktuellen Status fuer das aktive Projekt.
	 */
	getStatus(): IProjectLeadStatus;

	/**
	 * Event, das bei jeder Status-Aenderung feuert. Die View subscribt sich
	 * und rendert die Projektleiter-Karte neu.
	 */
	readonly onStatusChanged: Event<IProjectLeadStatus>;
}

export const IKeelProjectLeadService = createDecorator<IKeelProjectLeadService>('keelProjectLeadService');

/**
 * MVP-Implementierung des Projektleiter-Service.
 *
 * Abonniert `IKeelCockpitService.onTasksChanged` und `IKeelProjectService.
 * onActiveProjectChanged`, berechnet daraus den Aggregat-Status und feuert
 * `onStatusChanged` bei jeder Veraenderung.
 */
export class KeelProjectLeadService extends Disposable implements IKeelProjectLeadService {

	declare readonly _serviceBrand: undefined;

	private readonly _onStatusChanged = this._register(new Emitter<IProjectLeadStatus>());
	readonly onStatusChanged: Event<IProjectLeadStatus> = this._onStatusChanged.event;

	private lastStatus: IProjectLeadStatus;

	constructor(
		@IKeelCockpitService private readonly cockpitService: IKeelCockpitService,
		@IKeelProjectService private readonly projectService: IKeelProjectService,
	) {
		super();
		this.lastStatus = this.computeStatus();

		this._register(this.cockpitService.onTasksChanged(() => this.refresh()));
		this._register(this.projectService.onActiveProjectChanged(() => this.refresh()));
	}

	getStatus(): IProjectLeadStatus {
		return this.lastStatus;
	}

	// --- intern ---

	private refresh(): void {
		const next = this.computeStatus();
		if (this.statusEquals(next, this.lastStatus)) {
			return;
		}
		this.lastStatus = next;
		this._onStatusChanged.fire(next);
	}

	private computeStatus(): IProjectLeadStatus {
		const project = this.projectService.getActiveProject();
		const tasks = this.cockpitService.getTasks();

		let active = 0;
		let waiting = 0;
		for (const task of tasks) {
			if (task.status === 'running') {
				active += 1;
			} else if (task.status === 'waiting-for-review') {
				waiting += 1;
			}
		}

		const subTaskCount = active + waiting;

		let state: ProjectLeadState;
		if (subTaskCount === 0) {
			state = 'idle';
		} else if (waiting > 0) {
			state = 'waiting';
		} else {
			state = 'active';
		}

		return {
			projectId: project.id,
			state,
			subTaskCount,
			activeSubTaskCount: active,
			waitingSubTaskCount: waiting,
		};
	}

	private statusEquals(a: IProjectLeadStatus, b: IProjectLeadStatus): boolean {
		return (
			a.projectId === b.projectId &&
			a.state === b.state &&
			a.subTaskCount === b.subTaskCount &&
			a.activeSubTaskCount === b.activeSubTaskCount &&
			a.waitingSubTaskCount === b.waitingSubTaskCount
		);
	}
}

registerSingleton(IKeelProjectLeadService, KeelProjectLeadService, InstantiationType.Delayed);
