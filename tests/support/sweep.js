/**
 * Scenario sweep engine.
 *
 * The example-based tests missed a serious fault: someone reporting total
 * functional collapse got an amber result and no warning. They missed it
 * because every one of them asserted something already thought of.
 *
 * This does the opposite. It walks the answer space and asserts invariants
 * that must hold for *every* combination a person could give. A failure here
 * is a defect, not a surprise.
 *
 * Used twice: `npm test` runs it small, so regressions are caught by the
 * ordinary suite; `npm run sweep` runs it large.
 */

import { registry, applicableSections, visibleItems, sections } from '../../src/engine/questionnaire.js';
import { createState } from '../../src/engine/state.js';
import { evaluateSafety, levelRank } from '../../src/engine/safety.js';
import { scoreAll, DOMAIN_META } from '../../src/engine/scoring.js';
import { buildResults } from '../../src/engine/results.js';
import { buildProviderSummary } from '../../src/engine/providerSummary.js';
import { toPlainText, toProviderText } from '../../src/engine/summaryText.js';

const SEVERITY_ORDER = ['green', 'yellow', 'orange', 'red'];
const rank = (key) => SEVERITY_ORDER.indexOf(key);

export const SAFETY_ITEMS = [
  'saf_self_harm',
  'saf_harm_others',
  'saf_care_capacity',
  'saf_hallucination',
  'saf_delusion',
  'saf_confusion',
  'saf_control',
  'saf_reference',
  'saf_observed_change',
];

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

/** Phrases no result may ever contain, in either summary. */
const BANNED = [
  /you are depressed/i,
  /you have (ocd|ptsd|bipolar|depression|anxiety)/i,
  /you'?re fine/i,
  /\b(is|are|was|were) a diagnosis of/i,
  /we can diagnose/i,
  /just anxiety/i,
];

/**
 * What each module must be able to reach when answered at its worst, against a
 * clear safety screen with nothing else endorsed. Locked down because the
 * reported fault was exactly this: a ceiling too low to warn anyone.
 */
export const EXPECTED_CEILING = {
  baby_blues: 'orange',
  depression: 'orange',
  anxiety: 'orange',
  // Red rather than amber: the worst answer to the insight question is "I
  // believe it is really happening even when people tell me it is not", which
  // is a loss of reality testing and routes to the psychosis pathway.
  ocd: 'red',
  trauma: 'orange',
  bipolar: 'orange',
  adjustment: 'orange',
  siblings: 'orange',
  adaptation: 'orange',
  // Grief is not pathology, and carries half weight by design.
  grief: 'yellow',
  // Circumstance is reported but never drives the level on its own.
  pressure: 'green',
  medical: 'green',
  // The exception among the context modules: not feeling safe with the people
  // you live with is a safety finding, not a circumstance.
  support: 'orange',
  functioning: 'red',
};

/**
 * Answer regimes. Answering uniformly at random picks something severe on the
 * safety screen almost every time, which barely exercises the region where a
 * miss goes unnoticed — so most sampling runs with the safety screen clear.
 */
export const REGIMES = {
  chaotic: { prefill: {}, bias: null },
  'clean-safety': { prefill: CLEAN_SAFETY, bias: null },
  mild: { prefill: CLEAN_SAFETY, bias: 'best', expect: 'green' },
  severe: { prefill: {}, bias: 'worst', expect: 'red' },
};

export function createSweep({ seed = 20260907 } = {}) {
  const failures = [];
  let checked = 0;

  const fail = (invariant, detail, answers) =>
    failures.push({ invariant, detail, answers: JSON.stringify(answers ?? {}) });

  let state = seed;
  const rand = () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
  const pick = (list) => list[Math.floor(rand() * list.length)];

  // -------------------------------------------------------------------------
  // The invariants
  // -------------------------------------------------------------------------

  function check(answerState, answers, label) {
    checked += 1;
    let scored;
    let results;
    let provider;
    let parentText;
    let providerText;

    try {
      scored = scoreAll(answerState);
      results = buildResults(scored, answerState, 'us');
      provider = buildProviderSummary(scored, answerState, { name: 'Test' });
      parentText = toPlainText(results);
      providerText = toProviderText(provider);
    } catch (error) {
      fail('renders-without-throwing', `${label}: ${error.message}`, answers);
      return null;
    }

    const { safety } = scored;
    const severity = scored.severityKey;

    // Safety outranks everything.
    if (safety.level === 'emergency') {
      if (severity !== 'red') fail('emergency-is-red', `severity=${severity}`, answers);
      if (!scored.stopScoring) fail('emergency-halts-scoring', 'stopScoring=false', answers);
    }
    if (safety.level === 'urgent' && severity !== 'red') {
      fail('urgent-is-red', `severity=${severity}`, answers);
    }
    if (safety.level === 'elevated' && rank(severity) < rank('orange')) {
      fail('elevated-is-at-least-amber', `severity=${severity}`, answers);
    }
    if (severity === 'green' && safety.reasons.length > 0) {
      fail('green-means-no-safety-reasons', safety.reasons.map((r) => r.code).join(','), answers);
    }

    // A quiet result must not be sitting on top of a serious finding.
    if (severity === 'green') {
      const high = scored.domains.find((d) => DOMAIN_META[d.domain].group === 'symptom' && d.band === 'high');
      if (high) fail('green-means-no-high-symptom-band', `${high.domain}=high`, answers);
      if (['significant', 'severe'].includes(scored.functioning.tier)) {
        fail('green-means-functioning-not-impaired', scored.functioning.tier, answers);
      }
      if (scored.bipolar.warning) fail('green-means-no-bipolar-warning', 'warning=true', answers);
      if (scored.risk.concernFloor !== 'green') {
        fail('green-means-no-risk-floor', scored.risk.concernFloor, answers);
      }
    }

    if (safety.functionalCollapse?.collapsed && severity !== 'red') {
      fail('functional-collapse-is-red', `severity=${severity}`, answers);
    }

    // Floors hold.
    if (scored.risk.concernFloor === 'orange' && rank(severity) < rank('orange')) {
      fail('high-risk-floor-holds', `severity=${severity}`, answers);
    }
    if (scored.risk.concernFloor === 'yellow' && rank(severity) < rank('yellow')) {
      fail('elevated-risk-floor-holds', `severity=${severity}`, answers);
    }
    if (scored.bipolar.warning && rank(severity) < rank('orange')) {
      fail('bipolar-warning-is-at-least-amber', `severity=${severity}`, answers);
    }

    // A halted check-up presents no ordinary result.
    if (scored.stopScoring) {
      if (results.patterns.length) fail('halted-shows-no-patterns', `${results.patterns.length}`, answers);
      if (results.expansions.length) fail('halted-offers-no-expansions', `${results.expansions.length}`, answers);
      if (!results.statement) fail('halted-carries-the-statement', 'missing', answers);
      if (results.closing) fail('halted-drops-the-closing', 'present', answers);
      if (results.load) fail('halted-drops-the-load-analysis', 'present', answers);
    }

    // The summary is always usable.
    if (!results.severity?.label) fail('severity-always-labelled', 'missing', answers);
    if (!results.stage) fail('stage-always-stated', 'missing', answers);
    if (!results.disclaimer) fail('disclaimer-always-present', 'missing', answers);
    if (!results.nextSteps.length) fail('always-a-next-step', 'none', answers);
    if (!results.resources?.emergency?.contact) fail('resources-always-present', 'missing', answers);

    for (const [who, text] of [['parent', parentText], ['provider', providerText]]) {
      for (const pattern of BANNED) {
        if (pattern.test(text)) fail('no-banned-phrasing', `${who}: ${pattern}`, answers);
      }
      const wide = text.split('\n').find((line) => line.length > 80);
      if (wide) fail('text-wraps-to-80-columns', `${who}: ${wide.length} chars`, answers);
      if (/undefined|NaN|\[object Object\]/.test(text)) fail('no-placeholder-leakage', who, answers);
    }

    return scored;
  }

  // -------------------------------------------------------------------------
  // Answer generation
  // -------------------------------------------------------------------------

  /**
   * The mildest or harshest answer an item offers.
   *
   * Benign is decided by whether an option raises a flag, never by what its
   * value is called: `sup_safety` uses the value "no" for "I do not feel safe
   * with the people I live with", which is the opposite of benign.
   */
  function biasedOption(item, bias) {
    const options = item.options ?? [];
    if (!options.length) return null;

    const scored = options.filter((o) => typeof o.score === 'number');
    if (scored.length) {
      return bias === 'best'
        ? scored.reduce((best, o) => (o.score < best.score ? o : best)).value
        : scored.reduce((worst, o) => (o.score > worst.score ? o : worst)).value;
    }

    // Multi-select has no per-option score, so its worst case is everything
    // that is not a decline or an explicit "none of these". Without this the
    // gates — a traumatic birth, a loss, physical symptoms — were never driven
    // to their worst by the ceiling sweep.
    if (bias === 'worst') {
      if (item.type === 'multi') {
        const endorsements = options
          .filter((o) => o.value !== 'pna' && !o.exclusive)
          .map((o) => o.value);
        return endorsements.length ? endorsements : null;
      }
      // An unscored single question still has a worst answer when one of its
      // options raises a flag — losing insight, not feeling safe at home.
      const flagged = options.filter((o) => o.value !== 'pna' && o.flags?.length);
      return flagged.length ? flagged[flagged.length - 1].value : null;
    }

    const usable = options.filter((o) => o.value !== 'pna');
    const unflagged = usable.filter((o) => !o.flags?.length);
    const chosen =
      (item.type === 'multi' ? unflagged.find((o) => o.exclusive) : null)?.value ??
      unflagged[0]?.value ??
      usable[0]?.value;
    return chosen == null ? null : item.type === 'multi' ? [chosen] : chosen;
  }

  function fillRandomly(answerState, { skipChance = 0.12, bias = null } = {}) {
    const answers = {};
    // Repeated passes because answering one question can reveal others.
    for (let round = 0; round < 4; round++) {
      for (const section of applicableSections(answerState)) {
        for (const item of visibleItems(section, answerState)) {
          if (answerState.answered(item.id)) continue;
          if (!bias && rand() < skipChance) continue;

          if (bias) {
            const chosen = biasedOption(item, bias);
            if (chosen != null) {
              answerState.set(item.id, chosen);
              answers[item.id] = chosen;
              continue;
            }
          }
          if (item.type === 'date') {
            const weeks = Math.floor(rand() * 60) + 1;
            answerState.set(item.id, new Date(Date.now() - weeks * 7 * 86400000).toISOString().slice(0, 10));
          } else if (item.type === 'multi') {
            const values = item.options.filter(() => rand() < 0.35).map((o) => o.value);
            answerState.set(item.id, values.length ? values : [pick(item.options).value]);
          } else {
            answerState.set(item.id, pick(item.options).value);
          }
          answers[item.id] = answerState.valueOf(item.id);
        }
      }
    }
    return answers;
  }

  // -------------------------------------------------------------------------
  // Sweeps
  // -------------------------------------------------------------------------

  /** Every combination of the safety screen, or every `step`-th one. */
  function safetyCombinations({ step = 1 } = {}) {
    const optionSets = SAFETY_ITEMS.map((id) => registry.getItem(id).options.map((o) => o.value));
    const counts = {};
    let combos = 0;
    let seen = 0;

    const indices = new Array(SAFETY_ITEMS.length).fill(0);
    for (;;) {
      if (seen % step === 0) {
        const s = createState(registry);
        for (let i = 0; i < SAFETY_ITEMS.length; i++) s.set(SAFETY_ITEMS[i], optionSets[i][indices[i]]);
        const level = evaluateSafety(s).level;
        counts[level] = (counts[level] ?? 0) + 1;
        combos += 1;
      }
      seen += 1;

      let carry = SAFETY_ITEMS.length - 1;
      while (carry >= 0 && ++indices[carry] >= optionSets[carry].length) {
        indices[carry] = 0;
        carry -= 1;
      }
      if (carry < 0) break;
    }
    return { combos, counts, space: seen };
  }

  /** Each section answered at its worst, in isolation. */
  function domainCeilings() {
    const rows = [];
    for (const section of sections) {
      if (!section.domain && section.id !== 'functioning') continue;

      const s = createState(registry);
      for (const [id, value] of Object.entries({ ...CLEAN_SAFETY, ctx_stage: 'm3_6', ctx_first_baby: 'no' })) {
        s.set(id, value);
      }
      for (const item of section.items) {
        const worst = biasedOption(item, 'worst');
        if (worst != null) s.set(item.id, worst);
      }

      const scored = check(s, { section: section.id }, `worst ${section.id}`);
      if (!scored) continue;

      const domain = section.domain ?? 'functioning';
      const expected = EXPECTED_CEILING[domain];
      if (expected && scored.severityKey !== expected) {
        fail(
          'module-ceiling-holds',
          `${domain} at its worst gives ${scored.severityKey}, expected ${expected}`,
          { section: section.id },
        );
      }
      rows.push({
        section: section.title,
        band: section.domain ? (scored.byDomain[section.domain]?.band ?? '-') : scored.functioning.tier,
        severity: `${scored.severity.icon} ${scored.severityKey}`,
        safety: scored.safety.level,
      });
    }
    return rows;
  }

  function randomCheckUps(runs, mode, regimeName) {
    const regime = REGIMES[regimeName];
    const outcomes = {};
    for (let i = 0; i < runs; i++) {
      const s = createState(registry, {}, { mode });
      for (const [id, value] of Object.entries(regime.prefill)) s.set(id, value);
      const answers = fillRandomly(s, { bias: regime.bias });
      const scored = check(s, answers, `${regimeName}-${mode}-${i}`);
      if (!scored) continue;

      if (regime.expect && scored.severityKey !== regime.expect) {
        fail('regime-outcome', `${regimeName} gave ${scored.severityKey}, expected ${regime.expect}`, answers);
      }
      const key = `${scored.severityKey}/${scored.safety.level}`;
      outcomes[key] = (outcomes[key] ?? 0) + 1;
    }
    return outcomes;
  }

  /** A worse answer must never produce a milder result. */
  function monotonicity(runs) {
    let compared = 0;
    for (let i = 0; i < runs; i++) {
      const base = createState(registry, {}, { mode: 'full' });
      fillRandomly(base, { skipChance: 0.2 });

      const answered = Object.keys(base.responses).filter((id) => {
        const item = registry.getItem(id);
        return item?.options?.some((o) => typeof o.score === 'number') && base.scoreOf(id) !== null;
      });
      if (!answered.length) continue;

      const id = pick(answered);
      const item = registry.getItem(id);
      const current = base.scoreOf(id);
      const worse = item.options.filter((o) => typeof o.score === 'number' && o.score > current);
      if (!worse.length) continue;

      const before = scoreAll(base);
      const after = createState(registry, base.responses, { mode: 'full' });
      after.set(id, pick(worse).value);
      const result = scoreAll(after);
      compared += 1;

      if (rank(result.severityKey) < rank(before.severityKey)) {
        fail('worse-answer-never-lowers-severity', `${id}: ${before.severityKey} -> ${result.severityKey}`, { changed: id });
      }
      if (levelRank(result.safety.level) < levelRank(before.safety.level)) {
        fail('worse-answer-never-lowers-safety-level', `${id}: ${before.safety.level} -> ${result.safety.level}`, { changed: id });
      }
    }
    return compared;
  }

  return {
    failures,
    get checked() {
      return checked;
    },
    check,
    safetyCombinations,
    domainCeilings,
    randomCheckUps,
    monotonicity,
  };
}
