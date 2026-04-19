/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../base/common/lifecycle.js';
import {
	InstantiationType,
	registerSingleton,
} from '../../../platform/instantiation/common/extensions.js';
import { INotificationService, Severity } from '../../../platform/notification/common/notification.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { localize } from '../../../nls.js';
import {
	IKeelCommandBlacklistService,
	KEEL_COMMAND_BLACKLIST,
	KEEL_COMMAND_BLACKLIST_PREFIXES,
	KEEL_COMMAND_WHITELIST_PREFIX,
} from '../common/keelCommandGuard.js';
// Re-Export, damit Consumer weiterhin aus `browser/keelCommandBlacklistService`
// importieren koennen (Stabilitaet gegen Service-Lookup-Pfade in Tests).
export { IKeelCommandBlacklistService };

/**
 * Default-Implementation fuer den Keel-Command-Blacklist-Service (Welle 12,
 * D-033).
 *
 * Der Service beantwortet die Frage "darf dieser Command ausgefuehrt
 * werden?". Er ist bewusst minimal — ein reiner Predicate-Service — und
 * zeigt bei Blockierung einen Otto-tauglichen Toast an.
 *
 * Integration: Der Upstream-`CommandService` ruft `isAllowed(id)` als
 * erste Zeile in `executeCommand(id, ...args)`. Bei `false` wird die
 * Ausfuehrung abgebrochen und `notifyBlocked(id)` getriggert.
 *
 * Negativ-Fall-Test: `keel.*`-Commands werden NIE blockiert, auch wenn
 * sie aus Versehen auf der Blacklist landen.
 */
export class KeelCommandBlacklistService extends Disposable implements IKeelCommandBlacklistService {
	declare readonly _serviceBrand: undefined;

	private readonly blacklistSet: ReadonlySet<string>;

	constructor(
		@INotificationService private readonly notificationService: INotificationService,
		@ILogService private readonly logService: ILogService,
	) {
		super();
		this.blacklistSet = new Set(KEEL_COMMAND_BLACKLIST);
	}

	isAllowed(commandId: string): boolean {
		if (!commandId) {
			return true;
		}

		// Whitelist hat Vorrang vor Blacklist — `keel.*` darf nie blockiert
		// werden, auch wenn der Command aus Versehen im Blacklist-Set
		// landet.
		if (commandId.startsWith(KEEL_COMMAND_WHITELIST_PREFIX)) {
			return true;
		}

		if (this.blacklistSet.has(commandId)) {
			return false;
		}

		for (const prefix of KEEL_COMMAND_BLACKLIST_PREFIXES) {
			if (commandId.startsWith(prefix)) {
				return false;
			}
		}

		return true;
	}

	notifyBlocked(commandId: string): void {
		this.logService.trace(`[KeelCommandGuard] blockiert: ${commandId}`);
		this.notificationService.notify({
			severity: Severity.Info,
			message: localize('keel.commandGuard.blocked', "Dieser Kurzbefehl ist in Keel nicht belegt."),
		});
	}
}

registerSingleton(IKeelCommandBlacklistService, KeelCommandBlacklistService, InstantiationType.Delayed);
