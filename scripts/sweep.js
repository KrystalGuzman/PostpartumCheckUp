/**
 * Full-scale scenario sweep. Run with `npm run sweep`.
 *
 * The same invariants run inside `npm test` at a smaller scale; this walks the
 * whole safety space and takes many more random check-ups. Exits non-zero on
 * any invariant failure.
 */

import { createSweep, REGIMES } from '../tests/support/sweep.js';

const runs = Number(process.env.RUNS ?? 2000);
const mono = Number(process.env.MONO ?? 2000);
const sweep = createSweep();
const started = Date.now();

console.log('Postpartum Check-Up — scenario sweep\n');

console.log('1. Every combination of the safety screen');
const safety = sweep.safetyCombinations();
console.log(`   ${safety.combos.toLocaleString()} combinations`);
for (const [level, n] of Object.entries(safety.counts).sort()) {
  console.log(`   ${level.padEnd(10)} ${String(n).padStart(9)}  ${((n / safety.combos) * 100).toFixed(1)}%`);
}

console.log('\n2. Each section answered at its worst, in isolation');
for (const row of sweep.domainCeilings()) {
  console.log(`   ${row.section.padEnd(42)} band=${String(row.band).padEnd(11)} ${row.severity.padEnd(11)} safety=${row.safety}`);
}

console.log('\n3. Random complete check-ups (severity/safety-level counts)');
for (const regime of Object.keys(REGIMES)) {
  for (const mode of ['short', 'full']) {
    const outcomes = sweep.randomCheckUps(runs, mode, regime);
    const summary = Object.entries(outcomes)
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `${k}:${n}`)
      .join('  ');
    console.log(`   ${regime.padEnd(13)} ${mode.padEnd(6)} ${String(runs).padStart(5)} runs — ${summary}`);
  }
}

console.log('\n4. Monotonicity — a worse answer never produces a milder result');
console.log(`   ${sweep.monotonicity(mono)} worsened answers compared`);

console.log(`\nchecked ${sweep.checked.toLocaleString()} complete results in ${((Date.now() - started) / 1000).toFixed(1)}s`);

if (sweep.failures.length) {
  const grouped = {};
  for (const f of sweep.failures) (grouped[f.invariant] ??= []).push(f);
  console.log(`\nFAILURES: ${sweep.failures.length} across ${Object.keys(grouped).length} invariants\n`);
  for (const [invariant, list] of Object.entries(grouped)) {
    console.log(`  ${invariant} — ${list.length} case(s)`);
    for (const f of list.slice(0, 3)) console.log(`     ${f.detail}\n     ${f.answers.slice(0, 260)}`);
  }
  process.exit(1);
}
console.log('\nAll invariants held.');
