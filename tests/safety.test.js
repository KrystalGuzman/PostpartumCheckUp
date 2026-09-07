import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluateSafety, evaluateFunctionalCollapse } from '../src/engine/safety.js';
import { scoreAll } from '../src/engine/scoring.js';
import { stateWith, fillDomain, CLEAN_SAFETY } from './helpers.js';

test('a clean safety screen produces no flags', () => {
  const safety = evaluateSafety(
    stateWith({
      saf_self_harm: 'none',
      saf_harm_others: 'none',
      saf_care_capacity: 'yes',
      saf_hallucination: '0',
      saf_delusion: '0',
      saf_confusion: '0',
      saf_control: '0',
      saf_reference: '0',
      saf_observed_change: '0',
    }),
  );
  assert.equal(safety.level, 'none');
  assert.equal(safety.stopScoring, false);
});

test('a single reality-testing item at "several times" is an emergency', () => {
  const safety = evaluateSafety(stateWith({ saf_delusion: '2' }));
  assert.equal(safety.level, 'emergency');
  assert.equal(safety.stopScoring, true);
});

test('two reality-testing items at "once or twice" together are an emergency', () => {
  const safety = evaluateSafety(stateWith({ saf_hallucination: '1', saf_reference: '1' }));
  assert.equal(safety.level, 'emergency');
});

test('one reality-testing item alone is urgent, and rapid onset escalates it', () => {
  assert.equal(evaluateSafety(stateWith({ saf_hallucination: '1' })).level, 'urgent');
  assert.equal(
    evaluateSafety(stateWith({ saf_hallucination: '1', saf_onset_speed: 'rapid' })).level,
    'emergency',
  );
});

test('thoughts of self-harm are graded rather than lumped together', () => {
  assert.equal(evaluateSafety(stateWith({ saf_self_harm: 'passive' })).level, 'elevated');
  assert.equal(evaluateSafety(stateWith({ saf_self_harm: 'active_no_plan' })).level, 'urgent');
  assert.equal(evaluateSafety(stateWith({ saf_self_harm: 'plan_or_intent' })).level, 'emergency');
});

test('unwanted intrusive thoughts about harm are not treated as danger', () => {
  const safety = evaluateSafety(stateWith({ ...CLEAN_SAFETY, saf_harm_others: 'intrusive' }));
  assert.equal(safety.level, 'none');
  assert.equal(safety.intrusiveHarmThoughts, true);
});

test('thoughts of harm that feel like an urge or feel justified are an emergency', () => {
  assert.equal(evaluateSafety(stateWith({ saf_harm_others: 'urge' })).level, 'emergency');
  assert.equal(evaluateSafety(stateWith({ saf_harm_others: 'justified' })).level, 'emergency');
});

test('being unable to keep everyone safe is an emergency; being unsure is urgent', () => {
  assert.equal(evaluateSafety(stateWith({ saf_care_capacity: 'no' })).level, 'emergency');
  assert.equal(evaluateSafety(stateWith({ saf_care_capacity: 'unsure' })).level, 'urgent');
});

test('losing insight into intrusive thoughts routes to the psychosis pathway', () => {
  assert.equal(evaluateSafety(stateWith({ ...CLEAN_SAFETY, ocd_relationship: 'believed' })).level, 'emergency');
  assert.equal(evaluateSafety(stateWith({ ...CLEAN_SAFETY, ocd_relationship: 'uncertain' })).level, 'urgent');
  assert.equal(evaluateSafety(stateWith({ ...CLEAN_SAFETY, ocd_relationship: 'ego_dystonic' })).level, 'none');
});

test('Part 19: a low symptom picture never cancels an emergency warning sign', () => {
  const answers = {
    ctx_stage: 'm3_6',
    saf_self_harm: 'none',
    saf_harm_others: 'none',
    saf_care_capacity: 'yes',
    saf_delusion: '2',
  };
  fillDomain(answers, 'depression', '0');
  fillDomain(answers, 'anxiety', '0');
  fillDomain(answers, 'functioning', '0');

  const scored = scoreAll(stateWith(answers));
  assert.equal(scored.byDomain.depression.band, 'minimal');
  assert.equal(scored.severityKey, 'red');
  assert.equal(scored.stopScoring, true);
});

// --- Reported by a tester: worst-case answers produced no warning ----------

const CRISIS_FUNCTIONING = {
  fn_get_up: '3', fn_eat: '3', fn_shower: '3', fn_sleep: '3',
  fn_baby_care: '3', fn_self_care: '3', fn_baby_enjoy: '3',
  fn_appointments: '3', fn_leave_house: '3', fn_work: '3',
  fn_relationships: '3', fn_responsibilities: '3',
};

test('being unable to do the basics reaches the urgent tier without a safety answer', () => {
  const state = stateWith({ ctx_stage: 'm3_6', ...CLEAN_SAFETY, ...CRISIS_FUNCTIONING });
  const safety = evaluateSafety(state);

  assert.equal(safety.level, 'urgent');
  assert.equal(safety.functionalCollapse.collapsed, true);
  assert.ok(safety.reasons.some((r) => r.code === 'functional_collapse'));

  const scored = scoreAll(state);
  assert.equal(scored.severityKey, 'red', 'a person who cannot care for themselves or the baby is not "arrange something this week"');
  assert.equal(scored.stopScoring, false, 'ordinary scoring still stands — this is not a reality-testing emergency');
});

test('functional collapse needs an actual inability, not just difficulty', () => {
  const struggling = stateWith({
    ctx_stage: 'm3_6',
    ...CLEAN_SAFETY,
    fn_get_up: '2', fn_eat: '2', fn_shower: '2', fn_sleep: '2',
    fn_baby_care: '2', fn_self_care: '2',
  });
  assert.equal(evaluateFunctionalCollapse(struggling).collapsed, false);
  assert.equal(evaluateSafety(struggling).level, 'none');

  // One area alone is not collapse; two, or care plus one, is.
  assert.equal(evaluateFunctionalCollapse(stateWith({ fn_baby_care: '3' })).collapsed, false);
  assert.equal(evaluateFunctionalCollapse(stateWith({ fn_get_up: '3', fn_eat: '3' })).collapsed, false);
  assert.equal(evaluateFunctionalCollapse(stateWith({ fn_baby_care: '3', fn_get_up: '3' })).collapsed, true);
  assert.equal(evaluateFunctionalCollapse(stateWith({ fn_get_up: '3', fn_eat: '3', fn_shower: '3' })).collapsed, true);
});

test('inability to work or leave the house is not, on its own, functional collapse', () => {
  assert.equal(evaluateFunctionalCollapse(stateWith({ fn_work: '3', fn_leave_house: '3' })).collapsed, false);
});

test('safety questions left blank are flagged rather than read as a no', () => {
  // Someone who has worked through the check-up but skipped the safety screen.
  const skipped = stateWith({ ctx_stage: 'm3_6', dep_mood: '3', dep_anhedonia: '3', dep_numb: '3' });
  const safety = evaluateSafety(skipped);
  assert.equal(safety.unansweredCount, 9);
  assert.ok(safety.reasons.some((r) => r.code === 'safety_unanswered'));
  assert.equal(safety.level, 'elevated');
  assert.equal(scoreAll(skipped).severityKey, 'orange');

  // Someone who has not reached the safety screen yet is not accused of skipping it.
  const early = stateWith({ ctx_stage: 'm3_6', ctx_first_baby: 'yes' });
  assert.equal(evaluateSafety(early).reasons.length, 0);
});

test('declining a reality-testing question is recorded, like every other safety decline', () => {
  const declined = stateWith({ ...CLEAN_SAFETY, saf_hallucination: 'pna', saf_delusion: 'pna' });
  const safety = evaluateSafety(declined);
  assert.ok(safety.reasons.some((r) => r.code === 'declined'));
  assert.equal(safety.level, 'elevated');
});

test('endorsing a reality-testing item asks how fast it came on', async () => {
  const { registry } = await import('../src/engine/questionnaire.js');
  const onset = registry.getItem('saf_onset_speed');

  assert.equal(onset.showIf(stateWith(CLEAN_SAFETY)), false);
  assert.equal(onset.showIf(stateWith({ ...CLEAN_SAFETY, saf_hallucination: '1' })), true);

  // and the rapid-onset escalation it feeds is therefore reachable
  const rapid = stateWith({ ...CLEAN_SAFETY, saf_reference: '1', saf_onset_speed: 'rapid' });
  assert.equal(evaluateSafety(rapid).level, 'emergency');
});
