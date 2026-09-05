import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluateSafety } from '../src/engine/safety.js';
import { scoreAll } from '../src/engine/scoring.js';
import { stateWith, fillDomain } from './helpers.js';

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
  const safety = evaluateSafety(stateWith({ saf_harm_others: 'intrusive' }));
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
  assert.equal(evaluateSafety(stateWith({ ocd_relationship: 'believed' })).level, 'emergency');
  assert.equal(evaluateSafety(stateWith({ ocd_relationship: 'uncertain' })).level, 'urgent');
  assert.equal(evaluateSafety(stateWith({ ocd_relationship: 'ego_dystonic' })).level, 'none');
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
