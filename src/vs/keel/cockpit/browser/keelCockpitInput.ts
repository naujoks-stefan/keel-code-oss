/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import './media/keelCockpit.css';
import { EditorInput } from '../../../workbench/common/editor/editorInput.js';
import { URI } from '../../../base/common/uri.js';
import { Schemas } from '../../../base/common/network.js';
import { IUntypedEditorInput } from '../../../workbench/common/editor.js';
import { IEditorOptions } from '../../../platform/editor/common/editor.js';
import {
	KEEL_COCKPIT_INPUT_TYPE_ID,
	KEEL_COCKPIT_RESOURCE_AUTHORITY,
} from '../common/keelCockpit.js';
import { keelCockpitStrings } from './strings/keelCockpitStrings.js';

export interface KeelCockpitEditorOptions extends IEditorOptions {
	// Keine Cockpit-spezifischen Optionen im MVP - Slot fuer zukuenftige
	// Parameter wie z.B. "focus-task-id", "initial-view-mode".
}

/**
 * EditorInput fuer den Keel-Cockpit-Editor.
 *
 * Die Resource ist eine synthetische URI mit Authority `keel_cockpit` - es gibt
 * keine echte Datei dahinter, nur einen eindeutigen Identifier fuer das
 * Editor-System. Dadurch matcht der Input-Serializer auf eine stabile Resource
 * und der Editor wird nach Restart wieder hergestellt.
 */
export class KeelCockpitInput extends EditorInput {

	static readonly ID = KEEL_COCKPIT_INPUT_TYPE_ID;
	static readonly RESOURCE = URI.from({
		scheme: Schemas.walkThrough,
		authority: KEEL_COCKPIT_RESOURCE_AUTHORITY,
	});

	override get typeId(): string {
		return KeelCockpitInput.ID;
	}

	override get editorId(): string | undefined {
		return this.typeId;
	}

	override get resource(): URI | undefined {
		return KeelCockpitInput.RESOURCE;
	}

	constructor(_options: KeelCockpitEditorOptions = {}) {
		super();
	}

	override toUntyped(): IUntypedEditorInput {
		return {
			resource: KeelCockpitInput.RESOURCE,
			options: {
				override: KeelCockpitInput.ID,
				pinned: true,
			},
		};
	}

	override matches(other: EditorInput | IUntypedEditorInput): boolean {
		if (super.matches(other)) {
			return true;
		}
		return other instanceof KeelCockpitInput;
	}

	override getName(): string {
		return keelCockpitStrings.editorName();
	}
}
