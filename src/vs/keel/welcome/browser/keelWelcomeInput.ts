/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import './media/keelWelcome.css';
import { EditorInput } from '../../../workbench/common/editor/editorInput.js';
import { URI } from '../../../base/common/uri.js';
import { Schemas } from '../../../base/common/network.js';
import { IUntypedEditorInput } from '../../../workbench/common/editor.js';
import { IEditorOptions } from '../../../platform/editor/common/editor.js';
import {
	KEEL_WELCOME_INPUT_TYPE_ID,
	KEEL_WELCOME_RESOURCE_AUTHORITY,
} from '../common/keelWelcome.js';
import { keelWelcomeStrings } from './strings/keelWelcomeStrings.js';

/**
 * Herkunft des Welcome-Oeffnens. Steuert das Autofokus-Verhalten:
 * Beim First-Run (startup) wird die Eingabezeile automatisch fokussiert,
 * beim expliziten Oeffnen via Command nicht.
 */
export type KeelWelcomeInitiator = 'startup' | 'command';

export interface KeelWelcomeEditorOptions extends IEditorOptions {
	/** Woher wurde das Welcome geoeffnet. Default: `'command'`. */
	initiator?: KeelWelcomeInitiator;
}

/**
 * EditorInput fuer den Keel-Welcome-Editor.
 *
 * Die Resource ist eine synthetische URI mit Authority `keel_welcome` - es gibt
 * keine echte Datei dahinter, nur einen eindeutigen Identifier fuer das Editor-System.
 */
export class KeelWelcomeInput extends EditorInput {

	static readonly ID = KEEL_WELCOME_INPUT_TYPE_ID;
	static readonly RESOURCE = URI.from({ scheme: Schemas.walkThrough, authority: KEEL_WELCOME_RESOURCE_AUTHORITY });

	private readonly _initiator: KeelWelcomeInitiator;

	override get typeId(): string {
		return KeelWelcomeInput.ID;
	}

	override get editorId(): string | undefined {
		return this.typeId;
	}

	override get resource(): URI | undefined {
		return KeelWelcomeInput.RESOURCE;
	}

	/** Signalisiert dem Welcome-EditorPane, ob First-Run-Autofokus aktiv ist. */
	get initiator(): KeelWelcomeInitiator {
		return this._initiator;
	}

	constructor(options: KeelWelcomeEditorOptions = {}) {
		super();
		this._initiator = options.initiator ?? 'command';
	}

	override toUntyped(): IUntypedEditorInput {
		return {
			resource: KeelWelcomeInput.RESOURCE,
			options: {
				override: KeelWelcomeInput.ID,
				pinned: false,
			},
		};
	}

	override matches(other: EditorInput | IUntypedEditorInput): boolean {
		if (super.matches(other)) {
			return true;
		}
		return other instanceof KeelWelcomeInput;
	}

	override getName(): string {
		return keelWelcomeStrings.editorName();
	}
}
