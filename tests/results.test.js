import test from 'node:test';
import assert from 'node:assert/strict';

import { scoreAll } from '../src/engine/scoring.js';
import { buildResults, stageSentence, CLOSING } from '../src/engine/results.js';
import { toPlainText } from '../src/engine/summaryText.js';
import { stateWith, fillDomain } from './helpers.js';

const build = (answers, region = 'us') => {
  const state = stateWith(answers);
  return buildResults(scoreAll(state), state, region);
};

test('the postpartum stage is described in the units the person answered in', () => {
  assert.match(stageSentence(20), /approximately 5 months postpartum/);
  assert.match(stageSentence(4), /approximately 4 weeks postpartum/);
  assert.match(stageSentence(1), /first couple of weeks/);
  assert.match(stageSentence(null), /did not say/);
});

test('an emergency result leads with the safety statement and drops ordinary scoring', () => {
  const answers = { ctx_stage: 'w2_6', saf_hallucination: '2' };
  fillDomain(answers, 'depression', '3');
  const results = build(answers);

  assert.equal(results.emergency, true);
  assert.match(results.statement, /urgent professional assessment/);
  assert.match(results.psychosisNote, /rare but can be a medical and psychiatric emergency/);
  assert.equal(results.patterns.length, 0, 'ordinary patterns are not presented as the headline');
  assert.equal(results.closing, null, 'the supportive closing is replaced by safety instructions');
  assert.equal(results.nextSteps[0].priority, 'urgent');
  assert.match(results.nextSteps[0].text, /today/);
});

test('depression language attributes the judgment to a professional', () => {
  const answers = { ctx_stage: 'm3_6', dep_duration: 'm1_3' };
  fillDomain(answers, 'depression', '3');
  const results = build(answers);
  const depression = results.patterns.find((p) => p.domain === 'depression');

  assert.equal(
    depression.statement,
    'Your responses show several symptoms commonly associated with depression. A healthcare professional can determine whether they meet criteria for a depressive disorder.',
  );
});

test('OCD language names the pattern, not the person', () => {
  const answers = { ctx_stage: 'm3_6', ocd_time: 'gt3h' };
  fillDomain(answers, 'ocd', '3');
  const results = build(answers);
  const ocd = results.patterns.find((p) => p.domain === 'ocd');

  assert.equal(
    ocd.statement,
    'Your responses show a pattern of intrusive thoughts and repetitive behaviors that can occur with postpartum OCD. Consider discussing this pattern with a qualified mental-health professional.',
  );
});

test('a quiet result says what the screening did not find, not that the person is fine', () => {
  const results = build({ ctx_stage: 'm3_6' });
  assert.equal(
    results.lowConcernStatement,
    'Your responses do not currently suggest a high level of concern based on this screening, although this check-up cannot rule out a mental-health condition.',
  );
  assert.equal(results.closing, CLOSING);
});

test('intrusive thoughts get an explicit note separating them from intent', () => {
  const results = build({ ctx_stage: 'm3_6', saf_harm_others: 'intrusive' });
  const note = results.notes.find((n) => n.includes('intrusive'));
  assert.ok(note);
  assert.match(note, /not an intention/);
  assert.equal(results.emergency, false);
});

test('bipolar warning signs change the advice about medication', () => {
  const results = build({
    ctx_stage: 'm3_6',
    bip_sleep_no_need: '3',
    bip_elevated: '3',
    bip_energy: '2',
    bip_racing: '2',
    bip_same_period: 'yes',
  });
  assert.ok(results.nextSteps.some((s) => /bipolar-spectrum assessment/.test(s.text)));
  assert.ok(results.providerQuestions.some((q) => /before considering an antidepressant/.test(q)));
});

test('physical contributors produce a medical next step rather than a psychiatric one only', () => {
  const results = build({ ctx_stage: 'm3_6', med_symptoms: ['anemia', 'thyroid'], med_checkup: 'no' });
  assert.ok(results.nextSteps.some((s) => /anemia and thyroid/.test(s.text)));
  assert.ok(results.providerQuestions.some((q) => /thyroid function/.test(q)));
});

test('feeding method shapes the medication question without judging the method', () => {
  const results = build({ ctx_stage: 'm3_6', ctx_feeding: ['breast'], dep_mood: '3', dep_anhedonia: '3' });
  assert.ok(results.providerQuestions.some((q) => /compatible with how I am feeding/.test(q)));

  const formula = build({ ctx_stage: 'm3_6', ctx_feeding: ['formula'], dep_mood: '3', dep_anhedonia: '3' });
  assert.equal(formula.providerQuestions.some((q) => /compatible with how I am feeding/.test(q)), false);
});

test('an interpersonal safety answer is routed to a confidential source of help', () => {
  const results = build({ ctx_stage: 'm3_6', sup_safety: 'no' });
  assert.ok(results.nextSteps.some((s) => /domestic-abuse advocate/.test(s.text)));
  assert.ok(['orange', 'red'].includes(results.severity.key));
});

test('the region choice decides which crisis resources appear', () => {
  assert.match(build({ ctx_stage: 'm3_6' }, 'uk').resources.emergency.contact, /999/);
  assert.match(build({ ctx_stage: 'm3_6' }, 'au').resources.lines[0].name, /PANDA/);
});

test('no result text asserts a diagnosis or dismisses the person', () => {
  const cases = [
    { ctx_stage: 'm3_6' },
    Object.assign(fillDomain({ ctx_stage: 'm3_6' }, 'depression', '3'), { dep_duration: 'gt3m' }),
    fillDomain({ ctx_stage: 'w2_6' }, 'anxiety', '3'),
    fillDomain({ ctx_stage: 'm6_9' }, 'ocd', '3'),
    { ctx_stage: 'm3_6', saf_delusion: '3' },
  ];

  const banned = [
    /you are depressed/i,
    /you have (ocd|ptsd|bipolar|depression|anxiety|postpartum)/i,
    /you'?re fine/i,
    /you are diagnosed/i,
    /\b(is|are|was|were) a diagnosis of/i,
  /we can diagnose/i,
    /because you love/i,
    /just anxiety/i,
    /severe anxiety\b(?![^.]*not)/i,
  ];

  for (const answers of cases) {
    const text = toPlainText(build(answers));
    for (const pattern of banned) {
      assert.equal(pattern.test(text), false, `"${pattern}" appeared in a result:\n${text}`);
    }
    assert.match(text, /not a diagnosis/i);
  }
});

test('the plain-text summary carries the parts a clinician would want', () => {
  const answers = { ctx_stage: 'm3_6', dep_duration: 'm1_3' };
  fillDomain(answers, 'depression', '2');
  fillDomain(answers, 'functioning', '2');
  const text = toPlainText(build(answers));

  assert.match(text, /POSTPARTUM CHECK-UP SUMMARY/);
  assert.match(text, /Stage: You are approximately 5 months postpartum/);
  assert.match(text, /Overall: /);
  assert.match(text, /Functional impact: /);
  assert.match(text, /STRONGEST PATTERNS/);
  assert.match(text, /SUGGESTED NEXT STEPS/);
  assert.match(text, /QUESTIONS TO BRING TO A HEALTHCARE PROVIDER/);
  assert.match(text, /988/);
  assert.ok(text.split('\n').every((line) => line.length <= 80));
});

test('when scoring is halted the summary says so rather than reporting nothing found', () => {
  const results = build({ ctx_stage: 'm3_6', saf_delusion: '3' });
  assert.match(results.scoringHalted, /Ordinary scoring has been stopped/);
  const text = toPlainText(results);
  assert.equal(/No pattern stood out/i.test(text), false);
  assert.match(text, /Ordinary scoring has been stopped/);
});

test('an unanswered functioning section is reported as unknown, not as no impact', () => {
  const results = build({ ctx_stage: 'm3_6', dep_mood: '3', dep_anhedonia: '3' });
  assert.equal(results.functionalImpact.tier, 'unknown');
  assert.match(results.functionalImpact.label, /left unanswered/);
});

test('an emergency in a home that does not feel safe changes who to involve', () => {
  const results = build({ ctx_stage: 'm3_6', saf_care_capacity: 'no', sup_safety: 'no' });
  assert.equal(results.emergency, true);
  assert.ok(results.nextSteps.some((s) => /outside your home/.test(s.text)));
});

test('bipolar history without current warning signs is asked about without asserting symptoms', () => {
  const results = build({ ctx_stage: 'm3_6', bip_history: ['family'] });
  assert.equal(results.providerQuestions.some((q) => /I have had periods of high energy/.test(q)), false);
  assert.ok(results.providerQuestions.some((q) => /bipolar disorder in my history or my family/.test(q)));
});

test("the baby's age is calculated from a date of birth, in the units parents use", async () => {
  const { describeAge } = await import('../src/engine/results.js');
  assert.equal(describeAge(0.5), '4 days old');
  assert.equal(describeAge(4), '4 weeks old');
  assert.equal(describeAge(19), '4 months and 2 weeks old');
  assert.equal(describeAge(43.5), '10 months old');
  assert.equal(describeAge(52), '1 year old');
  assert.equal(describeAge(61), '1 year and 2 months old');
});

test('a date of birth gives the exact stage; the band is only a fallback', async () => {
  const { registry } = await import('../src/engine/questionnaire.js');
  const { createState } = await import('../src/engine/state.js');

  const born = new Date(Date.now() - 19 * 7 * 86400000).toISOString().slice(0, 10);
  const exact = createState(registry).set('ctx_birth_date', born);
  assert.ok(Math.abs(exact.weeksPostpartum - 19) < 0.2);
  assert.match(stageSentence(exact.weeksPostpartum, true), /Your baby is 4 months and 2 weeks old/);

  const declined = createState(registry).set('ctx_birth_date', 'pna').set('ctx_stage', 'm6_9');
  assert.equal(declined.weeksFromBirthDate, null);
  assert.equal(declined.weeksPostpartum, 32);

  const future = createState(registry).set('ctx_birth_date', '2099-01-01');
  assert.equal(future.weeksFromBirthDate, null, 'a future date is a typo, not a stage');
});

test('a band held down by the cardinal rule still reports the symptom load behind it', () => {
  const answers = { ctx_stage: 'm3_6', dep_duration: 'gt3m' };
  fillDomain(answers, 'depression', '3');
  answers.dep_mood = '0';
  answers.dep_anhedonia = '0';
  answers.dep_numb = '0';

  const results = build(answers);
  const depression = results.patterns.find((p) => p.domain === 'depression');
  assert.equal(depression.band, 'low');
  assert.match(depression.reviewNote, /worth putting in front of a professional/);
  assert.match(depression.reviewNote, /persistent low mood, loss of interest, or emotional numbness/);
});

test('an urgent reality-testing flag is explained rather than left as a label', () => {
  const results = build({ ctx_stage: 'm3_6', saf_reference: '1' });
  assert.equal(results.emergency, false, 'one endorsement at "once or twice" is not an emergency');
  const note = results.notes.find((n) => /losing touch with what is real/.test(n));
  assert.ok(note);
  assert.match(note, /days rather than months/);
  assert.equal(results.severity.key, 'red');
});

test('circumstances are reported separately from symptom patterns', () => {
  const answers = {
    ctx_stage: 'm3_6',
    sup_judged: '3', sup_dismissed: '3', sup_isolated: '3', sup_alone_within: '3',
    dep_mood: '3', dep_anhedonia: '3', dep_numb: '2', dep_duration: 'm1_3',
  };
  const results = build(answers);
  assert.ok(results.patterns.every((p) => p.domain !== 'support'));
  assert.ok(results.contextPatterns.some((p) => p.domain === 'support'));
  assert.match(toPlainText(results), /CONTEXT AROUND YOU/);
});
