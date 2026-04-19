/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Gemeinsame Konstanten fuer das Keel-Chat-Stub-Modul.
 *
 * Das Stub-Modul registriert No-Op-Implementierungen der Chat-Services, die von
 * deaktivierten VSCode-Chat-Contributions (D-013) normalerweise bereitgestellt
 * werden. Ziel: Cascade-Boot-Errors in nicht-deaktivierten Consumern eliminieren.
 */

/**
 * Stabiler Identifier fuer das Stub-Modul in Log-Ausgaben.
 */
export const KEEL_CHAT_STUB_ID = 'keel.chat-stub';
