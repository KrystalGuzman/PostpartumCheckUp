/**
 * The full set of scored modules, in the order they are asked.
 *
 * Kept separate from domains.js so that modules living in their own files can
 * import shared answer scales from domains.js without a circular import.
 */

import { domainModules } from './domains.js';
import { siblingsModule } from './siblings.js';

const insertAfter = (list, id, extra) => {
  const at = list.findIndex((m) => m.id === id);
  return at === -1 ? [...list, extra] : [...list.slice(0, at + 1), extra, ...list.slice(at + 1)];
};

/** Sibling load sits next to the adjustment module: both are load, not illness. */
export const allModules = insertAfter(domainModules, 'adjustment', siblingsModule);
