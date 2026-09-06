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
    add('elevated', 'declined', 'One or more safety questions were left unanswered');
  }

  const level = highestLevel(reasons);

  return {
    level,
    stopScoring: level === 'emergency',
    reasons,
    intrusiveHarmThoughts,
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

const LEVEL_ORDER = ['none', 'elevated', 'urgent', 'emergency'];

export function highestLevel(reasons) {
  return reasons.reduce(
    (highest, r) => (LEVEL_ORDER.indexOf(r.level) > LEVEL_ORDER.indexOf(highest) ? r.level : highest),
    'none',
  );
}

export const levelRank = (level) => LEVEL_ORDER.indexOf(level);
