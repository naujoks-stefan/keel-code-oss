/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Gemeinsame Konstanten fuer den Cockpit-Anker in der Activity-Bar (Welle 10).
 *
 * Keine Abhaengigkeiten zu Workbench- oder Browser-APIs - damit die Konstanten
 * auch aus dem Core-Layer oder aus Tests genutzt werden koennen.
 */

/**
 * CSS-Klasse des Anker-Wurzelelements. Wird vom Layout des Activity-Bar-
 * Compositors referenziert und stylt das Icon als eigenstaendiges Activity-
 * Bar-Item unterhalb der Standard-ViewContainer.
 */
export const KEEL_COCKPIT_ANCHOR_CONTAINER_CLASS = 'keel-cockpit-anchor';

/**
 * CSS-Klasse, die gesetzt wird, wenn der Cockpit-Editor gerade der aktive
 * Editor ist. Die Klasse steuert die Akzent-Border und die Icon-Farbe analog
 * zum Upstream-Activity-Bar-Muster.
 */
export const KEEL_COCKPIT_ANCHOR_ACTIVE_CLASS = 'keel-cockpit-anchor-active';

/**
 * CSS-Klasse am Icon-Span. Haelt Codicon-Klassen (codicon + codicon-dashboard)
 * von der aeusseren Layout-Klasse getrennt.
 */
export const KEEL_COCKPIT_ANCHOR_ICON_CLASS = 'keel-cockpit-anchor-icon';
