/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IAction } from '../../../base/common/actions.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { IStringDictionary } from '../../../base/common/collections.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable, IDisposable, toDisposable } from '../../../base/common/lifecycle.js';
import { constObservable, IObservable } from '../../../base/common/observable.js';
import { ExtensionIdentifier } from '../../../platform/extensions/common/extensions.js';
import {
	IChatMessage,
	ILanguageModelChatMetadata,
	ILanguageModelChatMetadataAndIdentifier,
	ILanguageModelChatProvider,
	ILanguageModelChatRequestOptions,
	ILanguageModelChatResponse,
	ILanguageModelChatSelector,
	ILanguageModelProviderDescriptor,
	ILanguageModelsGroup,
	ILanguageModelsService,
	IModelsControlManifest,
	IUserFriendlyLanguageModel,
} from '../../../workbench/contrib/chat/common/languageModels.js';
import { ILanguageModelsProviderGroup } from '../../../workbench/contrib/chat/common/languageModelsConfiguration.js';

/**
 * Leere Stream-Implementation fuer den No-Op-`sendChatRequest`-Return-Wert.
 * Liefert ein sofort-abgeschlossenes Iterable und ein resolvtes Result.
 */
function createEmptyChatResponse(): ILanguageModelChatResponse {
	return {
		stream: (async function* () { /* leerer Stream */ })(),
		result: Promise.resolve(undefined),
	};
}

/**
 * No-Op-Stub fuer `ILanguageModelsService`.
 *
 * Wird als Ersatz fuer die deaktivierte VSCode-LanguageModelsService-Registrierung
 * (D-013) eingesetzt. Liefert leere Modell-Listen, keine Vendors, und ignoriert
 * Konfigurations-Mutationen. Events sind registriert, feuern aber nie.
 *
 * @invariant Keel-Stub - implementiert Interface vollstaendig, tut nichts.
 */
export class KeelLanguageModelsServiceStub extends Disposable implements ILanguageModelsService {

	declare readonly _serviceBrand: undefined;

	private readonly _onDidChangeLanguageModelVendors = this._register(new Emitter<readonly string[]>());
	readonly onDidChangeLanguageModelVendors: Event<readonly string[]> = this._onDidChangeLanguageModelVendors.event;

	private readonly _onDidChangeLanguageModels = this._register(new Emitter<string>());
	readonly onDidChangeLanguageModels: Event<string> = this._onDidChangeLanguageModels.event;

	private readonly _onDidChangeModelsControlManifest = this._register(new Emitter<IModelsControlManifest>());
	readonly onDidChangeModelsControlManifest: Event<IModelsControlManifest> = this._onDidChangeModelsControlManifest.event;

	readonly restrictedChatParticipants: IObservable<{ [name: string]: string[] }> = constObservable({});

	updateModelPickerPreference(_modelIdentifier: string, _showInModelPicker: boolean): void {
		/* no-op */
	}

	getLanguageModelIds(): string[] {
		return [];
	}

	getVendors(): ILanguageModelProviderDescriptor[] {
		return [];
	}

	lookupLanguageModel(_modelId: string): ILanguageModelChatMetadata | undefined {
		return undefined;
	}

	lookupLanguageModelByQualifiedName(_qualifiedName: string): ILanguageModelChatMetadataAndIdentifier | undefined {
		return undefined;
	}

	getLanguageModelGroups(_vendor: string): ILanguageModelsGroup[] {
		return [];
	}

	async selectLanguageModels(_selector: ILanguageModelChatSelector): Promise<string[]> {
		return [];
	}

	registerLanguageModelProvider(_vendor: string, _provider: ILanguageModelChatProvider): IDisposable {
		return toDisposable(() => { /* no-op */ });
	}

	deltaLanguageModelChatProviderDescriptors(
		_added: IUserFriendlyLanguageModel[],
		_removed: IUserFriendlyLanguageModel[],
	): void {
		/* no-op */
	}

	async sendChatRequest(
		_modelId: string,
		_from: ExtensionIdentifier | undefined,
		_messages: IChatMessage[],
		_options: ILanguageModelChatRequestOptions,
		_token: CancellationToken,
	): Promise<ILanguageModelChatResponse> {
		return createEmptyChatResponse();
	}

	async computeTokenLength(
		_modelId: string,
		_message: string | IChatMessage,
		_token: CancellationToken,
	): Promise<number> {
		return 0;
	}

	getModelConfiguration(_modelId: string): IStringDictionary<unknown> | undefined {
		return undefined;
	}

	async setModelConfiguration(_modelId: string, _values: IStringDictionary<unknown>): Promise<void> {
		/* no-op */
	}

	getModelConfigurationActions(_modelId: string): IAction[] {
		return [];
	}

	async addLanguageModelsProviderGroup(
		_name: string,
		_vendorId: string,
		_configuration: IStringDictionary<unknown> | undefined,
	): Promise<void> {
		/* no-op */
	}

	async removeLanguageModelsProviderGroup(_vendorId: string, _providerGroupName: string): Promise<void> {
		/* no-op */
	}

	async configureLanguageModelsProviderGroup(_vendorId: string, _name?: string): Promise<void> {
		/* no-op */
	}

	async configureModel(_modelId: string): Promise<void> {
		/* no-op */
	}

	async migrateLanguageModelsProviderGroup(
		_languageModelsProviderGroup: ILanguageModelsProviderGroup,
	): Promise<void> {
		/* no-op */
	}

	getRecentlyUsedModelIds(): string[] {
		return [];
	}

	addToRecentlyUsedList(_modelIdentifier: string): void {
		/* no-op */
	}

	clearRecentlyUsedList(): void {
		/* no-op */
	}

	getModelsControlManifest(): IModelsControlManifest {
		return { free: {}, paid: {} };
	}
}
