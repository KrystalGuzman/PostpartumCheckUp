import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluateRiskFactors } from '../src/engine/riskFactors.js';
import { evaluateSafety } from '../src/engine/safety.js';
import { scoreAll, scoreDomain } from '../src/engine/scoring.js';
import { buildResults } from '../src/engine/results.js';
import { toPlainText, toProviderText } from '../src/engine/summaryText.js';
import { buildProviderSummary } from '../src/engine/providerSummary.js';
import { stateWith, fillDomain } from './helpers.js';

const codes = (state) => evaluateRiskFactors(state).factors.map((f) => f.code);

test('no history means no risk factors and no change to the floor', () => {
  const risk = evaluateRiskFactors(stateWith({ ctx_first_baby: 'yes', hist_lifetime: ['none'], hist_pregnancy_mood: 'fine' }));
  assert.deepEqual(risk.factors, []);
  assert.equal(risk.concernFloor, 'green');
});

test('a previous perinatal episode raises the floor to yellow without inventing symptoms', () => {
  const state = stateWith({ ctx_first_baby: 'no', hist_previous_perinatal: ['depression'] });
  assert.ok(codes(state).includes('prior_perinatal_mood'));
  assert.equal(evaluateRiskFactors(state).concernFloor, 'yellow');

  const scored = scoreAll(state);
  assert.equal(scored.severityKey, 'yellow');
  assert.equal(scored.byDomain.depression.band, 'minimal', 'history must not create a symptom pattern');
  assert.ok(scored.drivers.some((d) => /your history/.test(d)));
});

test('a previous postpartum psychosis raises the floor to amber and drives a specific plan', () => {
  const state = stateWith({ ctx_first_baby: 'no', hist_previous_perinatal: ['psychosis'] });
  const risk = evaluateRiskFactors(state);
  assert.equal(risk.priorPostpartumPsychosis, true);
  assert.equal(risk.concernFloor, 'orange');

  const results = buildResults(scoreAll(state), state, 'us');
  assert.equal(results.severity.key, 'orange');
  assert.ok(results.nextSteps.some((s) => /referred to a psychiatrist/.test(s.text)));
  assert.ok(results.nextSteps.some((s) => /plan with someone close to you/.test(s.text)));
  assert.ok(results.notes.some((n) => /recurrence after a later birth is high/.test(n)));
  assert.ok(results.providerQuestions.some((q) => /monitoring or preventive treatment/.test(q)));
});

test('a previous postpartum psychosis lowers the threshold on the current safety screen', () => {
  const withHistory = stateWith({ hist_previous_perinatal: ['psychosis'], saf_hallucination: '1' });
  const without = stateWith({ saf_hallucination: '1' });
  assert.equal(evaluateSafety(withHistory).level, 'emergency');
  assert.equal(evaluateSafety(without).level, 'urgent');
  assert.match(
    evaluateSafety(withHistory).reasons.find((r) => r.code === 'psychosis').label,
    /postpartum psychotic episode before/,
  );
});

test('load factors are reported but never move the level on their own', () => {
  const state = stateWith({
    ctx_first_baby: 'no',
    ctx_multiples: 'twins',
    ctx_gap: 'lt12m',
    ctx_other_children_needs: ['additional_needs'],
    sib_support_change: 'much_less',
    sib_older_care: 'no',
  });
  const risk = evaluateRiskFactors(state);
  assert.ok(codes(state).includes('multiples'));
  assert.ok(codes(state).includes('short_interval'));
  assert.ok(codes(state).includes('older_child_needs'));
  assert.equal(risk.shortInterval, true);
  assert.equal(risk.concernFloor, 'green', 'circumstances alone are not a level of concern');
  assert.equal(scoreAll(state).severityKey, 'green');
});

test('a short gap is judged on months, not on the fact of having two children', () => {
  assert.equal(evaluateRiskFactors(stateWith({ ctx_first_baby: 'no', ctx_gap: 'm12_18' })).shortInterval, true);
  assert.equal(evaluateRiskFactors(stateWith({ ctx_first_baby: 'no', ctx_gap: 'y2_3' })).shortInterval, false);
});

test('the sibling module is only asked of parents who have other children', async () => {
  const { visibleItems, sections } = await import('../src/engine/questionnaire.js');
  const module = sections.find((s) => s.id === 'siblings');
  assert.equal(module.showIf(stateWith({ ctx_first_baby: 'yes' })), false);
  assert.equal(module.showIf(stateWith({ ctx_first_baby: 'no' })), true);
  assert.ok(visibleItems(module, stateWith({ ctx_first_baby: 'no' })).length > 8);
});

test('sibling strain is scored as load and reported without pathologizing family size', () => {
  const answers = { ctx_first_baby: 'no' };
  fillDomain(answers, 'siblings', '3');
  const scored = scoreDomain('siblings', stateWith(answers));
  assert.equal(scored.band, 'high');
  assert.equal(scored.group, 'symptom');

  const state = stateWith(answers);
  const results = buildResults(scoreAll(state), state, 'us');
  const siblings = results.patterns.find((p) => p.domain === 'siblings');
  assert.match(siblings.statement, /description of circumstances, not of something wrong with you/);
});

test('the result refuses to claim that a later baby is harder than a first', () => {
  const state = stateWith({ ctx_first_baby: 'no', hist_compare: 'harder' });
  // Wrapping inserts newlines, so match against the unwrapped text.
  const text = toPlainText(buildResults(scoreAll(state), state, 'us')).replace(/\s+/g, ' ');
  assert.match(text, /genuinely unsettled in the research/);
  assert.equal(/second (baby|time) is harder/i.test(text), false);
  assert.match(text, /Experience is not immunity/);
});

test('the handout reports risk factors separately from symptoms, graded', () => {
  const state = stateWith({
    ctx_first_baby: 'no',
    hist_previous_perinatal: ['psychosis'],
    hist_lifetime: ['bipolar'],
    ctx_gap: 'lt12m',
    dep_mood: '2',
    dep_anhedonia: '2',
    dep_numb: '2',
    dep_energy: '2',
  });
  const summary = buildProviderSummary(scoreAll(state), state, {});
  assert.ok(summary.risk.factors.some((f) => f.weight === 'high'));

  const text = toProviderText(summary);
  assert.match(text, /RISK FACTORS/);
  assert.match(text, /\[high\] A previous postpartum episode/);
  assert.match(text, /\[context\] A short gap between births/);
  assert.ok(text.indexOf('RISK FACTORS') < text.indexOf('SYMPTOM PATTERNS'));
  assert.match(text.replace(/\s+/g, ' '), /never scored into a band/);
});

test('first-time parents are not shown any of the more-than-one-child material', () => {
  const state = stateWith({ ctx_first_baby: 'yes', hist_lifetime: ['none'] });
  const results = buildResults(scoreAll(state), state, 'us');
  assert.equal(results.patterns.some((p) => p.domain === 'siblings'), false);
  assert.equal(results.notes.some((n) => /Experience is not immunity/.test(n)), false);
  assert.equal(results.nextSteps.some((s) => /older children/.test(s.text)), false);
});
