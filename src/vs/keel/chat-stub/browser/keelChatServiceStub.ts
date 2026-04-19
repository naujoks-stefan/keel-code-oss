/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { constObservable, IObservable } from '../../../base/common/observable.js';
import { URI } from '../../../base/common/uri.js';
import {
	ChatRequestQueueKind,
	ChatSendResult,
	IChatCompleteResponse,
	IChatDetail,
	IChatModelReference,
	IChatProgress,
	IChatQuestionAnswers,
	IChatSendRequestOptions,
	IChatSessionStartOptions,
	IChatService,
	IChatUserActionEvent,
} from '../../../workbench/contrib/chat/common/chatService/chatService.js';
import { IChatEditingSession } from '../../../workbench/contrib/chat/common/editing/chatEditingService.js';
import {
	IChatModel,
	IChatRequestModel,
	IChatRequestVariableData,
	IExportableChatData,
	ISerializableChatData,
} from '../../../workbench/contrib/chat/common/model/chatModel.js';
import type { IChatModelReferenceDebugSnapshot } from '../../../workbench/contrib/chat/common/model/chatModelStore.js';
import { IParsedChatRequest } from '../../../workbench/contrib/chat/common/requestParser/chatParserTypes.js';
import { ChatAgentLocation } from '../../../workbench/contrib/chat/common/constants.js';

/**
 * No-Op-Stub fuer `IChatService`.
 *
 * Wird als Ersatz fuer die deaktivierte VSCode-ChatService-Registrierung (D-013)
 * eingesetzt. Haelt keine Sessions, feuert nie Events, und lehnt Send-Requests ab.
 *
 * Methoden, die eine nicht-nullable Referenz zurueckgeben muessten (z.B.
 * `startNewLocalSession`), liefern einen Cast auf `null` - das ist akzeptabel,
 * weil im Stub-Szenario kein Aufrufer die Session tatsaechlich weiterverwendet
 * (alle ChatService-Consumer sind selbst Teil von Contributions, die wegen der
 * Service-Abhaengigkeit bereits im Stub-Modus laufen).
 *
 * @invariant Keel-Stub - implementiert Interface vollstaendig, tut nichts.
 */
export class KeelChatServiceStub extends Disposable implements IChatService {

	declare _serviceBrand: undefined;

	transferredSessionResource: URI | undefined = undefined;

	private readonly _onDidSubmitRequest = this._register(
		new Emitter<{ readonly chatSessionResource: URI; readonly message?: IParsedChatRequest }>(),
	);
	readonly onDidSubmitRequest = this._onDidSubmitRequest.event;

	private readonly _onDidCreateModel = this._register(new Emitter<IChatModel>());
	readonly onDidCreateModel: Event<IChatModel> = this._onDidCreateModel.event;

	readonly chatModels: IObservable<Iterable<IChatModel>> = constObservable<Iterable<IChatModel>>([]);

	readonly editingSessions: readonly IChatEditingSession[] = [];

	private readonly _onDidPerformUserAction = this._register(new Emitter<IChatUserActionEvent>());
	readonly onDidPerformUserAction: Event<IChatUserActionEvent> = this._onDidPerformUserAction.event;

	private readonly _onDidReceiveQuestionCarouselAnswer = this._register(
		new Emitter<{ requestId: string; resolveId: string; answers: IChatQuestionAnswers | undefined }>(),
	);
	readonly onDidReceiveQuestionCarouselAnswer = this._onDidReceiveQuestionCarouselAnswer.event;

	private readonly _onDidDisposeSession = this._register(
		new Emitter<{ readonly sessionResources: readonly URI[]; readonly reason: 'cleared' }>(),
	);
	readonly onDidDisposeSession = this._onDidDisposeSession.event;

	readonly requestInProgressObs: IObservable<boolean> = constObservable(false);

	isEnabled(_location: ChatAgentLocation): boolean {
		return false;
	}

	hasSessions(): boolean {
		return false;
	}

	startNewLocalSession(_location: ChatAgentLocation, _options?: IChatSessionStartOptions): IChatModelReference {
		// Keel-Stub: kein aktiver ChatService. Ein echter Aufrufer wuerde crashen,
		// aber kein Consumer im Stub-Modus ruft das auf.
		return null as unknown as IChatModelReference;
	}

	getSession(_sessionResource: URI): IChatModel | undefined {
		return undefined;
	}

	acquireExistingSession(_sessionResource: URI, _debugOwner?: string): IChatModelReference | undefined {
		return undefined;
	}

	async acquireOrLoadSession(
		_sessionResource: URI,
		_location: ChatAgentLocation,
		_token: CancellationToken,
		_debugOwner?: string,
	): Promise<IChatModelReference | undefined> {
		return undefined;
	}

	loadSessionFromData(
		_data: IExportableChatData | ISerializableChatData,
		_debugOwner?: string,
	): IChatModelReference {
		return null as unknown as IChatModelReference;
	}

	getChatModelReferenceDebugInfo(): IChatModelReferenceDebugSnapshot {
		return { totalModels: 0, totalReferences: 0, models: [] };
	}

	async sendRequest(
		_sessionResource: URI,
		_message: string,
		_options?: IChatSendRequestOptions,
	): Promise<ChatSendResult> {
		return { kind: 'rejected', reason: 'Keel chat-stub: kein ChatService aktiv.' };
	}

	getSessionTitle(_sessionResource: URI): string | undefined {
		return undefined;
	}

	setSessionTitle(_sessionResource: URI, _title: string): void {
		/* no-op */
	}

	appendProgress(_request: IChatRequestModel, _progress: IChatProgress): void {
		/* no-op */
	}

	async resendRequest(_request: IChatRequestModel, _options?: IChatSendRequestOptions): Promise<void> {
		/* no-op */
	}

	async adoptRequest(_sessionResource: URI, _request: IChatRequestModel): Promise<void> {
		/* no-op */
	}

	async removeRequest(_sessionResource: URI, _requestId: string): Promise<void> {
		/* no-op */
	}

	async cancelCurrentRequestForSession(_sessionResource: URI, _source?: string): Promise<void> {
		/* no-op */
	}

	migrateRequests(_originalResource: URI, _targetResource: URI): void {
		/* no-op */
	}

	setYieldRequested(_sessionResource: URI): void {
		/* no-op */
	}

	removePendingRequest(_sessionResource: URI, _requestId: string): void {
		/* no-op */
	}

	setPendingRequests(
		_sessionResource: URI,
		_requests: readonly { requestId: string; kind: ChatRequestQueueKind }[],
	): void {
		/* no-op */
	}

	processPendingRequests(_sessionResource: URI): void {
		/* no-op */
	}

	addCompleteRequest(
		_sessionResource: URI,
		_message: IParsedChatRequest | string,
		_variableData: IChatRequestVariableData | undefined,
		_attempt: number | undefined,
		_response: IChatCompleteResponse,
	): void {
		/* no-op */
	}

	setChatSessionTitle(_sessionResource: URI, _title: string): void {
		/* no-op */
	}

	async getLocalSessionHistory(): Promise<IChatDetail[]> {
		return [];
	}

	async clearAllHistoryEntries(): Promise<void> {
		/* no-op */
	}

	async removeHistoryEntry(_sessionResource: URI): Promise<void> {
		/* no-op */
	}

	getChatStorageFolder(): URI {
		// Keel-Stub: liefert eine synthetische URI, damit aufrufende Consumer nicht crashen.
		return URI.from({ scheme: 'keel-chat-stub', path: '/storage' });
	}

	logChatIndex(): void {
		/* no-op */
	}

	async getLiveSessionItems(): Promise<IChatDetail[]> {
		return [];
	}

	async getHistorySessionItems(): Promise<IChatDetail[]> {
		return [];
	}

	async getMetadataForSession(_sessionResource: URI): Promise<IChatDetail | undefined> {
		return undefined;
	}

	notifyUserAction(_event: IChatUserActionEvent): void {
		/* no-op */
	}

	notifyQuestionCarouselAnswer(
		_requestId: string,
		_resolveId: string,
		_answers: IChatQuestionAnswers | undefined,
	): void {
		/* no-op */
	}

	async transferChatSession(_transferredSessionResource: URI, _toWorkspace: URI): Promise<void> {
		/* no-op */
	}

	async activateDefaultAgent(_location: ChatAgentLocation): Promise<void> {
		/* no-op */
	}

	setSaveModelsEnabled(_enabled: boolean): void {
		/* no-op */
	}

	async waitForModelDisposals(): Promise<void> {
		/* no-op */
	}
}
