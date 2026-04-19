/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Action2, registerAction2 } from '../../../platform/actions/common/actions.js';
import { IDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { ServicesAccessor } from '../../../platform/instantiation/common/instantiation.js';
import { INotificationService, Severity } from '../../../platform/notification/common/notification.js';
import { localize, localize2 } from '../../../nls.js';
// Der Import registriert zugleich den Singleton ueber den `registerSingleton`-
// Top-Level-Call in keelAuthService.ts — ein separater Side-Effect-Import
// ist daher nicht noetig und loest den hygiene-Duplicate-Imports-Warn aus.
import { IKeelAuthService } from './keelAuthService.js';
import {
	KEEL_AUTH_SIGN_IN_COMMAND_ID,
	KEEL_AUTH_SIGN_OUT_COMMAND_ID,
} from '../common/keelAuth.js';

/**
 * Action `keel.auth.signIn` — startet den Reauth-Flow (Welle 12, D-032).
 *
 * Ablauf (vom Service gekapselt):
 *  1. Pre-Redirect-Hint-Toast anzeigen
 *  2. Browser-Redirect zur OAuth-URL
 *  3. Token empfangen + speichern (MVP: Mock-Token nach Delay)
 *  4. Erfolg- / Fehler-Toast
 */
registerAction2(class KeelAuthSignInAction extends Action2 {
	constructor() {
		super({
			id: KEEL_AUTH_SIGN_IN_COMMAND_ID,
			title: localize2('keel.auth.command.signIn', "Bei Keel anmelden"),
			f1: false,
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const authService = accessor.get(IKeelAuthService);
		const notificationService = accessor.get(INotificationService);

		await authService.initialize();
		const ok = await authService.signIn();

		if (ok) {
			// Erfolg-Toast (Info-Severity, nicht sticky, ~4s). Kein
			// explizites Timeout in `notify()` — Info-Toasts verschwinden
			// von alleine. `sticky: false` ist Default.
			notificationService.notify({
				severity: Severity.Info,
				message: localize('keel.auth.success.message', "Du bist wieder angemeldet."),
			});
		}
		// Fehler-Toast feuert der Service selbst (sticky) — hier nichts
		// mehr zu tun.
	}
});

/**
 * Action `keel.auth.signOut` — fragt per Dialog nach Bestaetigung und meldet
 * ab.
 *
 * Dialog-Texte (final-decisions):
 *  - Titel: "Abmelden?"
 *  - Body:  "Du kannst dich jederzeit wieder anmelden."
 *  - Buttons: [Abbrechen] (Default, Esc) / [Abmelden] (destructive)
 */
registerAction2(class KeelAuthSignOutAction extends Action2 {
	constructor() {
		super({
			id: KEEL_AUTH_SIGN_OUT_COMMAND_ID,
			title: localize2('keel.auth.command.signOut', "Bei Keel abmelden"),
			f1: false,
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const dialogService = accessor.get(IDialogService);
		const authService = accessor.get(IKeelAuthService);
		const notificationService = accessor.get(INotificationService);

		const result = await dialogService.confirm({
			type: 'question',
			message: localize('keel.auth.signOut.title', "Abmelden?"),
			detail: localize('keel.auth.signOut.body', "Du kannst dich jederzeit wieder anmelden."),
			primaryButton: localize('keel.auth.signOut.confirm', "Abmelden"),
			cancelButton: localize('keel.auth.signOut.cancel', "Abbrechen"),
		});

		if (!result.confirmed) {
			return;
		}

		await authService.signOut();

		notificationService.notify({
			severity: Severity.Info,
			message: localize('keel.auth.signOut.success', "Du bist abgemeldet."),
		});
	}
});
