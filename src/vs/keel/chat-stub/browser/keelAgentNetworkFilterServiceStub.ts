/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { IAgentNetworkFilterService } from '../../../platform/networkFilter/common/networkFilterService.js';

/**
 * No-Op-Stub fuer `IAgentNetworkFilterService`.
 *
 * Wird als Ersatz fuer die deaktivierte VSCode-AgentNetworkFilterService-Registrierung
 * (D-013) eingesetzt. Da das Chat-System deaktiviert ist, werden keine Agent-Netzwerk-
 * Requests erwartet. Dieser Stub laesst alle URIs passieren, damit die verbleibenden
 * Consumer (browserView-Tools) nicht crashen - sie koennen jedoch ohnehin nicht
 * aufgerufen werden, solange kein Chat-Agent aktiv ist.
 *
 * @invariant Keel-Stub - implementiert Interface vollstaendig, tut nichts.
 */
export class KeelAgentNetworkFilterServiceStub extends Disposable implements IAgentNetworkFilterService {

	declare readonly _serviceBrand: undefined;

	private readonly _onDidChange = this._register(new Emitter<void>());
	readonly onDidChange: Event<void> = this._onDidChange.event;

	isUriAllowed(_uri: URI): boolean {
		// Keel-Stub: kein aktiver Netz-Filter. Im Chat-losen Zustand nicht sicherheits-
		// relevant, da kein Agent hier tatsaechlich Requests absetzt.
		return true;
	}

	formatError(_uri: URI): string {
		return 'Keel chat-stub: Netzwerk-Filter nicht aktiv.';
	}
}
