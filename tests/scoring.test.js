import test from 'node:test';
import assert from 'node:assert/strict';

import { scoreDomain, scoreAll, scoreFunctioning, evaluateBipolar } from '../src/engine/scoring.js';
import { stateWith, fillDomain } from './helpers.js';

test('declined questions are left out of the ratio rather than counted as zero', () => {
  const declined = scoreDomain('depression', stateWith({ dep_mood: '3', dep_anhedonia: '3', dep_numb: 'pna' }));
  const zeroed = scoreDomain('depression', stateWith({ dep_mood: '3', dep_anhedonia: '3', dep_numb: '0' }));
  assert.equal(declined.max, 6);
  assert.equal(zeroed.max, 9);
  assert.ok(declined.ratio > zeroed.ratio);
});

test('a module without its cardinal symptoms is capped, however many other items are endorsed', () => {
  const answers = {};
  fillDomain(answers, 'depression', '3');
  answers.dep_mood = '0';
  answers.dep_anhedonia = '0';
  answers.dep_numb = '0';

  const scored = scoreDomain('depression', stateWith(answers));
  assert.equal(scored.cardinalMet, false);
  assert.equal(scored.band, 'low');
  assert.ok(scored.modifiers.some((m) => m.reason.includes('this pattern is defined by')));
});

test('depression under two weeks old is capped, and duration over three months raises the floor', () => {
  const answers = {};
  fillDomain(answers, 'depression', '3');

  const brief = scoreDomain('depression', stateWith({ ...answers, dep_duration: 'lt2w' }));
  assert.equal(brief.band, 'moderate');
  assert.ok(brief.modifiers.some((m) => m.reason.includes('less than two weeks')));

  const long = scoreDomain('depression', stateWith({ ...answers, dep_duration: 'gt3m' }));
  assert.equal(long.band, 'high');
});

test('uncontrollable worry raises the anxiety band', () => {
  const answers = { anx_worry: '2', anx_uncontrollable: '2', anx_catastrophic: '1', anx_dread: '1', anx_onedge: '1' };
  const steerable = scoreDomain('anxiety', stateWith({ ...answers, anx_control: 'can' }));
  const runaway = scoreDomain('anxiety', stateWith({ ...answers, anx_control: 'never' }));
  assert.equal(steerable.band, 'moderate');
  assert.equal(runaway.band, 'high');
  assert.ok(runaway.modifiers.some((m) => m.reason.includes('steer')));
});

test('hours a day lost to intrusive thoughts and rituals raises the OCD band', () => {
  const answers = { ocd_intrusive: '2', ocd_distress: '2', ocd_checking: '1', ocd_reassurance: '1' };
  const brief = scoreDomain('ocd', stateWith({ ...answers, ocd_time: 'lt1h' }));
  const consuming = scoreDomain('ocd', stateWith({ ...answers, ocd_time: 'gt3h' }));
  assert.ok(['low', 'moderate'].includes(brief.band));
  assert.equal(consuming.band, 'high');
});

test('exhaustion is not scored as a bipolar warning sign', () => {
  const tired = evaluateBipolar(
    stateWith({
      ctx_sleep: 'very_short',
      bip_sleep_no_need: '0',
      bip_irritable: '2',
      bip_racing: '2',
      bip_energy: '0',
    }),
  );
  assert.equal(tired.warning, false);
});

test('reduced need for sleep alongside elevated mood is a bipolar warning sign', () => {
  const state = stateWith({
    bip_sleep_no_need: '3',
    bip_elevated: '2',
    bip_energy: '2',
    bip_racing: '2',
    bip_same_period: 'yes',
    bip_duration: 'd4_6',
  });
  const bipolar = evaluateBipolar(state);
  assert.equal(bipolar.warning, true);

  const scored = scoreAll(state);
  assert.ok(['orange', 'red'].includes(scored.severityKey));
  assert.ok(scored.drivers.some((d) => d.includes('bipolar')));
});

test('baby blues needs early onset, a settling trajectory, and room to breathe', () => {
  const settling = scoreAll(
    stateWith({
      ctx_stage: 'w2_6',
      bb_tearful: '2',
      bb_swings: '2',
      bb_irritable: '1',
      bb_sensitive: '1',
      bb_overwhelmed: '1',
      bb_concentration: '1',
      bb_onset: 'first_days',
      bb_trajectory: 'better',
      bb_impairment: 'yes_often',
    }),
  );
  assert.equal(settling.babyBlues.consistent, true);

  const worsening = scoreAll(
    stateWith({
      ctx_stage: 'w2_6',
      bb_tearful: '3',
      bb_swings: '3',
      bb_irritable: '3',
      bb_sensitive: '3',
      bb_overwhelmed: '3',
      bb_concentration: '3',
      bb_onset: 'first_days',
      bb_trajectory: 'worse',
      bb_impairment: 'no',
    }),
  );
  assert.equal(worsening.babyBlues.consistent, false);
  assert.ok(worsening.babyBlues.reasons.length > 0);
});

test('the baby blues pattern is not offered months down the line', () => {
  const scored = scoreAll(stateWith({ ctx_stage: 'm6_9', bb_tearful: '3', bb_swings: '3' }));
  assert.equal(scored.babyBlues.applicable, false);
});

test('functioning tiers track difficulty, and severe self-care difficulty lifts the tier', () => {
  const answers = {};
  fillDomain(answers, 'functioning', '0');
  assert.equal(scoreFunctioning(stateWith(answers)).tier, 'little');

  fillDomain(answers, 'functioning', '3');
  assert.equal(scoreFunctioning(stateWith(answers)).tier, 'severe');

  const mostlyFine = {};
  fillDomain(mostlyFine, 'functioning', '0');
  mostlyFine.fn_self_care = '3';
  mostlyFine.fn_eat = '3';
  assert.equal(scoreFunctioning(stateWith(mostlyFine)).tier, 'significant');
});

test('grief on its own does not get escalated into a clinical concern', () => {
  const answers = {
    ctx_stage: 'm3_6',
    grief_event: ['birth_experience'],
    grief_waves: '3',
    grief_yearning: '3',
    grief_avoid: '2',
    grief_stuck: '2',
  };
  fillDomain(answers, 'functioning', '0');
  const scored = scoreAll(stateWith(answers));
  assert.equal(scored.byDomain.grief.band, 'high');
  assert.equal(scored.severityKey, 'yellow');
});

test('multiple patterns can be reported at once rather than forced into one category', () => {
  const answers = { ctx_stage: 'm3_6' };
  fillDomain(answers, 'depression', '2');
  fillDomain(answers, 'anxiety', '2');
  fillDomain(answers, 'ocd', '2');
  answers.dep_duration = 'm1_3';
  const scored = scoreAll(stateWith(answers));
  const strong = scored.ranked.filter((d) => ['moderate', 'high'].includes(d.band)).map((d) => d.domain);
  assert.ok(strong.includes('depression'));
  assert.ok(strong.includes('anxiety'));
  assert.ok(strong.includes('ocd'));
});

test('an empty check-up reports low concern rather than reassurance', () => {
  const scored = scoreAll(stateWith({ ctx_stage: 'm3_6' }));
  assert.equal(scored.severityKey, 'green');
  assert.equal(scored.ranked.length, 0);
});

test('scenario weights reach every domain an option touches, declared or not', async () => {
  const { scenarios } = await import('../src/data/scenarios.js');
  for (const scenarioItem of scenarios) {
    const weighted = new Set(scenarioItem.options.flatMap((o) => Object.keys(o.weights ?? {})));
    for (const domain of weighted) {
      assert.ok(
        scenarioItem.domains.includes(domain),
        `${scenarioItem.id} weights ${domain} but does not declare it, so the weight would be dropped`,
      );
    }
  }
});

test('a scenario answered "not part of my experience" is dropped rather than scored as low', () => {
  const shared = { ctx_stage: 'm3_6', ctx_medical: ['nicu'] };
  const skipped = scoreDomain('trauma', stateWith({ ...shared, sc_birth_nicu: 'na' }));
  const answered = scoreDomain('trauma', stateWith({ ...shared, sc_birth_nicu: 'through' }));
  assert.equal(skipped.max, 0);
  assert.equal(answered.max, 3);
});

test('support strain is described but never drives the severity band', () => {
  const answers = { ctx_stage: 'm3_6', sup_judged: '3', sup_dismissed: '3', sup_isolated: '3', sup_alone_within: '3' };
  const scored = scoreAll(stateWith(answers));
  assert.equal(scored.byDomain.support.band, 'high');
  assert.equal(scored.severityKey, 'green');
});

test('a cap is a ceiling: a later floor cannot overrule the cardinal-symptom rule', () => {
  const answers = { dep_duration: 'gt3m', dep_distress: '3' };
  fillDomain(answers, 'depression', '3');
  answers.dep_mood = '0';
  answers.dep_anhedonia = '0';
  answers.dep_numb = '0';

  const scored = scoreDomain('depression', stateWith(answers));
  assert.equal(scored.cardinalMet, false);
  assert.equal(scored.band, 'low', 'duration and distress floors must not lift a cardinal-capped band');
  assert.equal(scored.cappedButLoaded, true, 'the symptom load behind the cap is still reported');
});

test('two cardinal symptoms present at a low level satisfy the cardinal rule', () => {
  const base = { ptsd_event: ['frightening'], ptsd_hypervigilance: '2', ptsd_detachment: '2' };
  const single = scoreDomain('trauma', stateWith({ ...base, ptsd_intrusion: '1' }));
  const pair = scoreDomain('trauma', stateWith({ ...base, ptsd_intrusion: '1', ptsd_avoid: '1' }));
  assert.equal(single.cardinalMet, false);
  assert.equal(pair.cardinalMet, true);
});

test('several symptoms at the top of the scale outweigh a diluted average', () => {
  const answers = {
    anx_worry: '3', anx_uncontrollable: '3', anx_catastrophic: '3', anx_onedge: '3', anx_relax: '3',
    anx_dread: '2', anx_irritable: '1', anx_sleep: '1',
    anx_racing: '0', anx_physical: '0', anx_avoid: '0', anx_panic: '0',
  };
  const scored = scoreDomain('anxiety', stateWith(answers));
  assert.ok(scored.ratio < 0.55, 'the raw average alone would read as moderate');
  assert.equal(scored.band, 'high');
  assert.ok(scored.modifiers.some((m) => m.reason.includes('top of the scale')));
});

test('a clustered episode of reduced need for sleep is caught even when the other features are mild', () => {
  const bipolar = evaluateBipolar(
    stateWith({
      bip_sleep_no_need: '2',
      bip_confidence: '3',
      bip_elevated: '1',
      bip_irritable: '1',
      bip_energy: '1',
      bip_activity: '1',
      bip_impulsive: '1',
      bip_same_period: 'yes',
      bip_duration: 'd4_6',
      bip_impact: 'noticed',
    }),
  );
  assert.equal(bipolar.warning, true);
});

test('the symptoms exhaustion actually produces do not reach the bipolar warning', () => {
  // Irritability and racing thoughts are what being shattered looks like. What
  // separates the two pictures is energy: more of it, not less, and not needing
  // sleep to get it.
  const exhausted = {
    ctx_sleep: 'very_short',
    bip_sleep_no_need: '0',
    bip_irritable: '3', bip_racing: '3',
    bip_energy: '0', bip_activity: '0', bip_impulsive: '0', bip_confidence: '0', bip_elevated: '0',
    bip_same_period: 'yes', bip_duration: 'w1plus', bip_impact: 'problems',
  };
  assert.equal(evaluateBipolar(stateWith(exhausted)).warning, false);

  // The same answers, plus running on no sleep and feeling fine on it, do.
  assert.equal(
    evaluateBipolar(stateWith({ ...exhausted, bip_sleep_no_need: '2', bip_energy: '2' })).warning,
    true,
  );
});

test('circumstances are never ranked among the symptom patterns', () => {
  const answers = {
    ctx_stage: 'm3_6',
    sup_judged: '3', sup_dismissed: '3', sup_isolated: '3', sup_alone_within: '3',
    dep_mood: '2', dep_anhedonia: '2', dep_numb: '1', dep_duration: 'm1_3',
  };
  const scored = scoreAll(stateWith(answers));
  assert.equal(scored.byDomain.support.band, 'high');
  assert.ok(scored.rankedSymptoms.every((d) => d.group === 'symptom'));
  assert.ok(scored.rankedContext.some((d) => d.domain === 'support'));
  assert.equal(scored.rankedSymptoms[0].domain, 'depression');
});
