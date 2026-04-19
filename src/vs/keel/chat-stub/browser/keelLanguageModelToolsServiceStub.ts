/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { Iterable } from '../../../base/common/iterator.js';
import { Disposable, IDisposable, toDisposable } from '../../../base/common/lifecycle.js';
import { constObservable, IObservable, IReader } from '../../../base/common/observable.js';
import { Codicon } from '../../../base/common/codicons.js';
import { ChatRequestToolReferenceEntry } from '../../../workbench/contrib/chat/common/attachments/chatVariableEntries.js';
import { IVariableReference } from '../../../workbench/contrib/chat/common/chatModes.js';
import { ILanguageModelChatMetadata } from '../../../workbench/contrib/chat/common/languageModels.js';
import {
	CountTokensCallback,
	IBeginToolCallOptions,
	ILanguageModelToolsService,
	IToolAndToolSetEnablementMap,
	IToolData,
	IToolImpl,
	IToolInvocation,
	IToolInvokedEvent,
	IToolResult,
	IToolSet,
	ToolDataSource,
	ToolSet,
} from '../../../workbench/contrib/chat/common/tools/languageModelToolsService.js';
import { IChatToolInvocation } from '../../../workbench/contrib/chat/common/chatService/chatService.js';

/**
 * Leeres Dummy-ToolSet fuer die Service-Properties `vscodeToolSet` etc.
 *
 * Die `ToolSet`-Klasse aus dem Upstream erwartet einen `IContextKeyService` im
 * Konstruktor. Da wir die Instanz nur fuer Property-Shape-Kompatibilitaet brauchen
 * (nie lesen!), liefern wir ein minimal getyptes Dummy-Objekt und casten es.
 *
 * Zusaetzlich stubben wir die `addTool`/`addToolSet`-Methoden: Aufrufer wie
 * `extensions.chat.toolsContribution` oder `testingChatAgentTool` registrieren
 * ihre Tools beim Boot per `vscodeToolSet.addTool(...)`. Ohne diese Methoden
 * wuerde die Contribution beim Boot crashen (TypeError: addTool is not a function).
 */
// ToolSet ist eine Klasse mit private Feldern, die wir nicht nachbauen wollen.
// EMPTY_TOOLSET ist ein Shape-kompatibles Duck-Type-Objekt — Consumer lesen
// ausschliesslich getTools() / addTool() / addToolSet(); wir liefern No-Ops.
// eslint-disable-next-line local/code-no-dangerous-type-assertions
const EMPTY_TOOLSET = {
	id: 'keel.chat-stub.emptyToolSet',
	referenceName: 'keel-chat-stub',
	icon: Codicon.circleOutline,
	source: ToolDataSource.Internal,
	description: undefined,
	legacyFullNames: undefined,
	getTools(): Iterable<IToolData> {
		return Iterable.empty();
	},
	addTool(_data: IToolData): IDisposable {
		return toDisposable(() => { /* no-op */ });
	},
	addToolSet(_toolSet: IToolSet): IDisposable {
		return toDisposable(() => { /* no-op */ });
	},
} as unknown as ToolSet;

/**
 * No-Op-Stub fuer `ILanguageModelToolsService`.
 *
 * Wird als Ersatz fuer die deaktivierte VSCode-LanguageModelToolsService-Registrierung
 * (D-013) eingesetzt. Liefert leere Tool-Listen, keine Invocations, keine Events.
 *
 * @invariant Keel-Stub - implementiert Interface vollstaendig, tut nichts.
 */
export class KeelLanguageModelToolsServiceStub extends Disposable implements ILanguageModelToolsService {

	declare _serviceBrand: undefined;

	readonly vscodeToolSet: ToolSet = EMPTY_TOOLSET;
	readonly executeToolSet: ToolSet = EMPTY_TOOLSET;
	readonly readToolSet: ToolSet = EMPTY_TOOLSET;
	readonly agentToolSet: ToolSet = EMPTY_TOOLSET;

	private readonly _onDidChangeTools = this._register(new Emitter<void>());
	readonly onDidChangeTools: Event<void> = this._onDidChangeTools.event;

	private readonly _onDidPrepareToolCallBecomeUnresponsive = this._register(
		new Emitter<{ readonly sessionResource: import('../../../base/common/uri.js').URI; readonly toolData: IToolData }>(),
	);
	readonly onDidPrepareToolCallBecomeUnresponsive = this._onDidPrepareToolCallBecomeUnresponsive.event;

	private readonly _onDidInvokeTool = this._register(new Emitter<IToolInvokedEvent>());
	readonly onDidInvokeTool: Event<IToolInvokedEvent> = this._onDidInvokeTool.event;

	readonly toolSets: IObservable<Iterable<IToolSet>> = constObservable(Iterable.empty<IToolSet>());

	registerToolData(_toolData: IToolData): IDisposable {
		return toDisposable(() => { /* no-op */ });
	}

	registerToolImplementation(_id: string, _tool: IToolImpl): IDisposable {
		return toDisposable(() => { /* no-op */ });
	}

	registerTool(_toolData: IToolData, _tool: IToolImpl): IDisposable {
		return toDisposable(() => { /* no-op */ });
	}

	getTools(_model: ILanguageModelChatMetadata | undefined): Iterable<IToolData> {
		return Iterable.empty();
	}

	observeTools(_model: ILanguageModelChatMetadata | undefined): IObservable<readonly IToolData[]> {
		return constObservable<readonly IToolData[]>([]);
	}

	getAllToolsIncludingDisabled(): Iterable<IToolData> {
		return Iterable.empty();
	}

	getTool(_id: string): IToolData | undefined {
		return undefined;
	}

	getToolByName(_name: string): IToolData | undefined {
		return undefined;
	}

	beginToolCall(_options: IBeginToolCallOptions): IChatToolInvocation | undefined {
		return undefined;
	}

	async updateToolStream(_toolCallId: string, _partialInput: unknown, _token: CancellationToken): Promise<void> {
		/* no-op */
	}

	async invokeTool(
		_invocation: IToolInvocation,
		_countTokens: CountTokensCallback,
		_token: CancellationToken,
	): Promise<IToolResult> {
		return {
			content: [
				{ kind: 'text', value: 'Keel chat-stub: Tool-Invocation nicht unterstuetzt.' },
			],
			toolResultError: true,
		};
	}

	cancelToolCallsForRequest(_requestId: string): void {
		/* no-op */
	}

	flushToolUpdates(): void {
		/* no-op */
	}

	getToolSetsForModel(
		_model: ILanguageModelChatMetadata | undefined,
		_reader?: IReader,
	): Iterable<IToolSet> {
		return Iterable.empty();
	}

	getToolSet(_id: string): IToolSet | undefined {
		return undefined;
	}

	getToolSetByName(_name: string): IToolSet | undefined {
		return undefined;
	}

	createToolSet(
		_source: ToolDataSource,
		_id: string,
		_referenceName: string,
		_options?: { icon?: import('../../../base/common/themables.js').ThemeIcon; description?: string; legacyFullNames?: string[] },
	): ToolSet & IDisposable {
		// Liefert einen Stub-ToolSet mit trivialer Dispose-Logik. Wird nie benutzt.
		const stubToolSet: ToolSet & IDisposable = Object.assign(
			Object.create(null),
			EMPTY_TOOLSET,
			{ dispose: () => { /* no-op */ } },
		);
		return stubToolSet;
	}

	getFullReferenceNames(): Iterable<string> {
		return Iterable.empty();
	}

	getFullReferenceName(_tool: IToolData, _toolSet?: IToolSet): string {
		return '';
	}

	getToolByFullReferenceName(_fullReferenceName: string): IToolData | IToolSet | undefined {
		return undefined;
	}

	getDeprecatedFullReferenceNames(): Map<string, Set<string>> {
		return new Map();
	}

	toToolAndToolSetEnablementMap(
		_fullReferenceNames: readonly string[],
		_model: ILanguageModelChatMetadata | undefined,
	): IToolAndToolSetEnablementMap {
		return new Map();
	}

	toFullReferenceNames(_map: IToolAndToolSetEnablementMap): string[] {
		return [];
	}

	toToolReferences(_variableReferences: readonly IVariableReference[]): ChatRequestToolReferenceEntry[] {
		return [];
	}
}
