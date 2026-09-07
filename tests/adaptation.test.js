import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluateAdaptation } from '../src/engine/adaptation.js';
import { scoreAll } from '../src/engine/scoring.js';
import { buildResults } from '../src/engine/results.js';
import { toPlainText, toProviderText } from '../src/engine/summaryText.js';
import { buildProviderSummary } from '../src/engine/providerSummary.js';
import { stateWith, CLEAN_SAFETY } from './helpers.js';

const LOW_PRESSURE = {
  pr_body: '1', pr_sleep: '1', pr_time: '1', pr_mental_load: '1',
  pr_money: '0', pr_relationship: '0', pr_needed: '1', pr_identity: '1', pr_judged: '0',
};
const HIGH_PRESSURE = {
  pr_body: '3', pr_sleep: '3', pr_time: '3', pr_mental_load: '3',
  pr_money: '2', pr_relationship: '2', pr_needed: '3', pr_identity: '2', pr_judged: '2',
};
const ADAPTING = {
  ad_direction: '0', ad_restoration: '0', ad_confidence: '0',
  ad_forward: '0', ad_margin: '1', ad_effort: '1', ad_good_moments: '0',
};
const LOSING = {
  ad_direction: '3', ad_restoration: '3', ad_confidence: '2',
  ad_forward: '3', ad_margin: '3', ad_effort: '3', ad_good_moments: '2',
};

test('load and adaptation are measured separately and crossed', () => {
  const quadrant = (answers) => evaluateAdaptation(stateWith(answers)).quadrant.key;
  assert.equal(quadrant({ ...LOW_PRESSURE, ...ADAPTING }), 'settled');
  assert.equal(quadrant({ ...HIGH_PRESSURE, ...ADAPTING }), 'carrying');
  assert.equal(quadrant({ ...HIGH_PRESSURE, ...LOSING }), 'outrun');
  assert.equal(quadrant({ ...LOW_PRESSURE, ...LOSING }), 'unexplained');
});

test('a heavy load carried well is not turned into a clinical finding', () => {
  const state = stateWith({ ctx_stage: 'm3_6', ...CLEAN_SAFETY, ...HIGH_PRESSURE, ...ADAPTING });
  const scored = scoreAll(state);
  const results = buildResults(scored, state, 'us');

  assert.equal(scored.byDomain.pressure.band, 'high');
  assert.equal(scored.byDomain.adaptation.band, 'minimal');
  assert.equal(scored.severityKey, 'green', 'pressure alone must not raise the level');
  assert.match(results.load.statement, /not a reason to keep carrying this indefinitely/);
  assert.ok(results.nextSteps.some((s) => /subtraction rather than treatment/.test(s.text)));
});

test('losing ground without a load to explain it raises concern and says why', () => {
  const state = stateWith({ ctx_stage: 'm3_6', ...LOW_PRESSURE, ...LOSING });
  const scored = scoreAll(state);
  const results = buildResults(scored, state, 'us');

  assert.equal(results.load.key, 'unexplained');
  assert.ok(scored.drivers.some((d) => /without a load that accounts for it/.test(d)));
  assert.ok(['yellow', 'orange'].includes(scored.severityKey));
  assert.match(results.load.statement, /nothing to complain about/);
  assert.ok(results.nextSteps.some((s) => /reason to be assessed rather than a reason to doubt yourself/.test(s.text)));
  assert.ok(results.providerQuestions.some((q) => /not especially hard right now and I am still losing ground/.test(q)));
});

test('pressure is reported as circumstance and never drives the level', () => {
  const scored = scoreAll(stateWith({ ctx_stage: 'm3_6', ...CLEAN_SAFETY, ...HIGH_PRESSURE }));
  assert.equal(scored.byDomain.pressure.group, 'context');
  assert.ok(scored.rankedContext.some((d) => d.domain === 'pressure'));
  assert.equal(scored.rankedSymptoms.some((d) => d.domain === 'pressure'), false);
  assert.equal(scored.severityKey, 'green');
});

test('rest no longer restoring is called out on its own', () => {
  const state = stateWith({ ctx_stage: 'm3_6', ...LOW_PRESSURE, ...ADAPTING, ad_restoration: '3' });
  const results = buildResults(scoreAll(state), state, 'us');
  assert.equal(evaluateAdaptation(state).restNotRestoring, true);
  assert.ok(results.notes.some((n) => /exhaustion that rest does not touch/.test(n)));
  assert.ok(results.nextSteps.some((s) => /separates exhaustion from sleep debt/.test(s.text)));
});

test('the difference in pressure since the last baby is captured, not just its size', () => {
  const state = stateWith({
    ctx_stage: 'm3_6',
    ctx_first_baby: 'no',
    ...HIGH_PRESSURE,
    ...LOSING,
    pr_divided: '3',
    pr_shifted: ['confident_depleted', 'logistics', 'less_help'],
    pr_confidence_split: 'confident_baby_struggling_rest',
  });
  const adaptation = evaluateAdaptation(state);
  assert.equal(adaptation.competentButDepleted, true);
  assert.equal(adaptation.shiftLabels.length, 3);

  const results = buildResults(scoreAll(state), state, 'us');
  assert.ok(results.load.shiftLabels.some((l) => /more confident with the baby, but more depleted/i.test(l)));
  assert.ok(results.notes.some((n) => /Knowing what to do with a baby and having the capacity/.test(n)));
  assert.match(toPlainText(results), /Compared with last time:/);
});

test('the split between confidence and capacity is only asked of parents who have done it before', async () => {
  const { registry } = await import('../src/engine/questionnaire.js');
  const item = registry.getItem('pr_confidence_split');
  assert.equal(item.showIf(stateWith({ ctx_first_baby: 'yes' })), false);
  assert.equal(item.showIf(stateWith({ ctx_first_baby: 'no' })), true);
  assert.equal(registry.getItem('pr_divided').showIf(stateWith({ ctx_first_baby: 'yes' })), false);
});

test('the crossing is withheld when too little of it was answered', () => {
  const sparse = evaluateAdaptation(stateWith({ pr_body: '3', ad_direction: '3' }));
  assert.equal(sparse.answered, false);
  assert.equal(sparse.quadrant, null);

  const state = stateWith({ ctx_stage: 'm3_6', pr_body: '3', ad_direction: '3' });
  assert.equal(buildResults(scoreAll(state), state, 'us').load, null);
});

test('the handout carries the crossing with both raw scores', () => {
  const state = stateWith({ ctx_stage: 'm3_6', ...HIGH_PRESSURE, ...LOSING });
  const summary = buildProviderSummary(scoreAll(state), state, {});
  assert.equal(summary.load.key, 'outrun');
  assert.equal(summary.load.pressureMax, 27);
  assert.equal(summary.load.adaptationMax, 21);

  const text = toProviderText(summary);
  assert.match(text, /LOAD AND ADAPTATION/);
  assert.match(text, /Pressure: high \(\d+\/27\)/);
  assert.match(text, /Adaptation: losing \(\d+\/21\)/);
  assert.ok(text.indexOf('LOAD AND ADAPTATION') < text.indexOf('SYMPTOM PATTERNS'));
});
