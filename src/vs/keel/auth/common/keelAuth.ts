/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Gemeinsame Konstanten fuer den Keel-Reauth-Flow (Welle 12, D-032).
 *
 * Keine Abhaengigkeiten zu Workbench/Browser-APIs, damit die Konstanten aus
 * Services konsumiert werden koennen.
 */

/**
 * Secret-Key, unter dem der Claude-OAuth-Token im `ISecretStorageService`
 * abgelegt wird. Die Speicherung ist verschluesselt (OS-Keychain) — ohne
 * `ISecretStorageService` (z.B. in Tests) faellt das System auf In-Memory
 * Storage zurueck.
 */
export const KEEL_AUTH_TOKEN_SECRET_KEY = 'keel.assistant.claudeAuthToken';

/**
 * Command-ID fuer den SignIn-Trigger. Wird vom Settings-Flyout-Item "Zugang
 * zu deinem Assistenten" und vom Reauth-Banner aufgerufen.
 */
export const KEEL_AUTH_SIGN_IN_COMMAND_ID = 'keel.auth.signIn';

/**
 * Command-ID fuer den SignOut-Trigger.
 */
export const KEEL_AUTH_SIGN_OUT_COMMAND_ID = 'keel.auth.signOut';

/**
 * Fallback-Default fuer die OAuth-Start-URL, wenn `product.json` keinen
 * `keelAuthOAuthUrl`-Wert setzt. Das ist eine offensichtliche Mock-URL —
 * der echte Claude-Endpoint wird in Welle 13 eingehaengt.
 */
export const KEEL_AUTH_DEFAULT_OAUTH_URL = 'https://auth.keel.app/oauth/start?client=keel-platform';

/**
 * Status-Objekt, das der `IKeelAuthService` nach aussen gibt.
 */
export interface IKeelAuthState {
	/** `true`, wenn ein Token vorliegt; sonst `false`. */
	readonly signedIn: boolean;

	/**
	 * Account-Anzeige-Name (kann eine E-Mail oder User-Id sein). In Welle 12
	 * MVP: Fallback auf `Claude-Account`, da der Mock-Flow keinen echten
	 * Account-Namen liefert.
	 */
	readonly accountLabel: string | undefined;
}
