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

export function createState(registry, initial = {}, options = {}) {
  const responses = { ...initial };
  let mode = options.mode ?? 'full';
  const expanded = new Set(options.expanded ?? []);

  const state = {
    get responses() {
      return { ...responses };
    },

    /** 'full' asks everything; 'short' asks the condensed set. */
    get mode() {
      return mode;
    },
    setMode(next) {
      mode = next === 'short' ? 'short' : 'full';
      return state;
    },

    /** Sections the person has chosen to open up beyond the condensed set. */
    get expanded() {
      return [...expanded];
    },
    isExpanded(sectionId) {
      return mode === 'full' || expanded.has(sectionId);
    },
    expand(sectionId) {
      expanded.add(sectionId);
      return state;
    },

    answered(id) {
      return Object.prototype.hasOwnProperty.call(responses, id);
    },

    /** Record an answer for a single- or multi-choice item. */
    set(id, rawValue) {
      const item = registry.getItem(id);
      if (!item) throw new Error(`Unknown item: ${id}`);
      if (item.type === 'multi') responses[id] = scoreMulti(item, rawValue);
      else if (item.type === 'date') responses[id] = scoreDate(rawValue);
      else responses[id] = scoreSingle(item, rawValue);
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

    /** The chosen option object, for callers that need its metadata. */
    optionOf(id, value = null) {
      const item = registry.getItem(id);
      const chosen = value ?? responses[id]?.value ?? null;
      if (!item || chosen == null) return null;
      return item.options?.find((o) => o.value === chosen) ?? null;
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

    /**
     * Weeks since birth. A date of birth gives the real figure; the coarse
     * band is only a fallback for someone who would rather not give one.
     */
    get weeksPostpartum() {
      const exact = state.weeksFromBirthDate;
      if (exact != null) return exact;
      const chosen = responses.ctx_stage?.value;
      if (!chosen || chosen === PNA) return null;
      const option = registry.getItem('ctx_stage').options.find((o) => o.value === chosen);
      return option?.weeks ?? null;
    },

    get weeksFromBirthDate() {
      const value = responses.ctx_birth_date?.value;
      if (!value || value === PNA) return null;
      const born = new Date(`${value}T00:00:00`);
      if (Number.isNaN(born.getTime())) return null;
      const days = (Date.now() - born.getTime()) / 86400000;
      // A date in the future is a typo, not a pregnancy; treat it as unusable.
      if (days < 0) return null;
      return days / 7;
    },

    get birthDate() {
      const value = responses.ctx_birth_date?.value;
      return value && value !== PNA ? value : null;
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

function scoreDate(value) {
  return { value, score: null, flags: [], notApplicable: false };
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
