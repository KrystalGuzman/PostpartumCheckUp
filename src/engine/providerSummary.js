/**
 * The clinician-facing version of a result.
 *
 * The parent-facing summary is written to be read by the person who completed
 * it. This one is written to be handed over: it shows what was actually
 * endorsed and at what level, states the safety answers explicitly rather than
 * by omission, and is blunt about what the numbers are and are not.
 *
 * It contains no diagnosis and no recommendation the parent-facing summary does
 * not also make. It is a record of responses, not an assessment.
 */

import { registry } from './questionnaire.js';
import { selectScenarios } from '../data/scenarios.js';
import { contextSection } from '../data/context.js';
import { safetySection } from '../data/safety.js';
import { DOMAIN_META, FUNCTIONING_LABEL, BANDS } from './scoring.js';
import { stageSentence } from './results.js';

export const LIMITATIONS = [
  'This is a screening check-up completed by the patient on their own device. It is not a diagnostic instrument and no clinician reviewed the responses before this page was produced.',
  'The scores below are specific to this tool. They are not EPDS, PHQ-9, GAD-7, MDQ or PCL-5 scores and should not be recorded as such. No validated instrument was reproduced; published instruments informed which constructs are covered, nothing more.',
  'Each band is a proportion of the items the patient actually answered. Declined and inapplicable items are excluded from both numerator and denominator, so a low band on a sparsely answered module means little.',
  'Safety responses are reported in full, including negatives, so that an unanswered question is distinguishable from a denial.',
];

/** The label a person chose, rather than the raw stored value. */
export function describeAnswer(state, itemId) {
  const item = registry.getItem(itemId);
  if (!item || !state.answered(itemId)) return null;
  const value = state.valueOf(itemId);
  const values = Array.isArray(value) ? value : [value];
  const labels = values
    .map((v) => item.options?.find((o) => o.value === v)?.label ?? v)
    .filter(Boolean);
  return {
    id: itemId,
    text: item.text,
    situation: item.situation ?? null,
    answer: labels.join('; '),
    score: state.scoreOf(itemId),
    declined: values.includes('pna'),
  };
}

const answeredOrNot = (state, itemId) =>
  describeAnswer(state, itemId) ?? {
    id: itemId,
    text: registry.getItem(itemId)?.text ?? itemId,
    answer: 'Not answered',
    score: null,
    declined: false,
  };

export function buildProviderSummary(scored, state, { completedAt = new Date(), name = '' } = {}) {
  const { safety, severity, functioning, domains, byDomain, bipolar, babyBlues, drivers } = scored;

  const context = contextSection.items.map((item) => describeAnswer(state, item.id)).filter(Boolean);

  // Safety answers are listed whether or not they were endorsed: "denied" and
  // "never asked" are different pieces of information to a clinician.
  const safetyItems = safetySection.items
    .filter((item) => !item.showIf || state.answered(item.id))
    .map((item) => {
      const described = answeredOrNot(state, item.id);
      return { ...described, endorsed: isEndorsed(state, item.id) };
    });
  const insight = describeAnswer(state, 'ocd_relationship');
  if (insight) {
    safetyItems.push({
      ...insight,
      text: `Insight into intrusive thoughts: ${insight.text}`,
      endorsed: ['uncertain', 'believed'].includes(state.valueOf('ocd_relationship')),
    });
  }

  const patterns = domains
    .filter((d) => BANDS.indexOf(d.band) >= BANDS.indexOf('low') || d.answeredCount > 0)
    .sort((a, b) => BANDS.indexOf(b.band) - BANDS.indexOf(a.band) || b.ratio - a.ratio)
    .map((domain) => ({
      domain: domain.domain,
      label: domain.label,
      kind: DOMAIN_META[domain.domain]?.kind ?? 'clinical',
      band: domain.band,
      raw: domain.raw,
      max: domain.max,
      percent: domain.max > 0 ? Math.round(domain.ratio * 100) : null,
      answeredCount: domain.answeredCount,
      cardinalMet: domain.cardinalMet,
      modifiers: domain.modifiers,
      endorsed: registry
        .scoredItemsForDomain(domain.domain)
        .map((item) => describeAnswer(state, item.id))
        .filter((entry) => entry && (entry.score ?? 0) > 0)
        .sort((a, b) => b.score - a.score),
      contextual: durationAndTrajectoryIds(domain.domain)
        .map((id) => describeAnswer(state, id))
        .filter(Boolean),
    }));

  const scenarioResponses = selectScenarios(state)
    .map((scenarioItem) => describeAnswer(state, scenarioItem.id))
    .filter((entry) => entry && entry.answer !== 'This is not part of my experience');

  const functioningItems = registry
    .scoredItemsForDomain('functioning')
    .map((item) => describeAnswer(state, item.id))
    .filter(Boolean);

  return {
    meta: {
      name: name.trim(),
      completedAt,
      completedAtLabel: formatDate(completedAt),
      stage: stageSentence(scored.weeksPostpartum),
      weeksPostpartum: scored.weeksPostpartum,
      severity,
      drivers,
      halted: safety.stopScoring,
    },
    safety: {
      level: safety.level,
      halted: safety.stopScoring,
      flags: safety.reasons,
      items: safetyItems,
      intrusiveHarmThoughts: safety.intrusiveHarmThoughts,
    },
    patterns,
    bipolar: {
      warning: bipolar.warning,
      decreasedNeedForSleep: bipolar.decreasedNeedForSleep,
      symptomCount: bipolar.symptomCount,
      clustered: bipolar.clustered,
      duration: describeAnswer(state, 'bip_duration')?.answer ?? null,
      impact: describeAnswer(state, 'bip_impact')?.answer ?? null,
      history: describeAnswer(state, 'bip_history')?.answer ?? null,
    },
    babyBlues,
    functioning: {
      tier: functioning.tier,
      label: FUNCTIONING_LABEL[functioning.tier],
      percent: functioning.max > 0 ? Math.round(functioning.ratio * 100) : null,
      raw: functioning.raw,
      max: functioning.max,
      items: functioningItems,
    },
    context,
    scenarioResponses,
    medical: {
      symptoms: describeAnswer(state, 'med_symptoms')?.answer ?? null,
      disclosed: describeAnswer(state, 'med_discussed')?.answer ?? null,
      checkup: describeAnswer(state, 'med_checkup')?.answer ?? null,
    },
    limitations: LIMITATIONS,
  };
}

/** Duration and trajectory items are named consistently per module. */
function durationAndTrajectoryIds(domainId) {
  const prefixes = {
    depression: ['dep_duration', 'dep_trajectory', 'dep_distress'],
    anxiety: ['anx_duration', 'anx_control'],
    ocd: ['ocd_time', 'ocd_themes'],
    trauma: ['ptsd_event', 'ptsd_duration'],
    bipolar: ['bip_same_period', 'bip_duration', 'bip_impact'],
    baby_blues: ['bb_onset', 'bb_trajectory', 'bb_impairment'],
    adjustment: ['adj_onset', 'adj_relief'],
    grief: ['grief_event', 'grief_acknowledged'],
    support: ['sup_nights', 'sup_practical', 'sup_emotional', 'sup_conflict', 'sup_safety'],
    medical: ['med_discussed', 'med_checkup'],
  };
  return prefixes[domainId] ?? [];
}

/**
 * Whether a safety answer is something a clinician should look at. An option
 * marked `benign` ("mostly coping", "came on gradually") scores above zero but
 * is not itself a finding.
 */
function isEndorsed(state, itemId) {
  const item = registry.getItem(itemId);
  const value = state.valueOf(itemId);
  const option = item?.options?.find((o) => o.value === value);
  if (!option || option.benign) return false;
  return (state.scoreOf(itemId) ?? 0) >= 1 || (option.flags?.length ?? 0) > 0;
}

function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
