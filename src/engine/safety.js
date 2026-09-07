/**
 * Parts 2, 10 and 19 — safety evaluation.
 *
 * This runs before, and takes precedence over, all symptom scoring. A positive
 * result here can halt ordinary scoring entirely: a low depression score never
 * cancels an emergency warning sign.
 *
 * Levels
 *   emergency — stop ordinary scoring, show the urgent pathway
 *   urgent    — finish the check-up, but the overall result is forced to red
 *   elevated  — the overall result cannot fall below amber
 *   none      — nothing here changes the ordinary result
 */

import { CARE_ITEMS, BASIC_ITEMS } from '../data/functioning.js';

export const EMERGENCY_STATEMENT = [
  'Some of your responses indicate symptoms that can require urgent professional assessment.',
  'This check-up cannot determine the cause of these symptoms.',
  'Please seek immediate medical or psychiatric evaluation and involve a trusted adult or support person.',
  'If there is immediate danger, contact emergency services or go to the nearest emergency department.',
].join(' ');

export const PSYCHOSIS_STATEMENT =
  'Postpartum psychosis is rare but can be a medical and psychiatric emergency. It is not a severe form of anxiety, and it is not something to wait out.';

/** Reality-testing items that can stand on their own. */
const CORE_PSYCHOSIS_ITEMS = [
  'saf_hallucination',
  'saf_delusion',
  'saf_confusion',
  'saf_control',
  'saf_reference',
];

/** Corroborating only — an observer's report supports the core items. */
const OBSERVED_ITEM = 'saf_observed_change';

/** Every item on the safety screen, for counting what was left unanswered. */
const SAFETY_ITEMS = [
  'saf_self_harm',
  'saf_harm_others',
  'saf_care_capacity',
  ...CORE_PSYCHOSIS_ITEMS,
  OBSERVED_ITEM,
];

/**
 * Whether someone has engaged with the check-up beyond the opening context —
 * used to tell "has not reached the safety questions yet" apart from "reached
 * them and left them blank".
 */
function hasAnsweredBeyondContext(state) {
  return Object.keys(state.responses).some((id) => !id.startsWith('ctx_') && !id.startsWith('saf_'));
}

export function evaluateSafety(state) {
  const reasons = [];
  const add = (level, code, label) => reasons.push({ level, code, label });

  const coreScores = CORE_PSYCHOSIS_ITEMS.map((id) => state.scoreOf(id) ?? 0);
  const coreMax = Math.max(0, ...coreScores);
  const coreEndorsed = coreScores.filter((s) => s >= 1).length;
  const observed = state.scoreOf(OBSERVED_ITEM) ?? 0;
  const rapidOnset = state.has('rapid_onset');

  const insightAbsent = state.has('insight_absent');
  const insightUncertain = state.has('insight_uncertain');

  // Someone who has had a postpartum psychosis before does not need to reach
  // the usual threshold: recurrence is high, onset is fast, and a single odd
  // experience in that context is worth an urgent look rather than a wait.
  const priorPostpartumPsychosis = state.has('prior_postpartum_psychosis') || state.has('lifetime_psychosis');

  // --- Reality testing ----------------------------------------------------
  const psychosisEmergency =
    coreMax >= 2 ||
    coreEndorsed >= 2 ||
    (coreEndorsed >= 1 && (rapidOnset || observed >= 2 || priorPostpartumPsychosis)) ||
    insightAbsent ||
    (insightUncertain && coreEndorsed >= 1);

  if (psychosisEmergency) {
    add(
      'emergency',
      'psychosis',
      priorPostpartumPsychosis && coreEndorsed >= 1 && coreMax < 2
        ? 'Experiences affecting reality testing, in someone who has had a postpartum psychotic episode before'
        : 'Responses describing experiences that need urgent assessment of reality testing',
    );
  } else if (coreEndorsed === 1 || observed >= 2 || insightUncertain) {
    add('urgent', 'psychosis_possible', 'One or more responses that need prompt assessment of reality testing');
  }

  // --- Self-harm and suicidality -----------------------------------------
  if (state.has('si_plan')) {
    add('emergency', 'suicidality_plan', 'Thoughts of self-harm with intent, a plan, or uncertainty about staying safe');
  } else if (state.has('si_active')) {
    add('urgent', 'suicidality_active', 'Thoughts of hurting yourself');
  } else if (state.has('si_passive')) {
    add('elevated', 'suicidality_passive', 'Thoughts that you would be better off gone');
  }

  // --- Harm towards others ------------------------------------------------
  if (state.has('harm_intent')) {
    add('emergency', 'harm_intent', 'Thoughts that harm might be necessary or deserved');
  } else if (state.has('harm_urge')) {
    add('emergency', 'harm_urge', 'Thoughts of harm that feel like an urge rather than an unwanted intrusion');
  }
  const intrusiveHarmThoughts = state.has('harm_intrusive');

  // --- Capacity to keep everyone safe ------------------------------------
  if (state.has('care_unable')) {
    add('emergency', 'care_unable', 'Not currently able to keep yourself and your baby safe');
  } else if (state.has('care_unsure')) {
    add(coreEndorsed >= 1 ? 'emergency' : 'urgent', 'care_unsure', 'Uncertainty about being able to keep everyone safe');
  }

  // --- Interpersonal safety ----------------------------------------------
  if (state.has('relationship_safety')) {
    add('elevated', 'relationship_safety', 'Not feeling safe with someone you live with');
  }

  if (state.has('safety_declined')) {
    add('elevated', 'declined', 'One or more safety questions were declined');
  }

  // Leaving the safety questions blank is not the same as answering "no", and
  // was previously invisible: unanswered items produced no flag at all.
  const unanswered = SAFETY_ITEMS.filter((id) => !state.answered(id));
  if (unanswered.length > 0 && (unanswered.length < SAFETY_ITEMS.length || hasAnsweredBeyondContext(state))) {
    add(
      'elevated',
      'safety_unanswered',
      `${unanswered.length} of the ${SAFETY_ITEMS.length} safety questions were left blank`,
    );
  }

  // --- Functional collapse ------------------------------------------------
  // Part 19 puts severe functional impairment third, above the psychiatric
  // patterns. Before this, nothing but a safety answer could reach the urgent
  // tier, so someone reporting they cannot get out of bed, eat, or care for
  // their baby topped out at "arrange an assessment in the next week or so".
  const functional = evaluateFunctionalCollapse(state);
  if (functional.collapsed) {
    add('urgent', 'functional_collapse', functional.label);
  }

  const level = highestLevel(reasons);

  return {
    level,
    stopScoring: level === 'emergency',
    reasons,
    intrusiveHarmThoughts,
    functionalCollapse: functional,
    unansweredCount: unanswered.length,
    detail: {
      coreEndorsed,
      coreMax,
      observed,
      rapidOnset,
      insight: insightAbsent ? 'absent' : insightUncertain ? 'uncertain' : 'intact',
      priorPostpartumPsychosis,
      declined: state.has('safety_declined'),
    },
  };
}

/**
 * Not being able to do the basics is a finding in its own right, whatever
 * label the symptoms fall under. "I mostly cannot" is the top of the scale —
 * it means cannot, not "it is hard" — so two of them together, or an inability
 * to carry out care alongside one, is treated as needing contact today.
 */
export function evaluateFunctionalCollapse(state) {
  const at = (id) => state.scoreOf(id) ?? 0;
  const cannotCare = CARE_ITEMS.filter((id) => at(id) >= 3);
  const cannotBasics = BASIC_ITEMS.filter((id) => at(id) >= 3);
  const total = cannotCare.length + cannotBasics.length;

  const collapsed = (cannotCare.length >= 1 && total >= 2) || cannotBasics.length >= 3;
  const parts = [];
  if (cannotCare.includes('fn_baby_care')) parts.push('the practical care your baby needs');
  if (cannotCare.includes('fn_self_care')) parts.push('looking after yourself');
  if (cannotBasics.includes('fn_get_up')) parts.push('getting out of bed');
  if (cannotBasics.includes('fn_eat')) parts.push('eating');
  if (cannotBasics.includes('fn_shower')) parts.push('washing');
  if (cannotBasics.includes('fn_sleep')) parts.push('sleeping when you can');

  return {
    collapsed,
    items: [...cannotCare, ...cannotBasics],
    label: collapsed
      ? `Not currently able to manage ${parts.slice(0, 3).join(', ')}${parts.length > 3 ? ', and more' : ''}`
      : null,
  };
}

const LEVEL_ORDER = ['none', 'elevated', 'urgent', 'emergency'];

export function highestLevel(reasons) {
  return reasons.reduce(
    (highest, r) => (LEVEL_ORDER.indexOf(r.level) > LEVEL_ORDER.indexOf(highest) ? r.level : highest),
    'none',
  );
}

export const levelRank = (level) => LEVEL_ORDER.indexOf(level);
