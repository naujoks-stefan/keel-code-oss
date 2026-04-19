/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancelablePromise, notCancellablePromise, raceCancellablePromises, timeout } from '../../../../base/common/async.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { CommandsRegistry, ICommandEvent, ICommandService } from '../../../../platform/commands/common/commands.js';
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
// Keel (D-033, Welle 12): Pre-Execute-Guard gegen Dev-Jargon-Commands.
// Import aus `common/`, damit der Layer-Check ok ist — Implementation
// liegt in `browser/` und wird per Side-Effect-Import im workbench.common.
// main.ts-Bootstrap registriert. Der Lookup ist optional-tolerant (falls
// der Service in einem Kontext nicht registriert ist, greift der Guard
// nicht).
import { IKeelCommandBlacklistService } from '../../../../keel/commandGuard/common/keelCommandGuard.js';

export class CommandService extends Disposable implements ICommandService {

	declare readonly _serviceBrand: undefined;

	private _extensionHostIsReady: boolean = false;
	private _starActivation: CancelablePromise<void> | null;

	private readonly _onWillExecuteCommand: Emitter<ICommandEvent> = this._register(new Emitter<ICommandEvent>());
	public readonly onWillExecuteCommand: Event<ICommandEvent> = this._onWillExecuteCommand.event;

	private readonly _onDidExecuteCommand = this._register(new Emitter<ICommandEvent>());
	public readonly onDidExecuteCommand: Event<ICommandEvent> = this._onDidExecuteCommand.event;

	constructor(
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
		@IExtensionService private readonly _extensionService: IExtensionService,
		@ILogService private readonly _logService: ILogService
	) {
		super();
		this._extensionService.whenInstalledExtensionsRegistered().then(value => this._extensionHostIsReady = value);
		this._starActivation = null;
	}

	private _activateStar(): Promise<void> {
		if (!this._starActivation) {
			// wait for * activation, limited to at most 30s.
			this._starActivation = raceCancellablePromises([
				this._extensionService.activateByEvent(`*`),
				timeout(30000)
			]);
		}

		// This is wrapped with notCancellablePromise so it doesn't get cancelled
		// early because it is shared between consumers.
		return notCancellablePromise(this._starActivation);
	}

	async executeCommand<T>(id: string, ...args: unknown[]): Promise<T> {
		this._logService.trace('CommandService#executeCommand', id);

		// Keel (D-033, Welle 12): Command-Blacklist-Pre-Execute-Guard.
		// Der Guard ist optional-tolerant: wenn der Keel-Service nicht
		// registriert ist (z.B. in sessions-app-Kontexten oder in
		// isolierten Tests), passiert nichts — der Flow faellt zurueck
		// auf Upstream-Verhalten.
		if (this._keelCommandGuardBlocks(id)) {
			// Reject mit einem ruhigen Error, damit Aufrufer, die den
			// Promise handlen, keinen harten Crash sehen; die UI-Meldung
			// haelt der Blacklist-Service selbst hoch.
			return Promise.reject(new Error(`command '${id}' is blocked by Keel`)) as Promise<T>;
		}

		const activationEvent = `onCommand:${id}`;
		const commandIsRegistered = !!CommandsRegistry.getCommand(id);

		if (commandIsRegistered) {

			// if the activation event has already resolved (i.e. subsequent call),
			// we will execute the registered command immediately
			if (this._extensionService.activationEventIsDone(activationEvent)) {
				return this._tryExecuteCommand(id, args);
			}

			// if the extension host didn't start yet, we will execute the registered
			// command immediately and send an activation event, but not wait for it
			if (!this._extensionHostIsReady) {
				this._extensionService.activateByEvent(activationEvent); // intentionally not awaited
				return this._tryExecuteCommand(id, args);
			}

			// we will wait for a simple activation event (e.g. in case an extension wants to overwrite it)
			await this._extensionService.activateByEvent(activationEvent);
			return this._tryExecuteCommand(id, args);
		}

		// finally, if the command is not registered we will send a simple activation event
		// as well as a * activation event raced against registration and against 30s
		await Promise.all([
			this._extensionService.activateByEvent(activationEvent),
			raceCancellablePromises<unknown>([
				// race * activation against command registration
				this._activateStar(),
				Event.toPromise(Event.filter(CommandsRegistry.onDidRegisterCommand, e => e === id))
			]),
		]);

		return this._tryExecuteCommand(id, args);
	}

	private _tryExecuteCommand(id: string, args: unknown[]): Promise<any> {
		const command = CommandsRegistry.getCommand(id);
		if (!command) {
			return Promise.reject(new Error(`command '${id}' not found`));
		}
		try {
			this._onWillExecuteCommand.fire({ commandId: id, args });
			const result = this._instantiationService.invokeFunction(command.handler, ...args);
			this._onDidExecuteCommand.fire({ commandId: id, args });
			return Promise.resolve(result);
		} catch (err) {
			return Promise.reject(err);
		}
	}

	public override dispose(): void {
		super.dispose();
		this._starActivation?.cancel();
	}

	/**
	 * Keel (D-033, Welle 12): Liefert `true`, wenn der uebergebene Command
	 * vom `IKeelCommandBlacklistService` blockiert wird. Der Service wird
	 * optional-tolerant ueber den `IInstantiationService` gelookt — falls
	 * er nicht registriert ist, passiert nichts (Guard greift nicht).
	 *
	 * Bei Blockierung feuert der Service selbst den Otto-tauglichen Toast
	 * ("Dieser Kurzbefehl ist in Keel nicht belegt.").
	 */
	private _keelCommandGuardBlocks(id: string): boolean {
		try {
			// `invokeFunction` ist der einzige sichere Weg, einen optionalen
			// Service per Decorator zu erreichen. Fehler im Lookup (z.B.
			// wenn der Service nicht registriert ist) werden vom umgebenden
			// try/catch abgefangen.
			let blocked = false;
			this._instantiationService.invokeFunction(accessor => {
				const guard = accessor.get(IKeelCommandBlacklistService);
				if (guard.isAllowed(id)) {
					return;
				}
				blocked = true;
				guard.notifyBlocked(id);
			});
			return blocked;
		} catch {
			// Service nicht verfuegbar → Guard greift nicht, Upstream-Flow
			// laeuft wie gehabt.
			return false;
		}
	}
}

registerSingleton(ICommandService, CommandService, InstantiationType.Delayed);
