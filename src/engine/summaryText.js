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
