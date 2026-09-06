/**
 * The full set of scored modules, in the order they are asked.
 *
 * Kept separate from domains.js so that modules living in their own files can
 * import shared answer scales from domains.js without a circular import.
 */

import { domainModules } from './domains.js';
import { siblingsModule } from './siblings.js';
import { pressureModule, adaptationModule } from './pressure.js';

const insertAfter = (list, id, extra) => {
  const at = list.findIndex((m) => m.id === id);
  return at === -1 ? [...list, extra] : [...list.slice(0, at + 1), extra, ...list.slice(at + 1)];
};

/**
 * Sibling load sits next to the adjustment module: both are load, not illness.
 * Pressure and adaptation follow them, so that "how much" and "how is it going"
 * are asked once the specific stressors are already on the table.
 */
const withSiblings = insertAfter(domainModules, 'adjustment', siblingsModule);
const withPressure = insertAfter(withSiblings, 'siblings', pressureModule);
export const allModules = insertAfter(withPressure, 'pressure', adaptationModule);
