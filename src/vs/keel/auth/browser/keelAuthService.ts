/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { INotificationService, Severity } from '../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../platform/opener/common/opener.js';
import { IProductService } from '../../../platform/product/common/productService.js';
import { ISecretStorageService } from '../../../platform/secrets/common/secrets.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import {
	InstantiationType,
	registerSingleton,
} from '../../../platform/instantiation/common/extensions.js';
import { localize } from '../../../nls.js';
import {
	IKeelAuthState,
	KEEL_AUTH_DEFAULT_OAUTH_URL,
	KEEL_AUTH_TOKEN_SECRET_KEY,
} from '../common/keelAuth.js';

/**
 * Service-Dekorator fuer den Keel-Auth-Service (Welle 12, D-032).
 *
 * Der Service kapselt den Claude-OAuth-Reauth-Flow auf der Keel-Seite:
 * - Secret-Storage-Backed Token-Persistenz (VSCode `ISecretStorageService`)
 * - OAuth-URL aus `product.json.keelAuthOAuthUrl` (mit Mock-Default)
 * - Browser-Redirect via `IOpenerService.open(..., openExternal: true)`
 *
 * OAuth-Callback (Welle 13): Der echte Flow landet auf einem
 * Custom-Protocol-Handler (`keel://auth/callback?token=...`) oder einem
 * localhost-Redirect. In Welle 12 MVP setzt `completeSignIn()` einen
 * Mock-Token, den der Aufrufer 1.5s nach Browser-Oeffnen simuliert — damit
 * die volle UI-Kette (Pre-Redirect-Hint → Browser → Erfolg-Toast → Banner-
 * weg) bereits getestet werden kann.
 */
export const IKeelAuthService = createDecorator<IKeelAuthService>('keelAuthService');

/**
 * Public-API des Keel-Auth-Service.
 */
export interface IKeelAuthService {
	readonly _serviceBrand: undefined;

	/**
	 * Event, das nach erfolgreichem SignIn/SignOut feuert. Consumer koennen
	 * damit z.B. das Settings-Flyout-Item re-rendern.
	 */
	readonly onDidChangeAuthState: Event<IKeelAuthState>;

	/**
	 * Liefert den aktuellen Auth-State synchron. Nach `initialize()` ist der
	 * Wert persistenz-konsistent; davor ist er `{ signedIn: false }`.
	 */
	getAuthState(): IKeelAuthState;

	/**
	 * Laedt den gespeicherten Token beim Startup. Idempotent.
	 */
	initialize(): Promise<void>;

	/**
	 * Startet den SignIn-Flow:
	 *  1. Zeigt einen Pre-Redirect-Info-Toast ("Wir oeffnen gleich deinen
	 *     Browser...")
	 *  2. Oeffnet nach ~1s die OAuth-URL im externen Browser.
	 *  3. In Welle 12 MVP: simuliert nach weiteren ~1.5s `completeSignIn()`
	 *     mit einem Mock-Token, damit die UI-Kette komplett getestet werden
	 *     kann (siehe final-decisions "Welle 12 ist MVP — Production-URL in
	 *     Welle 13").
	 *
	 * @returns `true`, wenn der Flow erfolgreich durchgelaufen ist.
	 */
	signIn(): Promise<boolean>;

	/**
	 * Entfernt den gespeicherten Token. Feuert `onDidChangeAuthState` mit
	 * `signedIn: false`. Der Aufrufer (Flyout) zeigt den Erfolgs-Toast.
	 */
	signOut(): Promise<void>;

	/**
	 * Token-Setter fuer den OAuth-Callback (Welle 13 Custom-Protocol-Handler).
	 * In Welle 12 MVP wird die Methode von `signIn()` intern simuliert
	 * aufgerufen.
	 */
	completeSignIn(token: string, accountLabel?: string): Promise<void>;
}

/**
 * Default-Implementation.
 */
export class KeelAuthService extends Disposable implements IKeelAuthService {
	declare readonly _serviceBrand: undefined;

	private readonly _onDidChangeAuthState = this._register(new Emitter<IKeelAuthState>());
	readonly onDidChangeAuthState: Event<IKeelAuthState> = this._onDidChangeAuthState.event;

	private current: IKeelAuthState = { signedIn: false, accountLabel: undefined };
	private initialized = false;

	constructor(
		@ISecretStorageService private readonly secretStorageService: ISecretStorageService,
		@IOpenerService private readonly openerService: IOpenerService,
		@IProductService private readonly productService: IProductService,
		@INotificationService private readonly notificationService: INotificationService,
		@ILogService private readonly logService: ILogService,
	) {
		super();
	}

	getAuthState(): IKeelAuthState {
		return this.current;
	}

	async initialize(): Promise<void> {
		if (this.initialized) {
			return;
		}
		try {
			const token = await this.secretStorageService.get(KEEL_AUTH_TOKEN_SECRET_KEY);
			if (token && token.length > 0) {
				this.current = {
					signedIn: true,
					// Welle 12 MVP: der Mock-Flow speichert keinen Account-Namen
					// separat ab. Der String ist ein Fallback, der in Welle 13
					// durch den echten Account-Namen ersetzt wird.
					accountLabel: 'Claude-Account',
				};
			} else {
				this.current = { signedIn: false, accountLabel: undefined };
			}
		} catch (err) {
			this.logService.warn('[KeelAuthService] Token konnte nicht gelesen werden.', err);
			this.current = { signedIn: false, accountLabel: undefined };
		}
		this.initialized = true;
	}

	async signIn(): Promise<boolean> {
		// Pre-Redirect-Hint (final-decisions: "Wir oeffnen gleich deinen
		// Browser, damit du dich bei Claude anmelden kannst.").
		this.notificationService.notify({
			severity: Severity.Info,
			message: localize('keel.auth.preRedirect.message', "Wir oeffnen gleich deinen Browser, damit du dich bei Claude anmelden kannst."),
		});

		// ~1s warten, damit Otto den Hint lesen kann, bevor der Browser
		// oeffnet.
		await delay(1000);

		const oauthUrl = this.resolveOAuthUrl();
		try {
			await this.openerService.open(URI.parse(oauthUrl), { openExternal: true });
		} catch (err) {
			this.logService.error('[KeelAuthService] Browser konnte nicht geoeffnet werden.', err);
			this.showErrorToast();
			return false;
		}

		// Welle 12 MVP: Der echte OAuth-Callback (Custom-Protocol-Handler
		// oder localhost-Redirect) ist Welle 13. Fuer den MVP-Flow
		// simulieren wir den Callback nach weiteren 1.5s mit einem Mock-
		// Token. Damit ist die UI-Kette end-to-end testbar, und der
		// Production-Umbau ist eine reine Ersetzung dieser Simulation.
		await delay(1500);

		try {
			await this.completeSignIn('keel-mock-oauth-token', 'Claude-Account');
			return true;
		} catch (err) {
			this.logService.error('[KeelAuthService] Token konnte nicht gespeichert werden.', err);
			this.showErrorToast();
			return false;
		}
	}

	async signOut(): Promise<void> {
		try {
			await this.secretStorageService.delete(KEEL_AUTH_TOKEN_SECRET_KEY);
		} catch (err) {
			// SecretStorage-Fehler beim Loeschen sollen Otto nicht blockieren
			// — wir setzen den In-Memory-State trotzdem auf abgemeldet, weil
			// der User-Intent klar ist.
			this.logService.warn('[KeelAuthService] Token konnte nicht geloescht werden, State wird lokal zurueckgesetzt.', err);
		}
		this.current = { signedIn: false, accountLabel: undefined };
		this._onDidChangeAuthState.fire(this.current);
	}

	async completeSignIn(token: string, accountLabel?: string): Promise<void> {
		await this.secretStorageService.set(KEEL_AUTH_TOKEN_SECRET_KEY, token);
		this.current = {
			signedIn: true,
			accountLabel: accountLabel ?? 'Claude-Account',
		};
		this._onDidChangeAuthState.fire(this.current);
	}

	/**
	 * Liest die OAuth-Start-URL aus `product.json` (Feld `keelAuthOAuthUrl`).
	 * Fallback ist ein offensichtlicher Mock-Host.
	 */
	private resolveOAuthUrl(): string {
		const productAsKeel = this.productService as { readonly keelAuthOAuthUrl?: string };
		const configured = productAsKeel.keelAuthOAuthUrl;
		return typeof configured === 'string' && configured.length > 0
			? configured
			: KEEL_AUTH_DEFAULT_OAUTH_URL;
	}

	private showErrorToast(): void {
		// Sticky-Warning-Toast mit Retry + Hilfe-Buttons. Den Hilfe-Button
		// haelt der Contribution-Code separat im Griff — der Service bleibt
		// frei von Command-Dispatches.
		this.notificationService.notify({
			severity: Severity.Warning,
			message: localize('keel.auth.error.message', "Keel konnte dich nicht anmelden."),
			sticky: true,
		});
	}
}

function delay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

registerSingleton(IKeelAuthService, KeelAuthService, InstantiationType.Delayed);
