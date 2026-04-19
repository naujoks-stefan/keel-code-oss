/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Gemeinsame Konstanten fuer den Cockpit-Anker in der Activity-Bar (Welle 10,
 * Iteration 3).
 *
 * Der Anker rendert die gleiche DOM-Struktur wie ein Upstream-
 * `CompositeActionViewItem`:
 *
 * ```
 * <div class="monaco-action-bar vertical keel-cockpit-anchor-bar">
 *   <ul class="actions-container" role="tablist">
 *     <li class="action-item icon keel-cockpit-anchor" role="tab">
 *       <a class="action-label codicon codicon-dashboard"></a>
 *       <div class="active-item-indicator"></div>
 *     </li>
 *   </ul>
 * </div>
 * ```
 *
 * Dadurch greifen saemtliche Upstream-Selektoren aus
 * `activityaction.css` und `activitybarPart.ts` (ThemingParticipant), die am
 * Muster `.activitybar > .content :not(.monaco-menu) > .monaco-action-bar
 * .action-item .action-label` haengen - der Anker bekommt damit automatisch
 * die Standard-Slot-Hoehe (48 px bzw. 32 px kompakt), die
 * Standard-Icon-Groesse (24 px bzw. 16 px), Hover-/Active-Farben und den
 * linken Akzent-Border.
 *
 * Keine Abhaengigkeiten zu Workbench- oder Browser-APIs - damit die
 * Konstanten auch aus dem Core-Layer oder aus Tests genutzt werden koennen.
 */

/**
 * CSS-Klasse des aeusseren `.monaco-action-bar`-Wrappers. Dient als
 * spezifischer Markierungs-Hook fuer den Anker (z.B. um das `margin-bottom:
 * auto` des CompositeBar nicht zu uebernehmen).
 */
export const KEEL_COCKPIT_ANCHOR_BAR_CLASS = 'keel-cockpit-anchor-bar';

/**
 * CSS-Klasse des Anker-`li`-Elements. Wird vom Upstream-Pattern `.action-item`
 * begleitet, das die Basis-Slot-Dimensionen liefert. `keel-cockpit-anchor`
 * dient als Anker-spezifische Hook-Klasse fuer Tests und fein justierte
 * Anpassungen.
 */
export const KEEL_COCKPIT_ANCHOR_CONTAINER_CLASS = 'keel-cockpit-anchor';

/**
 * CSS-Klasse, die gesetzt wird, wenn der Cockpit-Editor gerade der aktive
 * Editor ist. Entspricht der Upstream-Konvention: die Activity-Bar-CSS stylt
 * `.action-item.checked .active-item-indicator:before` als linken Akzent-
 * Border und `.action-item.checked` als aktiver Vordergrund. Wir nutzen den
 * gleichen Klassen-Namen, damit wir dasselbe Styling erben.
 */
export const KEEL_COCKPIT_ANCHOR_ACTIVE_CLASS = 'checked';
