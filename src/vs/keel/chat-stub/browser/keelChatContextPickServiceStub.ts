/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable, IDisposable, toDisposable } from '../../../base/common/lifecycle.js';
import {
	IChatContextPickerItem,
	IChatContextPickService,
	IChatContextValueItem,
} from '../../../workbench/contrib/chat/browser/attachments/chatContextPickService.js';

/**
 * No-Op-Stub fuer `IChatContextPickService` (Decorator-ID `IContextPickService`).
 *
 * Wird als Ersatz fuer die deaktivierte VSCode-ChatContextPickService-Registrierung
 * (D-013) eingesetzt. Registrierungs-Aufrufe von ChatContextContributions (Search,
 * Markers, SCM-History, Debug, Mcp) werden entgegengenommen, aber nie ausgewertet.
 *
 * @invariant Keel-Stub - implementiert Interface vollstaendig, tut nichts.
 */
export class KeelChatContextPickServiceStub extends Disposable implements IChatContextPickService {

	declare _serviceBrand: undefined;

	readonly items: Iterable<IChatContextValueItem | IChatContextPickerItem> = [];

	registerChatContextItem(_item: IChatContextValueItem | IChatContextPickerItem): IDisposable {
		return toDisposable(() => { /* no-op */ });
	}
}
