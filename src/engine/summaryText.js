/**
 * Plain-text rendering of a result, for printing or handing to a clinician.
 * Kept separate from the DOM so it can be tested and reused.
 */

/** A wrapped list item: "- text", continuation lines indented to match. */
const bullet = (text) => `- ${wrap(text, '  ', 76)}`;

export function toPlainText(results, { includeResources = true } = {}) {
  const lines = [];
  const rule = () => lines.push('');

  lines.push('POSTPARTUM CHECK-UP SUMMARY');
  lines.push('Screening observations only — not a diagnosis.');
  rule();

  if (results.emergency) {
    lines.push('** URGENT **');
    lines.push(wrap(results.statement));
    if (results.psychosisNote) lines.push(wrap(results.psychosisNote));
    rule();
  }

  lines.push(`Stage: ${results.stage}`);
  lines.push(`Overall: ${results.severity.icon} ${results.severity.label}`);
  lines.push(`Functional impact: ${results.functionalImpact.label}`);
  rule();

  if (results.severityDrivers.length) {
    lines.push('WHY THIS LEVEL');
    results.severityDrivers.forEach((d) => lines.push(bullet(capitalise(d))));
    rule();
  }

  if (results.warnings.length) {
    lines.push('WARNING SIGNS FLAGGED');
    results.warnings.forEach((w) => lines.push(bullet(`[${w.level}] ${w.label}`)));
    rule();
  }

  if (results.scoringHalted) {
    lines.push(wrap(results.scoringHalted));
    rule();
  }

  if (results.patterns.length) {
    lines.push('STRONGEST PATTERNS');
    results.patterns.forEach((p) => {
      lines.push(bullet(`${p.label} (${p.band})`));
      lines.push(`  ${wrap(p.statement, '  ', 76)}`);
    });
    rule();
  }

  if (results.lowConcernStatement) {
    lines.push(wrap(results.lowConcernStatement));
    rule();
  }

  if (results.functionalImpact.hardest.length) {
    lines.push('HARDEST DAY-TO-DAY');
    results.functionalImpact.hardest.forEach((h) => lines.push(bullet(h.text)));
    rule();
  }

  if (results.notes.length) {
    lines.push('WORTH KNOWING');
    results.notes.forEach((n) => lines.push(bullet(n)));
    rule();
  }

  lines.push('SUGGESTED NEXT STEPS');
  results.nextSteps.forEach((s) => lines.push(bullet(s.text)));
  rule();

  lines.push('QUESTIONS TO BRING TO A HEALTHCARE PROVIDER');
  results.providerQuestions.forEach((q) => lines.push(bullet(q)));
  rule();

  if (includeResources) {
    lines.push(`SUPPORT (${results.resources.label})`);
    lines.push(bullet(`${results.resources.emergency.label}: ${results.resources.emergency.contact}`));
    results.resources.lines.forEach((l) => lines.push(bullet(`${l.name}: ${l.contact}`)));
    rule();
  }

  lines.push(wrap(results.disclaimer));
  if (results.closing) {
    rule();
    lines.push(wrap(results.closing));
  }

  return lines.join('\n');
}

function capitalise(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Soft-wrap at 78 columns so the text stays readable when pasted or printed. */
function wrap(text, indent = '', width = 78) {
  if (!text) return '';
  const words = String(text).split(/\s+/);
  const out = [];
  let line = '';
  for (const word of words) {
    if (line && (line + ' ' + word).length > width) {
      out.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) out.push(line);
  return out.join(`\n${indent}`);
}

/**
 * Plain-text rendering of the clinician handout. Deliberately verbose: a
 * provider needs the endorsed items, not only the band.
 */
export function toProviderText(provider) {
  const lines = [];
  const rule = () => lines.push('');
  const heading = (text) => {
    lines.push(text.toUpperCase());
    lines.push('-'.repeat(Math.min(78, text.length)));
  };

  lines.push('POSTPARTUM CHECK-UP — SUMMARY FOR A HEALTHCARE PROVIDER');
  lines.push('Patient-completed screening. Not a diagnosis and not a validated instrument.');
  rule();
  if (provider.meta.name) lines.push(`Completed by: ${provider.meta.name}`);
  lines.push(`Completed: ${provider.meta.completedAtLabel}`);
  lines.push(`Stage: ${provider.meta.stage}`);
  lines.push(`Overall: ${provider.meta.severity.icon} ${provider.meta.severity.label}`);
  lines.push(`Functional impact: ${provider.functioning.label}`);
  if (provider.meta.drivers.length) lines.push(wrap(`Driven by: ${provider.meta.drivers.join('; ')}`));
  rule();

  if (provider.meta.halted) {
    lines.push('** SCORING HALTED BY THE SAFETY SCREEN **');
    lines.push(wrap('The patient was shown an urgent-assessment message and advised to seek immediate evaluation. Symptom bands below are reported for completeness only and were not presented to them as a result.'));
    rule();
  }

  heading('Safety screen');
  lines.push(`Level: ${provider.safety.level}`);
  provider.safety.items.forEach((item) => {
    lines.push(bullet(`${item.text}`));
    lines.push(`    ${item.endorsed ? '>> ' : ''}${wrap(item.answer, '    ', 72)}`);
  });
  if (provider.safety.flags.length) {
    rule();
    lines.push('Flags raised:');
    provider.safety.flags.forEach((f) => lines.push(bullet(`[${f.level}] ${f.label}`)));
  }
  if (provider.safety.intrusiveHarmThoughts) {
    lines.push(bullet('Reported unwanted, ego-dystonic intrusive thoughts about harm. Recorded as an obsessional pattern, not as risk.'));
  }
  rule();

  heading('Symptom patterns');
  provider.patterns.forEach((p) => {
    const scoreLine = p.percent == null ? 'no scored items answered' : `${p.raw}/${p.max} = ${p.percent}%`;
    lines.push(`${p.label}: ${p.band.toUpperCase()} (${scoreLine}, ${p.answeredCount} items answered)`);
    if (!p.cardinalMet) lines.push('    Cardinal symptoms not endorsed; band capped.');
    p.modifiers.forEach((m) => lines.push(`    Adjusted — ${m.effect}: ${wrap(m.reason, '    ', 68)}`));
    p.endorsed.forEach((e) => lines.push(`    [${e.score}] ${wrap(`${e.text} — ${e.answer}`, '        ', 68)}`));
    p.contextual.forEach((c) => lines.push(`    ( ) ${wrap(`${c.text} — ${c.answer}`, '        ', 68)}`));
    rule();
  });

  if (provider.bipolar.warning) {
    heading('Bipolar-spectrum warning');
    lines.push(wrap('Reduced need for sleep was endorsed alongside other elevated-mood features. The patient has been advised to ask for assessment before any antidepressant is started or changed.'));
    lines.push(bullet(`Reduced need for sleep, item score: ${provider.bipolar.decreasedNeedForSleep}/3`));
    lines.push(bullet(`Features endorsed at "more days than not" or above: ${provider.bipolar.symptomCount}`));
    if (provider.bipolar.duration) lines.push(bullet(`Longest episode: ${provider.bipolar.duration}`));
    if (provider.bipolar.impact) lines.push(bullet(`Impact: ${provider.bipolar.impact}`));
    if (provider.bipolar.history) lines.push(bullet(`History: ${provider.bipolar.history}`));
    rule();
  }

  heading('Functioning');
  lines.push(
    provider.functioning.percent == null
      ? 'Not answered.'
      : `${provider.functioning.label} (${provider.functioning.raw}/${provider.functioning.max} = ${provider.functioning.percent}%)`,
  );
  provider.functioning.items
    .filter((item) => (item.score ?? 0) > 0)
    .forEach((item) => lines.push(`    [${item.score}] ${wrap(`${item.text} — ${item.answer}`, '        ', 68)}`));
  rule();

  heading('Context');
  provider.context.forEach((c) => lines.push(bullet(`${c.text} — ${c.answer}`)));
  rule();

  if (provider.scenarioResponses.length) {
    heading('Scenario responses, in the patient’s own selection');
    provider.scenarioResponses.forEach((s) => {
      if (s.situation) lines.push(bullet(wrap(s.situation, '  ', 74)));
      lines.push(`    -> ${wrap(s.answer, '       ', 68)}`);
    });
    rule();
  }

  heading('What this is and is not');
  provider.limitations.forEach((l) => lines.push(bullet(l)));

  return lines.join('\n');
}
