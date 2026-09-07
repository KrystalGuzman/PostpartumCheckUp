import { registry } from '../src/engine/questionnaire.js';
import { createState } from '../src/engine/state.js';

/**
 * A safety screen answered and clear. Spread this into any state that is
 * testing something else: leaving the safety questions blank is itself a
 * finding, so a state without it is not a neutral baseline.
 */
export const CLEAN_SAFETY = {
  saf_self_harm: 'none',
  saf_harm_others: 'none',
  saf_care_capacity: 'yes',
  saf_hallucination: '0',
  saf_delusion: '0',
  saf_confusion: '0',
  saf_control: '0',
  saf_reference: '0',
  saf_observed_change: '0',
};

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
