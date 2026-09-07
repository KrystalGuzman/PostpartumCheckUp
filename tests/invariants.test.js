import test from 'node:test';
import assert from 'node:assert/strict';

import { createSweep, REGIMES, EXPECTED_CEILING } from './support/sweep.js';

/**
 * A reduced run of the scenario sweep, so that the invariants are checked by
 * the ordinary test suite rather than only when someone remembers to run it.
 * `npm run sweep` does the same thing at full scale.
 */

const report = (failures) =>
  failures
    .slice(0, 5)
    .map((f) => `${f.invariant}: ${f.detail}\n    ${f.answers.slice(0, 240)}`)
    .join('\n  ');

test('the safety screen behaves across a sample of every combination', () => {
  const sweep = createSweep();
  const { combos, counts, space } = sweep.safetyCombinations({ step: 37 });

  assert.ok(combos > 40000, `expected a broad sample, got ${combos}`);
  assert.equal(space, 5 ** 9, 'the safety answer space is 9 questions of 5 options');
  assert.ok(counts.emergency > 0 && counts.urgent > 0 && counts.elevated > 0);
  assert.ok(counts.none > 0, 'a clean screen must still be reachable');
  assert.deepEqual(sweep.failures, []);
});

test('exactly the clean combinations of the safety screen produce no finding', () => {
  const sweep = createSweep();
  const { counts } = sweep.safetyCombinations();
  // self-harm none, harm none or intrusive, capacity yes or mostly,
  // five reality-testing items at zero, observer report at zero or once.
  assert.equal(counts.none, 1 * 2 * 2 * 1 * 2);
});

test('every module can reach the level of concern it is meant to reach', () => {
  const sweep = createSweep();
  const rows = sweep.domainCeilings();
  assert.equal(rows.length, Object.keys(EXPECTED_CEILING).length);
  assert.deepEqual(sweep.failures, [], `\n  ${report(sweep.failures)}`);
});

for (const regime of Object.keys(REGIMES)) {
  test(`invariants hold across random check-ups: ${regime}`, () => {
    const sweep = createSweep({ seed: 4242 });
    const outcomes = {
      short: sweep.randomCheckUps(60, 'short', regime),
      full: sweep.randomCheckUps(60, 'full', regime),
    };
    assert.deepEqual(sweep.failures, [], `\n  ${report(sweep.failures)}`);
    for (const mode of ['short', 'full']) {
      const total = Object.values(outcomes[mode]).reduce((n, x) => n + x, 0);
      assert.equal(total, 60, `${mode} runs should all produce a result`);
    }
  });
}

test('a worse answer never produces a milder result', () => {
  const sweep = createSweep({ seed: 99 });
  const compared = sweep.monotonicity(250);
  assert.ok(compared > 50, `expected a useful number of comparisons, got ${compared}`);
  assert.deepEqual(sweep.failures, [], `\n  ${report(sweep.failures)}`);
});
