import test from 'node:test';
import assert from 'node:assert/strict';

import { scoreAll } from '../src/engine/scoring.js';
import { buildProviderSummary } from '../src/engine/providerSummary.js';
import { toProviderText } from '../src/engine/summaryText.js';
import { stateWith, fillDomain } from './helpers.js';

const provider = (answers, options = {}) => {
  const state = stateWith(answers);
  return buildProviderSummary(scoreAll(state), state, { completedAt: new Date('2026-09-05T09:30:00Z'), ...options });
};

const CLEAN_SAFETY = {
  saf_self_harm: 'none',
  saf_harm_others: 'none',
  saf_care_capacity: 'yes',
  saf_hallucination: '0',
  saf_delusion: '0',
  saf_confusion: '0',
  saf_control: '0',
  saf_reference: '0',
  saf_observed_change: '0',
};

test('the handout reports safety answers in full, including the negatives', () => {
  const summary = provider({ ctx_stage: 'm3_6', ...CLEAN_SAFETY });
  assert.equal(summary.safety.items.length, 9);
  assert.ok(summary.safety.items.every((item) => item.answer && item.answer !== 'Not answered'));
  assert.ok(summary.safety.items.every((item) => item.endorsed === false));
});

test('an unanswered safety question is distinguishable from a denial', () => {
  const summary = provider({ ctx_stage: 'm3_6', saf_self_harm: 'none' });
  const unanswered = summary.safety.items.find((item) => item.id === 'saf_hallucination');
  const denied = summary.safety.items.find((item) => item.id === 'saf_self_harm');
  assert.equal(unanswered.answer, 'Not answered');
  assert.equal(denied.answer, 'No');
});

test('endorsements are marked, and benign answers are not', () => {
  const summary = provider({ ...CLEAN_SAFETY, saf_care_capacity: 'mostly', saf_self_harm: 'passive' });
  const capacity = summary.safety.items.find((item) => item.id === 'saf_care_capacity');
  const selfHarm = summary.safety.items.find((item) => item.id === 'saf_self_harm');
  assert.equal(capacity.endorsed, false, '"mostly coping" scores above zero but is not a finding');
  assert.equal(selfHarm.endorsed, true);
});

test('loss of insight into intrusive thoughts appears in the safety block', () => {
  const summary = provider({ ctx_stage: 'm3_6', ocd_intrusive: '2', ocd_relationship: 'uncertain' });
  const insight = summary.safety.items.find((item) => item.id === 'ocd_relationship');
  assert.ok(insight);
  assert.equal(insight.endorsed, true);
  assert.match(insight.text, /Insight into intrusive thoughts/);
});

test('each pattern carries the items that were actually endorsed, with their levels', () => {
  const answers = { ctx_stage: 'm3_6', dep_duration: 'm1_3' };
  fillDomain(answers, 'depression', '2');
  const depression = provider(answers).patterns.find((p) => p.domain === 'depression');

  assert.equal(depression.band, 'high');
  assert.equal(depression.percent, Math.round((depression.raw / depression.max) * 100));
  assert.ok(depression.endorsed.length >= 10);
  assert.ok(depression.endorsed.every((e) => e.score >= 1 && e.text && e.answer));
  assert.ok(depression.contextual.some((c) => /How long/.test(c.text)));
});

test('a halted result says so on the handout too', () => {
  const summary = provider({ ctx_stage: 'm3_6', saf_delusion: '2' });
  assert.equal(summary.meta.halted, true);
  assert.equal(summary.safety.level, 'emergency');
  assert.match(toProviderText(summary), /SCORING HALTED BY THE SAFETY SCREEN/);
});

test('the handout states what the numbers are not', () => {
  // Wrapping inserts newlines, so match against the unwrapped text.
  const text = toProviderText(provider({ ctx_stage: 'm3_6', ...CLEAN_SAFETY })).replace(/\s+/g, ' ');
  assert.match(text, /not a diagnosis and not a validated instrument/i);
  assert.match(text, /not EPDS, PHQ-9, GAD-7, MDQ or PCL-5 scores/);
  assert.match(text, /Declined and inapplicable items are excluded/);
});

test('the printed handout carries an identity and a date', () => {
  const text = toProviderText(provider({ ctx_stage: 'm3_6', ...CLEAN_SAFETY }, { name: 'A. Patient' }));
  assert.match(text, /Completed by: A\. Patient/);
  assert.match(text, /Completed: /);
  assert.match(text, /Stage: You are approximately 5 months postpartum/);
});

test('an anonymous handout simply omits the name', () => {
  const text = toProviderText(provider({ ctx_stage: 'm3_6', ...CLEAN_SAFETY }));
  assert.equal(/Completed by:/.test(text), false);
  assert.match(text, /Completed: /);
});

test('the handout stays within a printable line width', () => {
  const answers = { ctx_stage: 'm3_6', ...CLEAN_SAFETY, dep_duration: 'm1_3' };
  fillDomain(answers, 'depression', '3');
  fillDomain(answers, 'anxiety', '2');
  fillDomain(answers, 'functioning', '2');
  const text = toProviderText(provider(answers, { name: 'A. Patient' }));
  const tooWide = text.split('\n').filter((line) => line.length > 80);
  assert.deepEqual(tooWide, []);
});

test('the handout asserts no diagnosis', () => {
  const answers = { ctx_stage: 'm3_6', ...CLEAN_SAFETY, dep_duration: 'gt3m' };
  fillDomain(answers, 'depression', '3');
  fillDomain(answers, 'ocd', '3');
  const text = toProviderText(provider(answers));
  for (const banned of [/diagnosis of/i, /the patient has (depression|ocd|ptsd|bipolar)/i, /\bmeets criteria\b/i]) {
    assert.equal(banned.test(text), false, `"${banned}" appeared in the handout`);
  }
});

test('the handout separates symptom modules from circumstances', () => {
  const summary = provider({
    ctx_stage: 'm3_6',
    ...CLEAN_SAFETY,
    sup_judged: '3', sup_dismissed: '3', sup_isolated: '3', sup_alone_within: '3',
    dep_mood: '3', dep_anhedonia: '3', dep_numb: '2', dep_duration: 'm1_3',
  });
  assert.ok(summary.patterns.every((p) => p.domain !== 'support'));
  assert.ok(summary.contextPatterns.some((p) => p.domain === 'support'));

  const text = toProviderText(summary);
  assert.match(text, /SYMPTOM PATTERNS/);
  assert.match(text, /CONTEXT AND CIRCUMSTANCES/);
  assert.ok(text.indexOf('SYMPTOM PATTERNS') < text.indexOf('CONTEXT AND CIRCUMSTANCES'));
});

test('a capped band is explained once, not twice', () => {
  const answers = { ctx_stage: 'm3_6', ...CLEAN_SAFETY, dep_duration: 'gt3m' };
  fillDomain(answers, 'depression', '3');
  answers.dep_mood = '0';
  answers.dep_anhedonia = '0';
  answers.dep_numb = '0';

  const text = toProviderText(provider(answers));
  assert.equal((text.match(/Cardinal symptoms not endorsed/g) ?? []).length, 0);
  assert.equal((text.match(/capped at low/g) ?? []).length, 1);
  assert.match(text, /symptom load here is substantial despite the capped band/);
});
