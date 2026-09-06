import test from 'node:test';
import assert from 'node:assert/strict';

import { registry, applicableSections, visibleItems, sectionIsFull, sections } from '../src/engine/questionnaire.js';
import { createState } from '../src/engine/state.js';
import { scoreAll, expansionPriorities, scoreDomain } from '../src/engine/scoring.js';
import { buildResults } from '../src/engine/results.js';
import { buildProviderSummary } from '../src/engine/providerSummary.js';
import { toProviderText, toPlainText } from '../src/engine/summaryText.js';
import { safetySection } from '../src/data/safety.js';
import { historySection } from '../src/data/history.js';

const build = (mode, answers = {}) => {
  const state = createState(registry, {}, { mode });
  for (const [id, value] of Object.entries(answers)) state.set(id, value);
  return state;
};
const countItems = (state) =>
  applicableSections(state).reduce((total, section) => total + visibleItems(section, state).length, 0);

const SCREENED = {
  ctx_stage: 'm3_6',
  ctx_first_baby: 'yes',
  dep_mood: '2', dep_anhedonia: '2', dep_numb: '2', dep_duration: 'm1_3',
  anx_worry: '2', anx_uncontrollable: '2', anx_physical: '1',
  ocd_intrusive: '2', ocd_relationship: 'ego_dystonic', ocd_checking: '1', ocd_distress: '2',
  ptsd_event: ['none'], grief_event: ['none'], med_symptoms: ['none'],
  bip_sleep_no_need: '0', bip_elevated: '0', bip_irritable: '0',
  ad_direction: '1', ad_restoration: '1', ad_confidence: '1', ad_forward: '1',
  ad_margin: '1', ad_effort: '1', ad_good_moments: '1',
};

test('the condensed version is about half the length', () => {
  const short = countItems(build('short', { ctx_stage: 'm3_6', ctx_first_baby: 'yes' }));
  const full = countItems(build('full', { ctx_stage: 'm3_6', ctx_first_baby: 'yes' }));
  assert.ok(short < full * 0.6, `expected a real reduction, got ${short} of ${full}`);
  assert.ok(short > 40, 'it still has to be a check-up');
});

test('safety, history and adaptation are never trimmed', () => {
  const short = build('short', { ctx_stage: 'm3_6' });
  for (const section of [safetySection, historySection]) {
    assert.equal(sectionIsFull(section, short), true, `${section.id} must be asked in full`);
  }
  const adaptation = sections.find((s) => s.id === 'adaptation_check');
  assert.equal(sectionIsFull(adaptation, short), true);

  // Every safety item that would be asked in full is asked in the short form.
  const inFull = visibleItems(safetySection, build('full', {})).map((i) => i.id);
  const inShort = visibleItems(safetySection, short).map((i) => i.id);
  assert.deepEqual(inShort, inFull);
});

test('the insight and household-safety questions survive the cut', () => {
  const short = build('short', { ctx_stage: 'm3_6', ocd_intrusive: '2' });
  const ocd = sections.find((s) => s.id === 'ocd');
  const support = sections.find((s) => s.id === 'support');
  assert.ok(visibleItems(ocd, short).some((i) => i.id === 'ocd_relationship'));
  assert.ok(visibleItems(support, short).some((i) => i.id === 'sup_safety'));
});

test('a screened module is capped at moderate and marked provisional', () => {
  const state = build('short', SCREENED);
  const depression = scoreDomain('depression', state);
  assert.equal(depression.screenedOnly, true);
  assert.equal(depression.band, 'moderate', 'three items must not be able to say "high"');
  assert.ok(depression.modifiers.some((m) => m.reason.includes('only the screening questions')));

  const results = buildResults(scoreAll(state), state, 'us');
  assert.equal(results.patterns.find((p) => p.domain === 'depression').provisional, true);
  assert.match(results.condensedNote, /signal to look further, not a measure of how much/);
});

test('the full version carries no condensed note and no screened-only flags', () => {
  const state = build('full', SCREENED);
  const results = buildResults(scoreAll(state), state, 'us');
  assert.equal(results.condensedNote, null);
  assert.equal(results.screenedOnly.length, 0);
  assert.equal(results.expansions.length, 0);
});

test('what to open up next is ranked by the answers, not by a fixed list', () => {
  const state = build('short', { ...SCREENED, dep_mood: '3', dep_anhedonia: '3', dep_numb: '3' });
  const offers = expansionPriorities(state, scoreAll(state));
  assert.ok(offers.length > 0);
  assert.ok(offers.every((o) => o.remaining > 0));
  const domains = offers.map((o) => o.domain);
  assert.ok(domains.indexOf('depression') < domains.indexOf('anxiety'), 'the stronger signal comes first');
});

test('signals a short screen under-reads are always offered, whatever the ratio', () => {
  const offers = (answers) => {
    const state = build('short', { ...SCREENED, ...answers });
    return expansionPriorities(state, scoreAll(state));
  };
  const trauma = offers({ ptsd_event: ['frightening'], ptsd_intrusion: '0', ptsd_avoid: '0' });
  assert.match(trauma.find((o) => o.domain === 'trauma').reason, /difficult birth or postpartum experience/);

  const bipolar = offers({ bip_sleep_no_need: '2' });
  assert.match(bipolar.find((o) => o.domain === 'bipolar').reason, /without feeling tired/);

  const grief = offers({ grief_event: ['miscarriage'], grief_waves: '0', grief_stuck: '0' });
  assert.match(grief.find((o) => o.domain === 'grief').reason, /carrying a loss/);
});

test('a section with nothing in its screen is not offered', () => {
  const quiet = {
    ...SCREENED,
    dep_mood: '0', dep_anhedonia: '0', dep_numb: '0',
    anx_worry: '0', anx_uncontrollable: '0', anx_physical: '0',
    ocd_intrusive: '0', ocd_checking: '0', ocd_distress: '0',
  };
  const state = build('short', quiet);
  const domains = expansionPriorities(state, scoreAll(state)).map((o) => o.domain);
  assert.equal(domains.includes('depression'), false);
  assert.equal(domains.includes('anxiety'), false);
});

test('opening a module lifts its cap and takes it off the list', () => {
  const state = build('short', { ...SCREENED, dep_mood: '3', dep_anhedonia: '3', dep_numb: '3' });
  assert.ok(expansionPriorities(state, scoreAll(state)).some((o) => o.domain === 'depression'));

  state.expand('depression');
  for (const id of ['dep_guilt', 'dep_worthless', 'dep_energy', 'dep_sleep', 'dep_withdrawal']) state.set(id, '3');

  const scored = scoreAll(state);
  assert.equal(scored.byDomain.depression.screenedOnly, false);
  assert.equal(scored.byDomain.depression.band, 'high', 'the cap is gone once the module is answered');
  assert.equal(scored.expansions.some((o) => o.domain === 'depression'), false);
});

test('nothing is offered when scoring has been halted', () => {
  const state = build('short', { ...SCREENED, saf_delusion: '2' });
  const scored = scoreAll(state);
  assert.equal(scored.stopScoring, true);
  assert.deepEqual(scored.expansions, []);
});

test('both summaries say which modules were screened rather than worked through', () => {
  const state = build('short', SCREENED);
  const scored = scoreAll(state);

  const parent = toPlainText(buildResults(scored, state, 'us'));
  assert.match(parent, /screened only/);
  assert.match(parent, /WORTH GOING DEEPER ON/);

  const handout = toProviderText(buildProviderSummary(scored, state, {}));
  assert.match(handout, /\[SCREENED ONLY\]/);
  assert.match(handout.replace(/\s+/g, ' '), /indicate where to look, not how much is there/);
});
