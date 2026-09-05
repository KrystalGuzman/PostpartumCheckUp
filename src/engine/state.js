/**
 * Answer store and the read-only view of it that conditional items and the
 * scoring engine work against.
 *
 * An answer is stored as { value, score, flags }. `value` is a string for
 * single-choice items and an array of strings for multi-choice items. `score`
 * is null whenever the person declined to answer, which keeps declined items
 * out of both the numerator and the denominator of every ratio rather than
 * silently counting them as zero.
 */

const PNA = 'pna';

export function createState(registry, initial = {}) {
  const responses = { ...initial };

  const state = {
    get responses() {
      return { ...responses };
    },

    answered(id) {
      return Object.prototype.hasOwnProperty.call(responses, id);
    },

    /** Record an answer for a single- or multi-choice item. */
    set(id, rawValue) {
      const item = registry.getItem(id);
      if (!item) throw new Error(`Unknown item: ${id}`);
      responses[id] = item.type === 'multi' ? scoreMulti(item, rawValue) : scoreSingle(item, rawValue);
      return state;
    },

    clear(id) {
      delete responses[id];
      return state;
    },

    valueOf(id) {
      return responses[id]?.value ?? null;
    },

    scoreOf(id) {
      return responses[id]?.score ?? null;
    },

    /** True when a multi-choice gate has a real selection (not "none", not declined). */
    gatePassed(id) {
      const value = responses[id]?.value;
      if (!Array.isArray(value)) return false;
      return value.some((v) => v !== 'none' && v !== PNA);
    },

    get flags() {
      return Object.values(responses).flatMap((r) => r.flags ?? []);
    },

    has(flag) {
      return state.flags.includes(flag);
    },

    /** Count of endorsements at or above `threshold` among the given item ids. */
    countAtLeast(ids, threshold) {
      return ids.filter((id) => (state.scoreOf(id) ?? 0) >= threshold).length;
    },

    get weeksPostpartum() {
      const chosen = responses.ctx_stage?.value;
      if (!chosen || chosen === PNA) return null;
      const option = registry.getItem('ctx_stage').options.find((o) => o.value === chosen);
      return option?.weeks ?? null;
    },

    /** Raw (unnormalised) sum for a domain, used by conditional items. */
    moduleRawScore(domainId) {
      return registry
        .scoredItemsForDomain(domainId)
        .reduce((total, item) => total + (state.scoreOf(item.id) ?? 0), 0);
    },
  };

  return state;
}

function optionFor(item, value) {
  return item.options?.find((o) => o.value === value) ?? null;
}

function scoreSingle(item, value) {
  const option = optionFor(item, value);
  const declined = value === PNA || option?.score === null || option?.score === undefined;
  return {
    value,
    score: declined ? null : option.score,
    flags: option?.flags ?? [],
    notApplicable: Boolean(option?.notApplicable) || value === 'na',
  };
}

function scoreMulti(item, values) {
  const list = Array.isArray(values) ? values : [values];
  const selected = list.filter(Boolean);
  const options = selected.map((v) => optionFor(item, v)).filter(Boolean);
  const meaningful = selected.filter((v) => v !== 'none' && v !== PNA);
  const declinedOnly = selected.length > 0 && selected.every((v) => v === PNA);
  return {
    value: selected,
    // Multi-choice items that carry a score use "how many things are going on"
    // as their signal, capped at the 0-3 scale the rest of the engine uses.
    score: item.score && !declinedOnly ? Math.min(3, meaningful.length) : null,
    flags: options.flatMap((o) => o.flags ?? []),
    notApplicable: false,
  };
}

/** Handle a multi-choice option marked `exclusive` (e.g. "none of these"). */
export function applyExclusive(item, previous, toggledValue) {
  const option = optionFor(item, toggledValue);
  const wasSelected = previous.includes(toggledValue);
  if (wasSelected) return previous.filter((v) => v !== toggledValue);
  if (option?.exclusive || toggledValue === PNA) return [toggledValue];
  return [...previous.filter((v) => !isExclusive(item, v)), toggledValue];
}

function isExclusive(item, value) {
  return Boolean(optionFor(item, value)?.exclusive) || value === PNA;
}
