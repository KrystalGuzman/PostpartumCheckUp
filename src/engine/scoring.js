/**
 * Pattern scoring (Parts 3-16) and overall severity (Part 17).
 *
 * Nothing here produces a diagnosis. Each module yields a *pattern strength*
 * that is deliberately prorated over the questions a person actually answered,
 * adjusted by explicit, logged modifiers (duration, trajectory, controllability,
 * time consumed, cardinal-symptom rules), and then weighed alongside functional
 * impact and the safety evaluation — never reduced to a single number.
 */

import { registry } from './questionnaire.js';
import { selectScenarios } from '../data/scenarios.js';
import { evaluateSafety, levelRank } from './safety.js';
import { evaluateRiskFactors } from './riskFactors.js';
import { evaluateAdaptation } from './adaptation.js';
import { allModules } from '../data/modules.js';

export const BANDS = ['minimal', 'low', 'moderate', 'high'];

/**
 * `group` decides where a module is reported. Symptom modules are the ones a
 * clinician would treat; context modules describe circumstances and must never
 * head a list titled "strongest patterns".
 */
export const DOMAIN_META = {
  baby_blues: { label: 'Baby blues pattern', group: 'symptom', severityWeight: 0 },
  depression: { label: 'Depression symptoms', group: 'symptom', severityWeight: 1 },
  anxiety: { label: 'Anxiety symptoms', group: 'symptom', severityWeight: 1 },
  ocd: { label: 'Intrusive thoughts and compulsive patterns', group: 'symptom', severityWeight: 1 },
  trauma: { label: 'Trauma symptoms', group: 'symptom', severityWeight: 1 },
  bipolar: { label: 'Bipolar-spectrum warning signs', group: 'symptom', severityWeight: 1 },
  adjustment: { label: 'Adjustment and life-stress response', group: 'symptom', severityWeight: 1 },
  siblings: { label: 'Strain of caring for more than one child', group: 'symptom', severityWeight: 1 },
  // Pressure is circumstance and never drives the level. Adaptation — the
  // direction of travel under that pressure — is the part that does.
  pressure: { label: 'Where the pressure is sitting', group: 'context', severityWeight: 0 },
  adaptation: {
    label: 'Difficulty adapting to the load',
    group: 'symptom',
    severityWeight: 1,
    // "at a high level" reads backwards for a domain whose high end means
    // adapting badly, so this domain supplies its own phrasing for drivers.
    driverLabel: 'difficulty adapting to what you are carrying',
  },
  grief: { label: 'Grief and loss', group: 'symptom', severityWeight: 0.5 },
  medical: { label: 'Possible physical or medical contributors', group: 'context', severityWeight: 0 },
  support: { label: 'Relationship and support context', group: 'context', severityWeight: 0 },
};

const bandFromRatio = (ratio) => {
  if (ratio < 0.17) return 'minimal';
  if (ratio < 0.34) return 'low';
  if (ratio < 0.55) return 'moderate';
  return 'high';
};

const step = (band, delta) => BANDS[Math.min(BANDS.length - 1, Math.max(0, BANDS.indexOf(band) + delta))];
const atLeast = (band, floor) => (BANDS.indexOf(band) < BANDS.indexOf(floor) ? floor : band);
const atMost = (band, ceiling) => (BANDS.indexOf(band) > BANDS.indexOf(ceiling) ? ceiling : band);

/** Scenario answers contribute to the domains their scenario declares. */
function scenarioContribution(domainId, state) {
  let raw = 0;
  let max = 0;
  for (const scenarioItem of selectScenarios(state)) {
    if (!scenarioItem.domains.includes(domainId)) continue;
    const value = state.valueOf(scenarioItem.id);
    if (!value) continue;
    const option = scenarioItem.options.find((o) => o.value === value);
    if (!option || option.notApplicable) continue;
    raw += option.weights?.[domainId] ?? 0;
    max += 3;
  }
  return { raw, max };
}

export function scoreDomain(domainId, state) {
  const module = allModules.find((m) => m.domain === domainId);
  const items = registry.scoredItemsForDomain(domainId);
  const answered = items.filter((item) => state.scoreOf(item.id) !== null);

  let raw = answered.reduce((total, item) => total + state.scoreOf(item.id), 0);
  let max = answered.length * 3;

  const scenario = scenarioContribution(domainId, state);
  raw += scenario.raw;
  max += scenario.max;

  const ratio = max > 0 ? raw / max : 0;
  const modifiers = [];
  let band = bandFromRatio(ratio);

  // A cap is a hard ceiling, held back and applied after every other
  // adjustment. Without that, a later floor (say, "persistent for more than
  // three months") could quietly overrule the cardinal-symptom rule.
  let ceiling = BANDS[BANDS.length - 1];
  const applyCap = (limit, reason) => {
    if (BANDS.indexOf(limit) < BANDS.indexOf(ceiling)) {
      ceiling = limit;
      modifiers.push({ effect: `capped at ${limit}`, reason });
    }
  };
  const applyFloor = (floor, reason) => {
    if (BANDS.indexOf(band) < BANDS.indexOf(floor)) {
      modifiers.push({ effect: `raised to ${floor}`, reason });
      band = floor;
    }
  };
  const applyStep = (delta, reason) => {
    const next = step(band, delta);
    if (next !== band) {
      modifiers.push({ effect: `${delta > 0 ? 'raised' : 'lowered'} to ${next}`, reason });
      band = next;
    }
  };

  // Too little answered to say anything.
  if (answered.length + scenario.max / 3 < 4) {
    applyCap('low', 'not enough answered questions in this section to say more');
  }

  // Cardinal-symptom rule: a module needs its defining symptoms before its
  // pattern is reported as notable — either one endorsed strongly, or two
  // present at any level, since several mild cardinal symptoms still make the
  // pattern.
  const cardinal = module?.cardinal ?? [];
  const cardinalMet =
    cardinal.length === 0 ||
    cardinal.some((id) => (state.scoreOf(id) ?? 0) >= 2) ||
    state.countAtLeast(cardinal, 1) >= 2;
  if (!cardinalMet && cardinal.length > 0) {
    applyCap(
      'low',
      `the symptoms this pattern is defined by — ${module.cardinalLabel ?? 'its core symptoms'} — were not endorsed`,
    );
  }

  // Several symptoms at the very top of the scale outweigh an average that
  // gets diluted by the items someone answered "not at all".
  const atCeiling = answered.filter((item) => state.scoreOf(item.id) === 3).length;
  if (atCeiling >= 5) applyFloor('high', `${atCeiling} symptoms here were endorsed at the top of the scale`);
  else if (atCeiling >= 3) applyFloor('moderate', `${atCeiling} symptoms here were endorsed at the top of the scale`);

  applyDomainModifiers(domainId, state, { applyCap, applyFloor, applyStep });

  band = atMost(band, ceiling);

  // Real symptom load behind a capped band should not vanish from the report.
  const cappedButLoaded = !cardinalMet && BANDS.indexOf(bandFromRatio(ratio)) >= BANDS.indexOf('moderate');

  return {
    domain: domainId,
    label: DOMAIN_META[domainId]?.label ?? domainId,
    kind: DOMAIN_META[domainId]?.group === 'context' ? 'contextual' : 'clinical',
    raw,
    max,
    ratio,
    band,
    bandFromScore: bandFromRatio(ratio),
    answeredCount: answered.length,
    cardinalMet,
    cappedButLoaded,
    cardinalLabel: module?.cardinalLabel ?? null,
    group: DOMAIN_META[domainId]?.group ?? 'symptom',
    modifiers,
  };
}

function applyDomainModifiers(domainId, state, { applyCap, applyFloor, applyStep }) {
  const value = (id) => state.valueOf(id);
  const score = (id) => state.scoreOf(id) ?? 0;

  if (domainId === 'depression') {
    if (value('dep_trajectory') === 'worse') applyStep(1, 'symptoms are getting worse rather than easing');
    if (value('dep_duration') === 'lt2w') {
      applyCap('moderate', 'present for less than two weeks so far — duration matters for this pattern');
    }
    if (value('dep_duration') === 'gt3m') applyFloor('moderate', 'persistent for more than three months');
    if (score('dep_distress') >= 3) applyFloor('moderate', 'the distress reported is severe');
  }

  if (domainId === 'anxiety') {
    if (value('anx_control') === 'never') applyStep(1, 'the worry does not respond at all to attempts to steer it');
    if (value('anx_duration') === 'gt3m') applyFloor('moderate', 'sustained for more than three months');
    if (score('anx_panic') >= 2) applyFloor('moderate', 'repeated panic-type surges');
  }

  if (domainId === 'ocd') {
    const time = value('ocd_time');
    if (time === 'h1_3') applyFloor('moderate', 'more than an hour a day is going to these thoughts and behaviors');
    if (time === 'gt3h') applyFloor('high', 'more than three hours a day is going to these thoughts and behaviors');
    if (score('ocd_avoid') >= 2) applyFloor('moderate', 'avoiding care situations because of the thoughts');
  }

  if (domainId === 'trauma') {
    if (score('ptsd_intrusion') >= 2 && score('ptsd_avoid') >= 2) {
      applyFloor('moderate', 'both intrusion and avoidance are present');
    }
  }

  if (domainId === 'baby_blues') {
    if (value('bb_trajectory') === 'worse') applyStep(1, 'the pattern is worsening rather than settling');
    if (value('bb_impairment') === 'no') applyFloor('moderate', 'there are no stretches of relief between the low moments');
  }

  if (domainId === 'adjustment') {
    if (value('adj_relief') === 'no') applyCap('moderate', 'the distress does not lift when the pressure does, so it may not be stress-linked alone');
  }
}

// ---------------------------------------------------------------------------
// Bipolar-spectrum warning (Part 9)
// ---------------------------------------------------------------------------

export function evaluateBipolar(state) {
  const score = (id) => state.scoreOf(id) ?? 0;
  const maniaItems = [
    'bip_sleep_no_need',
    'bip_elevated',
    'bip_irritable',
    'bip_energy',
    'bip_racing',
    'bip_talkative',
    'bip_confidence',
    'bip_activity',
    'bip_impulsive',
  ];
  const decreasedNeedForSleep = score('bip_sleep_no_need');
  const symptomCount = state.countAtLeast(maniaItems, 2);
  const samePeriod = state.valueOf('bip_same_period');
  const impact = state.valueOf('bip_impact');
  const duration = state.valueOf('bip_duration');
  const history = state.valueOf('bip_history') ?? [];
  const riskHistory = ['prior_dx', 'family', 'antidepressant_reaction', 'prior_episode'].filter((h) =>
    history.includes(h),
  );

  const presentCount = state.countAtLeast(maniaItems, 1);
  const clustered = samePeriod === 'yes' || samePeriod === 'unsure';
  const sustained = ['d4_6', 'w1plus'].includes(duration);

  // Reduced need for sleep is the gate: exhaustion cannot reach this, whatever
  // else is endorsed. Beyond that gate, several mild features clustered in one
  // period count for as much as a couple of severe ones.
  const warning =
    (decreasedNeedForSleep >= 2 && clustered && (symptomCount >= 2 || presentCount >= 4)) ||
    (decreasedNeedForSleep >= 2 && (score('bip_elevated') >= 2 || score('bip_irritable') >= 2) && symptomCount >= 2) ||
    (symptomCount >= 4 && clustered && (impact === 'problems' || sustained));

  return {
    warning,
    decreasedNeedForSleep,
    symptomCount,
    presentCount,
    sustained,
    clustered,
    duration,
    impact,
    riskHistory,
    // Distinguishing exhaustion from decreased need for sleep is the whole
    // point of this module; carry it into the summary explicitly.
    sleepDistinctionMade: state.answered('bip_sleep_no_need'),
  };
}

// ---------------------------------------------------------------------------
// Baby blues determination (Part 4)
// ---------------------------------------------------------------------------

export function evaluateBabyBlues(state, { babyBluesBand, depressionBand, anxietyBand, functioning, safetyLevel }) {
  const weeks = state.weeksPostpartum;
  const applicable = weeks != null && weeks <= 8;
  if (!applicable) {
    return { applicable: false, consistent: false, reasons: [] };
  }

  const onset = state.valueOf('bb_onset');
  const trajectory = state.valueOf('bb_trajectory');
  const relief = state.valueOf('bb_impairment');
  const disqualifiers = [];

  if (!['first_days', 'first_two_weeks'].includes(onset)) {
    disqualifiers.push('it did not begin in the first days or weeks after birth');
  }
  if (trajectory === 'worse' || trajectory === 'same') {
    disqualifiers.push('it is not settling on its own');
  }
  if (relief === 'no') disqualifiers.push('there are no stretches of relief between the low moments');
  if (weeks > 4 && trajectory !== 'better') disqualifiers.push('it has lasted beyond the first few weeks');
  if (BANDS.indexOf(babyBluesBand) > BANDS.indexOf('moderate')) disqualifiers.push('the symptoms are severe rather than mild');
  if (depressionBand === 'high') disqualifiers.push('a stronger depression pattern is also present');
  if (anxietyBand === 'high') disqualifiers.push('a stronger anxiety pattern is also present');
  if (['significant', 'severe'].includes(functioning.tier)) disqualifiers.push('day-to-day functioning is significantly affected');
  if (safetyLevel !== 'none') disqualifiers.push('safety-related responses need attention first');

  const endorsed = BANDS.indexOf(babyBluesBand) >= BANDS.indexOf('low');

  return {
    applicable: true,
    consistent: endorsed && disqualifiers.length === 0,
    endorsed,
    reasons: disqualifiers,
  };
}

// ---------------------------------------------------------------------------
// Functioning (Part 16)
// ---------------------------------------------------------------------------

export function scoreFunctioning(state) {
  const items = registry.scoredItemsForDomain('functioning');
  const answered = items.filter((item) => state.scoreOf(item.id) !== null);
  const raw = answered.reduce((total, item) => total + state.scoreOf(item.id), 0);
  const max = answered.length * 3;
  const ratio = max > 0 ? raw / max : 0;

  let tier = answered.length === 0 ? 'unknown' : 'little';
  if (answered.length === 0) {
    return { raw, max, ratio, tier, answeredCount: 0, hardest: [], criticalSevere: [] };
  }
  if (ratio >= 0.6) tier = 'severe';
  else if (ratio >= 0.35) tier = 'significant';
  else if (ratio >= 0.15) tier = 'some';

  // Self-care and baby-care difficulty carries more weight than the average.
  const critical = ['fn_baby_care', 'fn_self_care', 'fn_eat', 'fn_get_up'];
  const criticalSevere = critical.filter((id) => (state.scoreOf(id) ?? 0) >= 3);
  if (criticalSevere.length > 0 && tier !== 'severe') tier = 'significant';

  const hardest = answered
    .filter((item) => state.scoreOf(item.id) >= 2)
    .map((item) => ({ id: item.id, text: item.text, score: state.scoreOf(item.id) }))
    .sort((a, b) => b.score - a.score);

  return { raw, max, ratio, tier, answeredCount: answered.length, hardest, criticalSevere };
}

export const FUNCTIONING_LABEL = {
  unknown: 'no clear picture of functional impact, because that section was left unanswered',
  little: 'little interference with daily life',
  some: 'some interference with daily life',
  significant: 'significant interference with daily life',
  severe: 'severe interference with daily life',
};

// ---------------------------------------------------------------------------
// Overall severity (Part 17.3, ordered by Part 19)
// ---------------------------------------------------------------------------

export const SEVERITY = {
  green: { key: 'green', icon: '🟢', label: 'Low concern / monitor' },
  yellow: { key: 'yellow', icon: '🟡', label: 'Mild-to-moderate concern / consider professional support' },
  orange: { key: 'orange', icon: '🟠', label: 'Significant concern / arrange professional assessment' },
  red: { key: 'red', icon: '🔴', label: 'Urgent concern / seek immediate professional evaluation' },
};

const SEVERITY_ORDER = ['green', 'yellow', 'orange', 'red'];
const raiseSeverity = (current, floor) =>
  SEVERITY_ORDER.indexOf(floor) > SEVERITY_ORDER.indexOf(current) ? floor : current;

export function scoreAll(state) {
  const safety = evaluateSafety(state);
  const risk = evaluateRiskFactors(state);
  const adaptation = evaluateAdaptation(state);
  const domains = Object.keys(DOMAIN_META).map((domainId) => scoreDomain(domainId, state));
  const byDomain = Object.fromEntries(domains.map((d) => [d.domain, d]));
  const functioning = scoreFunctioning(state);
  const bipolar = evaluateBipolar(state);

  const babyBlues = evaluateBabyBlues(state, {
    babyBluesBand: byDomain.baby_blues.band,
    depressionBand: byDomain.depression.band,
    anxietyBand: byDomain.anxiety.band,
    functioning,
    safetyLevel: safety.level,
  });

  // Bipolar warning signs are not allowed to be reported as a mere energy or
  // anxiety pattern; they raise the module's own band as well as severity.
  if (bipolar.warning) {
    byDomain.bipolar.band = atLeast(byDomain.bipolar.band, 'moderate');
    byDomain.bipolar.modifiers.push({
      effect: 'raised to at least moderate',
      reason: 'the combination of reduced need for sleep with other elevated-mood features needs assessment',
    });
  }
  if (babyBlues.consistent) {
    byDomain.baby_blues.consistent = true;
  }

  const drivers = [];
  let severity = 'green';

  for (const domain of domains) {
    const weight = DOMAIN_META[domain.domain].severityWeight;
    if (weight === 0) continue;
    if (domain.domain === 'baby_blues' && babyBlues.consistent) continue;

    const phrase = DOMAIN_META[domain.domain].driverLabel;
    if (domain.band === 'high') {
      const floor = weight >= 1 ? 'orange' : 'yellow';
      if (raiseSeverity(severity, floor) !== severity) {
        drivers.push(phrase ?? `${domain.label.toLowerCase()} at a high level`);
      }
      severity = raiseSeverity(severity, floor);
    } else if (domain.band === 'moderate') {
      if (raiseSeverity(severity, 'yellow') !== severity) {
        drivers.push(phrase ? `some ${phrase}` : `${domain.label.toLowerCase()} at a moderate level`);
      }
      severity = raiseSeverity(severity, 'yellow');
    }
  }

  if (functioning.tier === 'severe') {
    drivers.push('severe interference with everyday functioning');
    severity = raiseSeverity(severity, 'orange');
  } else if (functioning.tier === 'significant') {
    drivers.push('significant interference with everyday functioning');
    severity = raiseSeverity(severity, 'yellow');
  }

  if (bipolar.warning) {
    drivers.push('bipolar-spectrum warning signs, which change what kind of assessment is appropriate');
    severity = raiseSeverity(severity, 'orange');
  }

  // Losing ground without a load to explain it is the pattern most often
  // dismissed. Name it as a driver so the level does not look unaccountable.
  if (adaptation.quadrant?.key === 'unexplained') {
    drivers.push('losing ground without a load that accounts for it');
    severity = raiseSeverity(severity, 'yellow');
  }

  // History raises the floor without inventing symptoms. Only an episode in
  // someone's own history moves it; load factors are reported and acted on but
  // never lift the level by themselves.
  if (risk.concernFloor !== 'green' && raiseSeverity(severity, risk.concernFloor) !== severity) {
    const leading = risk.factors.find((f) => f.weight === (risk.concernFloor === 'orange' ? 'high' : 'elevated'));
    if (leading) drivers.push(`your history: ${leading.label.toLowerCase()}`);
  }
  severity = raiseSeverity(severity, risk.concernFloor);

  // Part 19: safety always outranks the symptom picture.
  if (levelRank(safety.level) >= levelRank('urgent')) {
    severity = 'red';
    drivers.unshift('safety-related responses that take priority over the rest of the check-up');
  } else if (safety.level === 'elevated') {
    severity = raiseSeverity(severity, 'orange');
    drivers.unshift('safety-related responses that need to be followed up');
  }

  const byStrength = (a, b) => BANDS.indexOf(b.band) - BANDS.indexOf(a.band) || b.ratio - a.ratio;
  const reportable = domains.filter(
    (d) => BANDS.indexOf(d.band) >= BANDS.indexOf('low') || d.cappedButLoaded,
  );
  const rankedSymptoms = reportable.filter((d) => d.group === 'symptom').sort(byStrength);
  const rankedContext = reportable.filter((d) => d.group === 'context').sort(byStrength);

  return {
    safety,
    risk,
    adaptation,
    domains,
    byDomain,
    ranked: [...rankedSymptoms, ...rankedContext],
    rankedSymptoms,
    rankedContext,
    functioning,
    bipolar,
    babyBlues,
    severity: SEVERITY[severity],
    severityKey: severity,
    drivers,
    weeksPostpartum: state.weeksPostpartum,
    exactAge: state.weeksFromBirthDate != null,
    stopScoring: safety.stopScoring,
  };
}
