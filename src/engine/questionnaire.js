/**
 * Assembles every section into one ordered questionnaire and provides the item
 * registry the state and scoring modules read from.
 */

import { contextSection } from '../data/context.js';
import { safetySection } from '../data/safety.js';
import { allModules } from '../data/modules.js';
import { historySection } from '../data/history.js';
import { functioningSection } from '../data/functioning.js';
import { scenarios, selectScenarios } from '../data/scenarios.js';

export const scenarioSection = {
  id: 'scenarios',
  title: 'Everyday moments',
  kind: 'scenario',
  domain: null,
  blurb:
    'A few situations from around where you are now. There is no correct answer and no parenting choice being graded — only what the moment does to you.',
  dynamic: true,
  items: [],
};

export const sections = [
  contextSection,
  // History comes before the safety screen: a previous postpartum psychosis
  // changes how the safety answers that follow should be weighed.
  historySection,
  safetySection,
  ...allModules,
  scenarioSection,
  functioningSection,
];

const itemIndex = new Map();

for (const section of sections) {
  for (const item of section.items) {
    itemIndex.set(item.id, { ...item, sectionId: section.id, domain: item.domain ?? section.domain ?? null });
  }
}
for (const item of scenarios) {
  itemIndex.set(item.id, { ...item, sectionId: 'scenarios', domain: null });
}

export const registry = {
  getItem: (id) => itemIndex.get(id) ?? null,
  allItems: () => [...itemIndex.values()],
  scoredItemsForDomain: (domainId) =>
    [...itemIndex.values()].filter((item) => item.domain === domainId && item.score === true),
  scenarioItems: () => scenarios,
};

/** Items in a section that are currently applicable, in order. */
export function visibleItems(section, state) {
  const items = section.dynamic ? selectScenarios(state) : section.items;
  return items.filter((item) => (typeof item.showIf === 'function' ? item.showIf(state) : true));
}

export function sectionApplies(section, state) {
  if (typeof section.showIf === 'function' && !section.showIf(state)) return false;
  return visibleItems(section, state).length > 0;
}

/** Ordered sections that currently apply. */
export function applicableSections(state) {
  return sections.filter((section) => sectionApplies(section, state));
}

/** Rough progress for the UI; recomputed as branching changes the item set. */
export function progress(state) {
  const applicable = applicableSections(state).flatMap((section) => visibleItems(section, state));
  const answered = applicable.filter((item) => state.answered(item.id)).length;
  return { answered, total: applicable.length, ratio: applicable.length ? answered / applicable.length : 0 };
}
