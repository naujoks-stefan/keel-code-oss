/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { InstantiationType, registerSingleton } from '../../../platform/instantiation/common/extensions.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../platform/storage/common/storage.js';
import { keelCockpitStrings } from './strings/keelCockpitStrings.js';

/**
 * Storage-Key fuer das serialisierte Projekt-State-Objekt. Mandantengleich
 * angelegt mit `keel.welcome.*` und `keel.cockpit.*`.
 */
const KEEL_PROJECTS_STORAGE_KEY = 'keel.projects.state';

/**
 * Datenklasse eines Projekts. Kein Verhalten, nur serialisierbare Felder.
 *
 * Ein Projekt ist im MVP ein reiner Kontext-Bracket ohne Ordner/Filesystem-
 * Bindung. Name ist der einzige veraenderliche Anteil.
 */
export interface IProject {
	readonly id: string;
	readonly name: string;
	readonly createdAt: number;
}

/**
 * Oeffentliche API des Projekt-Service. MVP beschraenkt sich auf ein einziges
 * aktives Projekt - die Multi-Projekt-Erweiterung (listProjects, switchProject,
 * createProject) folgt in Welle 10.
 */
export interface IKeelProjectService {
	readonly _serviceBrand: undefined;

	/**
	 * Liefert das aktuell aktive Projekt. Garantie: es gibt IMMER ein aktives
	 * Projekt - wenn noch keins existiert, wird das Default-Projekt angelegt
	 * und zurueckgegeben.
	 */
	getActiveProject(): IProject;

	/**
	 * Benennt ein existierendes Projekt um. Name wird getrimmt und auf 40
	 * Zeichen gekappt. Leerer Name wird abgelehnt.
	 */
	renameProject(id: string, newName: string): Promise<void>;

	/**
	 * Event, das bei jeder Aenderung am aktiven Projekt feuert (z.B. Rename).
	 * Konsumenten re-rendern danach.
	 */
	readonly onActiveProjectChanged: Event<IProject>;
}

export const IKeelProjectService = createDecorator<IKeelProjectService>('keelProjectService');

/**
 * Serialisierungs-Format im Storage. MVP haelt nur ein aktives Projekt - das
 * Feld `activeProjectId` ist redundant fuer ein einzelnes Projekt, bereitet
 * aber die spaetere Multi-Projekt-Erweiterung vor.
 */
interface IProjectsStorageState {
	readonly projects: ReadonlyArray<IProject>;
	readonly activeProjectId: string;
}

/**
 * MVP-Implementierung des Projekt-Service.
 *
 * Der Service persistiert ueber `IStorageService` mit
 * `StorageScope.APPLICATION` + `StorageTarget.USER`. Beim ersten Start wird
 * implicit ein Default-Projekt mit Name aus `project.default.name` angelegt
 * (Zero-Config-Prinzip, keine Dialoge).
 */
export class KeelProjectService extends Disposable implements IKeelProjectService {

	declare readonly _serviceBrand: undefined;

	private readonly _onActiveProjectChanged = this._register(new Emitter<IProject>());
	readonly onActiveProjectChanged: Event<IProject> = this._onActiveProjectChanged.event;

	private state: IProjectsStorageState;

	constructor(
		@IStorageService private readonly storageService: IStorageService,
	) {
		super();
		this.state = this.loadOrSeed();
	}

	getActiveProject(): IProject {
		const active = this.state.projects.find(p => p.id === this.state.activeProjectId);
		if (active) {
			return active;
		}
		// Defensive: Storage inkonsistent. Baue das Default neu auf und persistiere.
		const seeded = this.seedDefault();
		this.state = seeded;
		this.persist();
		return seeded.projects[0];
	}

	async renameProject(id: string, newName: string): Promise<void> {
		const trimmed = newName.trim().slice(0, 40);
		if (trimmed.length === 0) {
			return;
		}

		const updatedProjects = this.state.projects.map(p =>
			p.id === id ? { ...p, name: trimmed } : p,
		);
		this.state = {
			projects: updatedProjects,
			activeProjectId: this.state.activeProjectId,
		};
		this.persist();

		const active = this.state.projects.find(p => p.id === this.state.activeProjectId);
		if (active) {
			this._onActiveProjectChanged.fire(active);
		}
	}

	// --- intern ---

	private loadOrSeed(): IProjectsStorageState {
		const raw = this.storageService.get(
			KEEL_PROJECTS_STORAGE_KEY,
			StorageScope.APPLICATION,
		);

		if (raw) {
			try {
				const parsed = JSON.parse(raw) as IProjectsStorageState;
				if (
					parsed &&
					Array.isArray(parsed.projects) &&
					parsed.projects.length > 0 &&
					typeof parsed.activeProjectId === 'string'
				) {
					return parsed;
				}
			} catch {
				// Storage korrupt - seed neu.
			}
		}

		const seeded = this.seedDefault();
		// Direkter Persist, damit der naechste Start keine erneute Anlage sieht.
		this.state = seeded;
		this.persist();
		return seeded;
	}

	private seedDefault(): IProjectsStorageState {
		const project: IProject = {
			id: generateUuid(),
			name: keelCockpitStrings.projectDefaultName(),
			createdAt: Date.now(),
		};
		return {
			projects: [project],
			activeProjectId: project.id,
		};
	}

	private persist(): void {
		this.storageService.store(
			KEEL_PROJECTS_STORAGE_KEY,
			JSON.stringify(this.state),
			StorageScope.APPLICATION,
			StorageTarget.USER,
		);
	}
}

registerSingleton(IKeelProjectService, KeelProjectService, InstantiationType.Delayed);
