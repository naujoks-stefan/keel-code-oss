/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable, IDisposable, toDisposable } from '../../../base/common/lifecycle.js';
import {
	IChatAgent,
	IChatAgentCompletionItem,
	IChatAgentData,
	IChatAgentHistoryEntry,
	IChatAgentImplementation,
	IChatAgentInvocationEvent,
	IChatAgentMetadata,
	IChatAgentRequest,
	IChatAgentResult,
	IChatAgentService,
	IChatParticipantDetectionProvider,
	UserSelectedTools,
} from '../../../workbench/contrib/chat/common/participants/chatAgents.js';
import { IChatFollowup, IChatProgress } from '../../../workbench/contrib/chat/common/chatService/chatService.js';
import { ChatAgentLocation, ChatModeKind } from '../../../workbench/contrib/chat/common/constants.js';

/**
 * No-Op-Stub fuer `IChatAgentService`.
 *
 * Wird als Ersatz fuer die deaktivierte VSCode-ChatAgentService-Registrierung
 * (D-013) eingesetzt. Alle Methoden liefern Default-Werte und haben keine
 * Seiten-Effekte. Events sind registriert, feuern aber nie.
 *
 * @invariant Keel-Stub - implementiert Interface vollstaendig, tut nichts.
 */
export class KeelChatAgentServiceStub extends Disposable implements IChatAgentService {

	declare readonly _serviceBrand: undefined;

	private readonly _onDidChangeAgents = this._register(new Emitter<IChatAgent | undefined>());
	readonly onDidChangeAgents: Event<IChatAgent | undefined> = this._onDidChangeAgents.event;

	private readonly _onWillInvokeAgent = this._register(new Emitter<IChatAgentInvocationEvent>());
	readonly onWillInvokeAgent: Event<IChatAgentInvocationEvent> = this._onWillInvokeAgent.event;

	readonly hasToolsAgent: boolean = false;

	registerAgent(_id: string, _data: IChatAgentData): IDisposable {
		return toDisposable(() => { /* no-op */ });
	}

	registerAgentImplementation(_id: string, _agent: IChatAgentImplementation): IDisposable {
		return toDisposable(() => { /* no-op */ });
	}

	registerDynamicAgent(_data: IChatAgentData, _agentImpl: IChatAgentImplementation): IDisposable {
		return toDisposable(() => { /* no-op */ });
	}

	registerAgentCompletionProvider(
		_id: string,
		_provider: (query: string, token: CancellationToken) => Promise<IChatAgentCompletionItem[]>,
	): IDisposable {
		return toDisposable(() => { /* no-op */ });
	}

	async getAgentCompletionItems(
		_id: string,
		_query: string,
		_token: CancellationToken,
	): Promise<IChatAgentCompletionItem[]> {
		return [];
	}

	registerChatParticipantDetectionProvider(
		_handle: number,
		_provider: IChatParticipantDetectionProvider,
	): IDisposable {
		return toDisposable(() => { /* no-op */ });
	}

	async detectAgentOrCommand(
		_request: IChatAgentRequest,
		_history: IChatAgentHistoryEntry[],
		_options: { location: ChatAgentLocation },
		_token: CancellationToken,
	): Promise<undefined> {
		return undefined;
	}

	hasChatParticipantDetectionProviders(): boolean {
		return false;
	}

	async invokeAgent(
		agent: string,
		_request: IChatAgentRequest,
		_progress: (parts: IChatProgress[]) => void,
		_history: IChatAgentHistoryEntry[],
		_token: CancellationToken,
	): Promise<IChatAgentResult> {
		// Auch wenn nie aufgerufen: liefern ein leeres Error-Result, damit aufrufende
		// Komponenten nicht explodieren, sondern eine klare Fehler-Anzeige bekommen.
		return {
			errorDetails: {
				message: `Keel chat-stub: kein Agent "${agent}" verfuegbar.`,
			},
		};
	}

	setRequestTools(_agent: string, _requestId: string, _tools: UserSelectedTools): void {
		/* no-op */
	}

	setYieldRequested(_agent: string, _requestId: string, _value: boolean): void {
		/* no-op */
	}

	async getFollowups(
		_id: string,
		_request: IChatAgentRequest,
		_result: IChatAgentResult,
		_history: IChatAgentHistoryEntry[],
		_token: CancellationToken,
	): Promise<IChatFollowup[]> {
		return [];
	}

	async getChatTitle(
		_id: string,
		_history: IChatAgentHistoryEntry[],
		_token: CancellationToken,
	): Promise<string | undefined> {
		return undefined;
	}

	async getChatSummary(
		_id: string,
		_history: IChatAgentHistoryEntry[],
		_token: CancellationToken,
	): Promise<string | undefined> {
		return undefined;
	}

	getAgent(_id: string, _includeDisabled?: boolean): IChatAgentData | undefined {
		return undefined;
	}

	getAgentByFullyQualifiedId(_id: string): IChatAgentData | undefined {
		return undefined;
	}

	getAgents(): IChatAgentData[] {
		return [];
	}

	getActivatedAgents(): Array<IChatAgent> {
		return [];
	}

	getAgentsByName(_name: string): IChatAgentData[] {
		return [];
	}

	agentHasDupeName(_id: string): boolean {
		return false;
	}

	getDefaultAgent(_location: ChatAgentLocation, _mode?: ChatModeKind): IChatAgent | undefined {
		return undefined;
	}

	getContributedDefaultAgent(_location: ChatAgentLocation): IChatAgentData | undefined {
		return undefined;
	}

	updateAgent(_id: string, _updateMetadata: IChatAgentMetadata): void {
		/* no-op */
	}
}
