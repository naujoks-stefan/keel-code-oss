/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Action2, registerAction2 } from '../../../platform/actions/common/actions.js';
import {
	IInstantiationService,
	ServicesAccessor,
} from '../../../platform/instantiation/common/instantiation.js';
import { localize2 } from '../../../nls.js';
import { getOrCreateKeelSettingsFlyout } from './keelSettingsFlyout.js';
import {
	KEEL_SETTINGS_HIDE_COMMAND_ID,
	KEEL_SETTINGS_SHOW_COMMAND_ID,
} from '../common/keelSettings.js';

// Side-Effect-Import registriert `IKeelSettingsService` als Singleton.
import './keelSettingsService.js';

/**
 * Action: Oeffnet das Keel-Settings-Flyout.
 *
 * Wird vom Gear-Icon-Klick-Handler (D-026) aufgerufen, sobald das Flag
 * `keelReplaceManageWithSettings === true` in product.json gesetzt ist. Die
 * Action ist mit `f1: false` nicht als Command-Palette-Eintrag sichtbar —
 * die Palette ist fuer Otto via D-017 ohnehin dicht.
 */
registerAction2(class OpenKeelSettingsAction extends Action2 {
	constructor() {
		super({
			id: KEEL_SETTINGS_SHOW_COMMAND_ID,
			// allow-any-unicode-next-line
			title: localize2('keel.settings.command.show', 'Einstellungen öffnen'),
			f1: false,
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const instantiation = accessor.get(IInstantiationService);
		const { flyout } = getOrCreateKeelSettingsFlyout(instantiation);
		await flyout.show();
	}
});

/**
 * Action: Schliesst das Keel-Settings-Flyout (intern — z.B. programmgesteuert
 * aus zukuenftigen Workflows). Klick-ausserhalb / Esc / X-Button rufen den
 * Command nicht auf, sondern schliessen das Flyout direkt.
 */
registerAction2(class HideKeelSettingsAction extends Action2 {
	constructor() {
		super({
			id: KEEL_SETTINGS_HIDE_COMMAND_ID,
			// allow-any-unicode-next-line
			title: localize2('keel.settings.command.hide', 'Einstellungen schließen'),
			f1: false,
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const instantiation = accessor.get(IInstantiationService);
		const { flyout } = getOrCreateKeelSettingsFlyout(instantiation);
		flyout.hide();
	}
});
