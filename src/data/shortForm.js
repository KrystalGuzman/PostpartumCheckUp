/**
 * The condensed check-up.
 *
 * A full run is long — long enough that someone answering at 3am may never
 * reach the summary, and an unfinished check-up helps nobody. The short form
 * exists so that the first pass is finishable, and so that the longer modules
 * are offered afterwards in the order the answers say they matter.
 *
 * Three rules shaped what could be cut:
 *
 *   1. Safety is never trimmed. Every safety item is asked in both versions.
 *   2. History is never trimmed. It is five questions and it carries more
 *      predictive weight than any module it sits next to.
 *   3. Adaptation is never trimmed. It is the triage instrument: it is what
 *      decides whether someone is losing ground, whatever the load looks like.
 *
 * Everything else is reduced to the items a module is defined by — its cardinal
 * symptoms plus one measure of intensity — which is enough to say "this is
 * worth a closer look" and never enough to say more than that. A module asked
 * this way is marked as screened-only, capped at moderate, and reported as
 * provisional wherever it appears.
 */

/** Sections asked in full in both versions. */
export const ALWAYS_FULL_SECTIONS = new Set(['history', 'safety', 'adaptation_check']);

/**
 * Items kept in the condensed version of every other section. Gates and
 * safety-relevant items are included so that branching still works and nothing
 * that could raise a flag is skipped.
 */
export const SHORT_FORM_ITEMS = new Set([
  // Context — enough to stage the check-up and to know who is around her.
  'ctx_birth_date',
  'ctx_stage',
  'ctx_first_baby',
  'ctx_multiples',
  'ctx_children_count',
  'ctx_gap',
  'ctx_sleep',
  'ctx_support_practical',
  'ctx_support_emotional',
  'ctx_relationship',

  // Baby blues — tearfulness, swings, and where it is heading.
  'bb_tearful',
  'bb_swings',
  'bb_overwhelmed',
  'bb_onset',
  'bb_trajectory',

  // Depression — the three cardinal symptoms and how long they have run.
  'dep_mood',
  'dep_anhedonia',
  'dep_numb',
  'dep_duration',

  // Anxiety — worry, controllability, and the physical side.
  'anx_worry',
  'anx_uncontrollable',
  'anx_physical',

  // OCD — intrusions, one compulsion, and the insight question, which is
  // safety-relevant and therefore never dropped.
  'ocd_intrusive',
  'ocd_relationship',
  'ocd_checking',
  'ocd_distress',

  // Trauma — the event gate, then intrusion and avoidance.
  'ptsd_event',
  'ptsd_intrusion',
  'ptsd_avoid',

  // Bipolar — reduced need for sleep is the gate; elevated and irritable mood
  // sit beside it. History is kept because it changes what is safe to start.
  'bip_sleep_no_need',
  'bip_elevated',
  'bip_irritable',
  'bip_history',

  // Adjustment — linkage and intensity.
  'adj_link',
  'adj_distress',
  'adj_overwhelm',

  // More than one child — torn, no recovery, and not asking.
  'sib_divided',
  'sib_no_recovery',
  'sib_should_cope',
  'sib_support_change',

  // Grief — the loss gate, then waves and being stuck.
  'grief_event',
  'grief_waves',
  'grief_stuck',

  // Physical contributors — both scored items; the module is short already.
  'med_symptoms',
  'med_discussed',

  // Support — isolation, being alone within it, and household safety, which is
  // safety-relevant and never dropped.
  'sup_isolated',
  'sup_alone_within',
  'sup_safety',

  // Pressure — the load half of the triage, at six of its nine fronts.
  'pr_body',
  'pr_sleep',
  'pr_time',
  'pr_mental_load',
  'pr_needed',
  'pr_identity',
  'pr_divided',
  'pr_vs_expected',
  'pr_confidence_split',

  // Functioning — the activities that most separate coping from not.
  'fn_get_up',
  'fn_eat',
  'fn_shower',
  'fn_baby_care',
  'fn_other_children',
  'fn_self_care',
]);

/** Scenarios are cut entirely from the condensed version. */
export const SHORT_FORM_SKIPS_SCENARIOS = true;
