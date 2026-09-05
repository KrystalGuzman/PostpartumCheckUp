import { registry } from '../src/engine/questionnaire.js';
import { createState } from '../src/engine/state.js';

/** Build a state from a plain map of itemId -> value (or array, for multi). */
export function stateWith(answers = {}) {
  const state = createState(registry);
  for (const [id, value] of Object.entries(answers)) state.set(id, value);
  return state;
}

/** Answer every scored item of a domain with the same level. */
export function fillDomain(answers, domainId, value) {
  for (const item of registry.scoredItemsForDomain(domainId)) answers[item.id] = value;
  return answers;
}
