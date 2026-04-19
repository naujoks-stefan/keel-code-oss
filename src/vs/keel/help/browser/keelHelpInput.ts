/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import './media/keelHelp.css';
import { EditorInput } from '../../../workbench/common/editor/editorInput.js';
import { URI } from '../../../base/common/uri.js';
import { Schemas } from '../../../base/common/network.js';
import { IUntypedEditorInput } from '../../../workbench/common/editor.js';
import {
	KEEL_HELP_INPUT_TYPE_ID,
	KEEL_HELP_RESOURCE_AUTHORITY,
} from '../common/keelHelp.js';
import { keelHelpStrings } from './strings/keelHelpStrings.js';

/**
 * EditorInput fuer den Keel-Help-Editor (Welle 11).
 *
 * Die Resource ist eine synthetische URI mit Authority `keel_help` — es gibt
 * keine echte Datei dahinter, nur einen eindeutigen Identifier fuer das
 * Editor-System. `matches()` ist bewusst breit (per `instanceof`), damit ein
 * zweiter Aufruf von `keel.help.openSupport` den bestehenden Tab fokussiert
 * statt einen zweiten zu oeffnen.
 */
export class KeelHelpInput extends EditorInput {

	static readonly ID = KEEL_HELP_INPUT_TYPE_ID;
	static readonly RESOURCE = URI.from({ scheme: Schemas.walkThrough, authority: KEEL_HELP_RESOURCE_AUTHORITY });

	override get typeId(): string {
		return KeelHelpInput.ID;
	}

	override get editorId(): string | undefined {
		return this.typeId;
	}

	override get resource(): URI | undefined {
		return KeelHelpInput.RESOURCE;
	}

	override toUntyped(): IUntypedEditorInput {
		return {
			resource: KeelHelpInput.RESOURCE,
			options: {
				override: KeelHelpInput.ID,
				pinned: true,
			},
		};
	}

	override matches(other: EditorInput | IUntypedEditorInput): boolean {
		if (super.matches(other)) {
			return true;
		}
		return other instanceof KeelHelpInput;
	}

	override getName(): string {
		return keelHelpStrings.editorName();
	}
}
