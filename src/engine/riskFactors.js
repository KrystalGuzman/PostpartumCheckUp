/**
 * Risk factors: things that change what should happen next without being
 * symptoms of anything happening now.
 *
 * They are kept strictly apart from symptom scoring. A risk factor never
 * creates a pattern, never adds to a band, and never appears in a list of what
 * someone is experiencing. What it can do is raise the floor of concern, put a
 * specific next step in front of the person, and make sure a clinician is told.
 *
 * Weights
 *   high     — floors overall concern at amber on its own
 *   elevated — floors it at yellow on its own
 *   context  — reported and acted on, but moves nothing by itself
 */

const SHORT_GAP_MONTHS = 18;

export function evaluateRiskFactors(state) {
  const factors = [];
  const add = (code, weight, label, detail) => factors.push({ code, weight, label, detail });

  const has = (flag) => state.has(flag);
  const firstBaby = state.valueOf('ctx_first_baby') === 'yes';

  // --- History of a perinatal episode --------------------------------------
  if (has('prior_postpartum_psychosis')) {
    add(
      'prior_postpartum_psychosis',
      'high',
      'A previous postpartum episode involving loss of touch with reality, or a psychiatric admission',
      'Of everything on this page, this is the one that most changes what should happen. Recurrence after a subsequent birth is high — over half in some follow-up studies — and it is one of the few perinatal situations where treatment started straight after delivery is known to prevent an episode rather than only treat one. It warrants specialist perinatal psychiatric input now, not watchful waiting.',
    );
  }
  if (has('lifetime_bipolar')) {
    add(
      'lifetime_bipolar',
      'high',
      'Bipolar disorder',
      'The weeks after a birth are the highest-risk period in the life course for a bipolar episode. This changes what medication is safe and makes perinatal psychiatric review worthwhile even when things are going well.',
    );
  }
  if (has('lifetime_psychosis')) {
    add('lifetime_psychosis', 'high', 'A previous episode of psychosis', 'Worth specialist review in the postpartum year.');
  }
  if (has('prior_perinatal_mood')) {
    add(
      'prior_perinatal_mood',
      'elevated',
      'Depression, anxiety, or intrusive thoughts after a previous birth',
      'A previous postpartum episode is the strongest single predictor there is. Estimates of recurrence range from about a quarter to about a half, higher where the earlier episode was severe. That is a reason to be seen early rather than to wait and see.',
    );
  }
  if (has('antenatal_mood')) {
    add(
      'antenatal_mood',
      'elevated',
      'Low mood or anxiety through most of this pregnancy',
      'Mood during pregnancy is one of the clearest signals of what the year after may need, and one of the most frequently missed.',
    );
  }
  if (has('prior_perinatal_trauma')) {
    add('prior_perinatal_trauma', 'context', 'A previous birth or postpartum experience that still affects you', null);
  }
  for (const [flag, label] of [
    ['lifetime_mood', 'Depression or anxiety at other times of life'],
    ['lifetime_ocd', 'OCD'],
    ['lifetime_trauma', 'PTSD or the after-effects of trauma'],
    ['lifetime_eating', 'An eating disorder'],
  ]) {
    if (has(flag)) add(flag, 'context', label, null);
  }

  // --- Barriers that showed up last time -----------------------------------
  if (has('prior_treatment_unavailable')) {
    add(
      'prior_treatment_unavailable',
      'context',
      'Asked for help after a previous birth and could not get it',
      'Worth naming directly at the next appointment, along with what got in the way, so the same wall is not hit twice.',
    );
  }
  if (has('prior_untreated')) {
    add('prior_untreated', 'context', 'Got through a previous postpartum episode without help', null);
  }
  if (has('prior_treatment_failed')) {
    add('prior_treatment_failed', 'context', 'Had help after a previous birth that did not do much', 'Worth saying what was tried, so the next attempt starts somewhere else.');
  }

  // --- Load that comes with this birth -------------------------------------
  const multiples = ['twins', 'more'].includes(state.valueOf('ctx_multiples'));
  if (multiples) {
    const twins = state.valueOf('ctx_multiples') === 'twins';
    add(
      'multiples',
      'context',
      twins ? 'Twins' : 'Triplets or more',
      twins
        ? 'Parents of twins carry a modestly higher risk of postpartum depression than parents of a single baby, concentrated in roughly the first six months.'
        : 'The evidence here is mostly drawn from twins, where risk is modestly raised in roughly the first six months. With three or more the load is greater still, and less studied.',
    );
  }

  const gapOption = optionFor(state, 'ctx_gap');
  const gapMonths = gapOption?.months ?? null;
  const shortInterval = gapMonths != null && gapMonths < SHORT_GAP_MONTHS;
  if (shortInterval) {
    add(
      'short_interval',
      'context',
      `A short gap between births — your next-youngest was ${gapOption.label.toLowerCase()}`,
      'Gaps under about 18 months are associated with a modest rise in postpartum depression, alongside less time to recover physically.',
    );
  }

  const otherNeeds = state.valueOf('ctx_other_children_needs') ?? [];
  const demandingOlderChild = otherNeeds.some((v) => ['additional_needs', 'chronic_illness'].includes(v));
  if (demandingOlderChild) {
    add(
      'older_child_needs',
      'context',
      'An older child with a disability, additional needs, or ongoing medical care',
      'Caregiving load of this kind is a well-established contributor to parental depression and is rarely accounted for in postpartum care.',
    );
  }

  if (has('less_support_than_last_time')) {
    add('less_support_than_last_time', 'context', 'Less practical help than you had with your first baby', null);
  }
  if (has('no_older_child_cover')) {
    add('no_older_child_cover', 'context', 'No one who reliably takes your other children so you can rest', null);
  }
  if (has('much_harder_than_last_time')) {
    add('harder_than_last_time', 'elevated', 'This postpartum is much harder than your previous one', 'Your own comparison across babies is worth more than any norm a questionnaire could offer.');
  } else if (has('harder_than_last_time')) {
    add('harder_than_last_time', 'context', 'This postpartum is harder than your previous one', null);
  }

  const weights = factors.map((f) => f.weight);
  const concernFloor = weights.includes('high') ? 'orange' : weights.includes('elevated') ? 'yellow' : 'green';

  return {
    factors,
    concernFloor,
    firstBaby,
    multiples,
    shortInterval,
    gapMonths,
    demandingOlderChild,
    priorPostpartumPsychosis: has('prior_postpartum_psychosis'),
    priorPerinatalMood: has('prior_perinatal_mood'),
    harderThanLastTime: has('harder_than_last_time'),
    // Barriers are separated out because they change the next step, not the level.
    barriers: factors.filter((f) => f.code.startsWith('prior_treatment') || f.code === 'prior_untreated'),
  };
}

function optionFor(state, itemId) {
  const value = state.valueOf(itemId);
  if (!value || value === 'pna') return null;
  // Imported lazily to keep this module free of a questionnaire dependency.
  return state.optionOf?.(itemId, value) ?? null;
}
