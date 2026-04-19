/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable, IDisposable, toDisposable } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { PreferredGroup } from '../../../workbench/services/editor/common/editorService.js';
import {
	ChatViewPaneTarget,
	IChatWidget,
	IChatWidgetService,
} from '../../../workbench/contrib/chat/browser/chat.js';
import { IChatEditorOptions } from '../../../workbench/contrib/chat/browser/widgetHosts/editor/chatEditor.js';
import { ChatAgentLocation } from '../../../workbench/contrib/chat/common/constants.js';

/**
 * No-Op-Stub fuer `IChatWidgetService` (Decorator-ID `chatWidgetService`).
 *
 * Wird als Ersatz fuer die deaktivierte VSCode-ChatWidgetService-Registrierung
 * (D-013) eingesetzt. Liefert keinerlei Widgets, Events feuern nie.
 *
 * @invariant Keel-Stub - implementiert Interface vollstaendig, tut nichts.
 */
export class KeelChatWidgetServiceStub extends Disposable implements IChatWidgetService {

	declare readonly _serviceBrand: undefined;

	readonly lastFocusedWidget: IChatWidget | undefined = undefined;

	private readonly _onDidAddWidget = this._register(new Emitter<IChatWidget>());
	readonly onDidAddWidget: Event<IChatWidget> = this._onDidAddWidget.event;

	private readonly _onDidBackgroundSession = this._register(new Emitter<URI>());
	readonly onDidBackgroundSession: Event<URI> = this._onDidBackgroundSession.event;

	private readonly _onDidChangeFocusedWidget = this._register(new Emitter<IChatWidget | undefined>());
	readonly onDidChangeFocusedWidget: Event<IChatWidget | undefined> = this._onDidChangeFocusedWidget.event;

	private readonly _onDidChangeFocusedSession = this._register(new Emitter<void>());
	readonly onDidChangeFocusedSession: Event<void> = this._onDidChangeFocusedSession.event;

	async reveal(_widget: IChatWidget, _preserveFocus?: boolean): Promise<boolean> {
		return false;
	}

	async revealWidget(_preserveFocus?: boolean): Promise<IChatWidget | undefined> {
		return undefined;
	}

	getAllWidgets(): ReadonlyArray<IChatWidget> {
		return [];
	}

	getWidgetByInputUri(_uri: URI): IChatWidget | undefined {
		return undefined;
	}

	async openSession(
		_sessionResource: URI,
		_target?: typeof ChatViewPaneTarget | PreferredGroup,
		_options?: IChatEditorOptions,
	): Promise<IChatWidget | undefined> {
		return undefined;
	}

	getWidgetBySessionResource(_sessionResource: URI): IChatWidget | undefined {
		return undefined;
	}

	getWidgetsByLocations(_location: ChatAgentLocation): ReadonlyArray<IChatWidget> {
		return [];
	}

	register(_newWidget: IChatWidget): IDisposable {
		return toDisposable(() => { /* no-op */ });
	}
}
