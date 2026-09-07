/**
 * Safety logic review.
 *
 * A page for clinicians and reviewers to interrogate the check-up's escalation
 * rules directly: which answer to which question raises a warning, at what
 * level, and what combines with what. It runs the real engine — the same
 * modules the check-up itself uses — so what it shows cannot drift from what
 * the tool does.
 *
 * It is deliberately not a summary of the rules written by hand. Every level
 * on this page is computed by calling evaluateSafety and scoreAll.
 */

import { registry } from '../engine/questionnaire.js';
import { createState } from '../engine/state.js';
import { evaluateSafety } from '../engine/safety.js';
import { scoreAll } from '../engine/scoring.js';
import { buildResults } from '../engine/results.js';
import { safetySection } from '../data/safety.js';
import { evaluateRiskFactors } from '../engine/riskFactors.js';

const root = document.getElementById('review');

const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** A safety screen answered and clear — the baseline every scenario starts from. */
const CLEAN = {
  saf_self_harm: 'none',
  saf_harm_others: 'none',
  saf_care_capacity: 'yes',
  saf_hallucination: '0',
  saf_delusion: '0',
  saf_confusion: '0',
  saf_control: '0',
  saf_reference: '0',
  saf_observed_change: '0',
  ocd_relationship: 'ego_dystonic',
  sup_safety: 'yes',
  hist_previous_perinatal: ['none'],
  hist_lifetime: ['none'],
  hist_pregnancy_mood: 'fine',
  hist_previous_help: 'helped',
  hist_compare: 'same',
  ctx_multiples: 'single',
  ctx_gap: 'y2_3',
  ctx_other_children_needs: ['no'],
  dep_mood: '0',
  dep_anhedonia: '0',
  dep_numb: '0',
  fn_get_up: '0',
  fn_eat: '0',
  fn_shower: '0',
  fn_sleep: '0',
  fn_baby_care: '0',
  fn_self_care: '0',
  ctx_stage: 'm3_6',
  ctx_first_baby: 'yes',
};

const GROUPS = [
  {
    title: 'The safety screen',
    note: 'Asked of everyone, in both the short and the full version, and never trimmed.',
    items: safetySection.items.map((i) => i.id),
  },
  {
    title: 'Safety-relevant questions asked elsewhere',
    note:
      'These sit inside other modules but feed the same evaluation, which is why the level is re-checked after every section rather than only after the safety screen.',
    items: ['ocd_relationship', 'sup_safety', 'hist_previous_perinatal'],
  },
  {
    title: 'History and risk factors',
    note:
      'History decides what care should be in place. It does not decide how someone is doing now — that comes only from what she reports about the present. It can lift a level that is already showing something, never a clear one, and never past amber.',
    items: [
      'hist_previous_perinatal',
      'hist_lifetime',
      'hist_pregnancy_mood',
      'hist_previous_help',
      'hist_compare',
      'ctx_multiples',
      'ctx_gap',
      'ctx_other_children_needs',
    ],
  },
  {
    title: 'Current symptoms (to test the interaction)',
    note:
      'History only moves the level when something current is already showing. Raise these to see the interaction; leave them at zero to confirm that history alone changes nothing.',
    items: ['dep_mood', 'dep_anhedonia', 'dep_numb'],
  },
  {
    title: 'Functioning',
    note:
      '"I mostly cannot" is the top of this scale — it means cannot, not that it is hard. Inability to carry out care alongside one basic, or three basics together, is treated as needing contact today.',
    items: ['fn_baby_care', 'fn_self_care', 'fn_get_up', 'fn_eat', 'fn_shower', 'fn_sleep'],
  },
];

const SCENARIO_ITEMS = GROUPS.flatMap((g) => g.items);

/**
 * How each answer behaves beyond its own row. Written out because a table of
 * single answers cannot show it, and because the combinations are where a
 * reviewer's disagreement is most likely to be.
 */
const COMBINES = {
  saf_hallucination: 'Any two reality-testing items endorsed together reach emergency. So does one, if it came on over days, or if an observer has noticed a change, or if there is a previous postpartum psychosis.',
  saf_delusion: 'Any two reality-testing items endorsed together reach emergency. So does one, if it came on over days, or if an observer has noticed a change, or if there is a previous postpartum psychosis.',
  saf_confusion: 'Any two reality-testing items endorsed together reach emergency. So does one, if it came on over days, or if an observer has noticed a change, or if there is a previous postpartum psychosis.',
  saf_control: 'Any two reality-testing items endorsed together reach emergency. So does one, if it came on over days, or if an observer has noticed a change, or if there is a previous postpartum psychosis.',
  saf_reference: 'Any two reality-testing items endorsed together reach emergency. So does one, if it came on over days, or if an observer has noticed a change, or if there is a previous postpartum psychosis.',
  saf_observed_change: 'Corroborating only. On its own it reaches urgent at "several times"; alongside any endorsed reality-testing item it makes that item an emergency.',
  saf_care_capacity: '"I am not sure" becomes an emergency alongside any endorsed reality-testing item.',
  saf_onset_speed: 'Only asked once a reality-testing item is endorsed. Rapid onset turns a single endorsement into an emergency.',
  ocd_relationship: 'Loss of insight is treated as a reality-testing finding rather than an obsessional one, and routes to the psychosis pathway.',
  hist_previous_perinatal: 'A previous postpartum psychosis lowers the threshold on the current screen: one endorsed reality-testing item becomes an emergency rather than urgent.',
  fn_baby_care: 'Counts towards functional collapse: inability to carry out care plus one basic, or three basics together.',
  fn_self_care: 'Counts towards functional collapse: inability to carry out care plus one basic, or three basics together.',
  fn_get_up: 'Counts as a basic towards functional collapse.',
  fn_eat: 'Counts as a basic towards functional collapse.',
  fn_shower: 'Counts as a basic towards functional collapse.',
  fn_sleep: 'Counts as a basic towards functional collapse.',
};

/** Scenarios that demonstrate each rule, loadable into the builder. */
const RULES = [
  {
    name: 'Thoughts of self-harm are graded, not lumped together',
    detail: 'Passing thoughts of being better off gone are elevated; thoughts of hurting yourself are urgent; a plan, intent, or uncertainty about staying safe is an emergency.',
    scenario: { saf_self_harm: 'plan_or_intent' },
  },
  {
    name: 'An unwanted intrusive thought about harm is not a danger finding',
    detail: 'Frightening, unwanted thoughts route to the OCD module and produce an explicit note that a thought is not an intention. A thought that feels like an urge, or that feels justified, is an emergency.',
    scenario: { saf_harm_others: 'intrusive' },
  },
  {
    name: '…but an urge is',
    detail: 'The distinction is what the person says their experience of the thought is, not how alarming it sounds to read.',
    scenario: { saf_harm_others: 'urge' },
  },
  {
    name: 'One reality-testing item is urgent; two are an emergency',
    detail: 'A single endorsement at "once or twice" interrupts the check-up and forces a red result, without halting scoring. Two of them halt it.',
    scenario: { saf_hallucination: '1', saf_reference: '1' },
  },
  {
    name: 'Rapid onset escalates a single endorsement',
    detail: 'Postpartum psychosis characteristically develops over days, most often in the first two weeks.',
    scenario: { saf_reference: '1', saf_onset_speed: 'rapid' },
  },
  {
    name: 'A previous postpartum psychosis lowers the threshold',
    detail: 'Recurrence after a later birth is high and onset can be fast, so the usual requirement for a second signal is waived.',
    scenario: { hist_previous_perinatal: ['psychosis'], saf_hallucination: '1' },
  },
  {
    name: 'Losing insight routes to the psychosis pathway, not the OCD one',
    detail: 'Believing an intrusive thought is really happening, when others say otherwise, is a reality-testing finding.',
    scenario: { ocd_relationship: 'believed' },
  },
  {
    name: 'Not being able to function is a warning on its own',
    detail: 'No safety answer is required. This is the fault a tester found: severity could not reach red without one, so someone who could not care for herself or her baby was told to arrange something next week.',
    scenario: { fn_baby_care: '3', fn_self_care: '3', fn_get_up: '3', fn_eat: '3' },
  },
  {
    name: 'Difficulty is not inability',
    detail: '"A lot of difficulty" across every activity does not trigger it. The threshold is the top of the scale.',
    scenario: { fn_baby_care: '2', fn_self_care: '2', fn_get_up: '2', fn_eat: '2', fn_shower: '2', fn_sleep: '2' },
  },
  {
    name: 'A blank safety screen is not a clear one',
    detail: 'Unanswered safety questions are counted and flagged once someone has engaged with the check-up, so that skipping is visible rather than silently equivalent to answering no.',
    scenario: { __clear: ['saf_self_harm', 'saf_harm_others', 'saf_care_capacity'] },
  },
  {
    name: 'A history does not make a well woman a concern',
    detail: 'A previous postpartum psychosis, with nothing current: the level stays at low concern. History decides what care should be in place, not how she is doing. Raise the current-symptom questions and you will see it act.',
    scenario: { hist_previous_perinatal: ['psychosis'] },
  },
  {
    name: '…but the same symptoms mean more with that history',
    detail: 'Moderate current symptoms alone reach amber-below; with a previous perinatal episode they reach amber. That is the interaction, and it is the only way history moves the level.',
    scenario: { hist_previous_perinatal: ['depression'], dep_mood: '2', dep_anhedonia: '2', dep_numb: '2' },
  },
  {
    name: 'Not feeling safe at home',
    detail: 'Elevated, and it changes who the emergency pathway tells her to involve — someone from outside the home rather than a generic trusted adult.',
    scenario: { sup_safety: 'no' },
  },
];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let answers = { ...CLEAN };

function buildState(overrides = {}) {
  const state = createState(registry);
  for (const [id, value] of Object.entries({ ...answers, ...overrides })) {
    if (value === null || value === undefined) continue;
    state.set(id, value);
  }
  return state;
}

function readHash() {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash.startsWith('a=')) return;
  try {
    const decoded = JSON.parse(decodeURIComponent(hash.slice(2)));
    answers = { ...CLEAN, ...decoded };
  } catch {
    /* a malformed link just starts clean */
  }
}

function writeHash() {
  const diff = {};
  for (const [id, value] of Object.entries(answers)) {
    if (JSON.stringify(value) !== JSON.stringify(CLEAN[id])) diff[id] = value;
  }
  const next = Object.keys(diff).length ? `#a=${encodeURIComponent(JSON.stringify(diff))}` : '#';
  history.replaceState(null, '', next);
}

// ---------------------------------------------------------------------------
// The isolated level for one answer, against an otherwise clear screen
// ---------------------------------------------------------------------------

function isolatedLevel(itemId, value) {
  const state = createState(registry);
  for (const [id, v] of Object.entries(CLEAN)) state.set(id, v);
  state.set(itemId, value);
  return evaluateSafety(state).level;
}

function triggerRows() {
  const rows = [];
  for (const group of GROUPS) {
    for (const id of group.items) {
      const item = registry.getItem(id);
      if (!item?.options) continue;
      for (const option of item.options) {
        const value = item.type === 'multi' ? [option.value] : option.value;
        rows.push({
          group: group.title,
          itemId: id,
          question: item.text,
          answer: option.label,
          level: isolatedLevel(id, value),
          combines: COMBINES[id] ?? '',
          value,
        });
      }
    }
  }
  return rows;
}

const ROWS = triggerRows();

/**
 * What each history answer is worth, and — the part that matters — what it
 * does and does not do to the level a woman is shown.
 *
 * Each answer is measured twice: against a woman with nothing going on, and
 * against one already reporting a moderate picture. The first column must
 * never move.
 */

/** A moderate current picture: enough answered items to be scored, landing at yellow. */
const MODERATE_SYMPTOMS = {
  dep_mood: '2',
  dep_anhedonia: '2',
  dep_numb: '1',
  dep_guilt: '1',
  dep_energy: '1',
  dep_sleep: '1',
  dep_duration: 'm1_3',
};

function scoreWith(extra) {
  const state = createState(registry);
  for (const [id, value] of Object.entries({ ...CLEAN, ...extra })) state.set(id, value);
  return scoreAll(state);
}

function riskRows() {
  const rows = [];
  const historyItems = [
    'hist_previous_perinatal',
    'hist_lifetime',
    'hist_pregnancy_mood',
    'hist_previous_help',
    'hist_compare',
    'ctx_multiples',
    'ctx_gap',
    'ctx_other_children_needs',
  ];

  for (const id of historyItems) {
    const item = registry.getItem(id);
    if (!item?.options) continue;
    for (const option of item.options) {
      if (option.value === 'pna') continue;
      const answer = item.type === 'multi' ? [option.value] : option.value;

      const state = createState(registry);
      for (const [k, v] of Object.entries(CLEAN)) state.set(k, v);
      state.set(id, answer);
      const factor = evaluateRiskFactors(state).factors.at(-1);
      if (!factor) continue;

      rows.push({
        itemId: id,
        question: item.text,
        answer: option.label,
        weight: factor.weight,
        detail: factor.detail ?? '',
        wellLevel: scoreWith({ [id]: answer }).severityKey,
        symptomaticLevel: scoreWith({ ...MODERATE_SYMPTOMS, [id]: answer }).severityKey,
        value: answer,
      });
    }
  }
  return rows;
}

const WELL_BASELINE = scoreWith({}).severityKey;
const SYMPTOMATIC_BASELINE = scoreWith(MODERATE_SYMPTOMS).severityKey;
const RISK_ROWS = riskRows();
let filters = { level: 'warning', text: '' };

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

const LEVEL_TEXT = {
  none: 'No finding',
  elevated: 'Elevated — the result cannot fall below amber',
  urgent: 'Urgent — interrupts the check-up, result forced to red, scoring continues',
  emergency: 'Emergency — interrupts, halts ordinary scoring, urgent pathway shown',
};

function control(id) {
  const item = registry.getItem(id);
  if (!item?.options) return '';
  const current = answers[id];

  if (item.type === 'multi') {
    return `<div class="field">
      <span>${esc(item.text)}</span>
      <div class="checks">
        ${item.options
          .map(
            (o) => `<label><input type="checkbox" data-multi="${esc(id)}" value="${esc(o.value)}"
              ${(current ?? []).includes(o.value) ? 'checked' : ''} /> ${esc(o.label)}</label>`,
          )
          .join('')}
      </div>
    </div>`;
  }

  const changed = JSON.stringify(current) !== JSON.stringify(CLEAN[id]);
  return `<label class="field">
    <span>${esc(item.text)}</span>
    <select data-item="${esc(id)}" data-nondefault="${changed}">
      <option value="">— not answered —</option>
      ${item.options
        .map((o) => `<option value="${esc(o.value)}" ${current === o.value ? 'selected' : ''}>${esc(o.label)}</option>`)
        .join('')}
    </select>
  </label>`;
}

function verdict() {
  const state = buildState();
  const safety = evaluateSafety(state);
  const scored = scoreAll(state);
  const results = buildResults(scored, state, 'us');

  const shown = safety.stopScoring
    ? 'Please read this before going any further'
    : safety.level === 'urgent'
      ? 'Worth stopping on for a moment'
      : 'No interruption — the check-up continues to the summary';

  return `<div class="verdict" data-level="${esc(safety.level)}">
    <div class="headline">
      <span class="pill" data-level="${esc(safety.level)}">${esc(safety.level)}</span>
      ${esc(LEVEL_TEXT[safety.level])}
    </div>
    <dl>
      <dt>Overall result</dt><dd>${scored.severity.icon} ${esc(scored.severity.label)}</dd>
      <dt>Ordinary scoring</dt><dd>${scored.stopScoring ? 'halted' : 'continues'}</dd>
      <dt>Interruption</dt><dd>${esc(shown)}</dd>
      <dt>Functional collapse</dt><dd>${safety.functionalCollapse?.collapsed ? esc(safety.functionalCollapse.label) : 'not triggered'}</dd>
      <dt>Unanswered safety items</dt><dd>${safety.unansweredCount ?? 0} of 9</dd>
      <dt>Findings</dt>
      <dd>${
        safety.reasons.length
          ? `<ul class="plain" style="margin:0">${safety.reasons
              .map((r) => `<li><span class="pill" data-level="${esc(r.level)}">${esc(r.level)}</span> ${esc(r.label)}</li>`)
              .join('')}</ul>`
          : 'none'
      }</dd>
      <dt>Next step shown</dt><dd>${esc(results.nextSteps[0]?.text ?? '—')}</dd>
    </dl>
  </div>`;
}

function triggerTable() {
  const text = filters.text.toLowerCase();
  const visible = ROWS.filter((row) => {
    if (filters.level === 'warning' && row.level === 'none') return false;
    if (!['all', 'warning'].includes(filters.level) && row.level !== filters.level) return false;
    if (text && !`${row.question} ${row.answer} ${row.itemId}`.toLowerCase().includes(text)) return false;
    return true;
  });

  return `
    <div class="filters">
      <input type="search" id="filter-text" placeholder="Search questions and answers" value="${esc(filters.text)}" />
      <select id="filter-level">
        <option value="warning" ${filters.level === 'warning' ? 'selected' : ''}>Answers that raise something</option>
        <option value="all" ${filters.level === 'all' ? 'selected' : ''}>Every answer</option>
        <option value="emergency" ${filters.level === 'emergency' ? 'selected' : ''}>Emergency only</option>
        <option value="urgent" ${filters.level === 'urgent' ? 'selected' : ''}>Urgent only</option>
        <option value="elevated" ${filters.level === 'elevated' ? 'selected' : ''}>Elevated only</option>
        <option value="none" ${filters.level === 'none' ? 'selected' : ''}>Raises nothing</option>
      </select>
      <span class="count">${visible.length} of ${ROWS.length} answers</span>
    </div>
    <div style="overflow-x:auto">
    <table class="triggers">
      <thead><tr><th>Question</th><th>Answer</th><th>On its own</th><th>In combination</th><th></th></tr></thead>
      <tbody>
        ${visible
          .map((row, index) => {
            // The question and its combination note repeat across every option
            // of the same question; showing them once keeps the table scannable.
            const continued = index > 0 && visible[index - 1].itemId === row.itemId;
            return `<tr${continued ? ' class="continued"' : ''}>
              <td class="q">${continued ? '' : esc(row.question)}</td>
              <td>${esc(row.answer)}</td>
              <td><span class="pill" data-level="${esc(row.level)}">${esc(row.level)}</span></td>
              <td class="combines">${continued ? '' : esc(row.combines)}</td>
              <td><button data-try="${esc(JSON.stringify({ [row.itemId]: row.value }))}">Try</button></td>
            </tr>`;
          })
          .join('')}
      </tbody>
    </table>
    </div>`;
}

function render() {
  root.innerHTML = `
    <header class="review-head">
      <p class="kicker">Postpartum Check-Up · for clinicians and reviewers</p>
      <h1>Which answers raise a warning, and why</h1>
      <p class="lede">Every level on this page is computed by running the check-up's own scoring engine in your browser,
        so it cannot drift from what the tool actually does. Change any answer and the verdict updates.</p>
      <p class="muted-note">This is a screening tool, not a diagnostic instrument, and none of these thresholds has been
        signed off by a clinician yet — which is what this page is for. If you disagree with a rule, use
        <strong>Copy link to this scenario</strong> and send the link with your reasoning.
        <a href="./index.html">Back to the check-up</a></p>
    </header>

    <section class="panel">
      <h2>Try a scenario</h2>
      <p class="muted-note">Everything starts from a safety screen answered and clear. Changed answers are highlighted.</p>
      <div class="grid">
        ${GROUPS.map(
          (group) => `<div>
            <h3>${esc(group.title)}</h3>
            <p class="muted-note">${esc(group.note)}</p>
            ${group.items.map(control).join('')}
          </div>`,
        ).join('')}
      </div>
      <div class="actions">
        <button class="primary" data-action="copy-link">Copy link to this scenario</button>
        <button data-action="reset">Reset to a clear screen</button>
        <button data-action="worst">Set everything to its worst</button>
      </div>
      <p class="small muted" id="copy-status" role="status"></p>
    </section>

    <section class="panel">
      <h2>Verdict</h2>
      ${verdict()}
    </section>

    <section class="panel">
      <h2>Every answer, and what it raises</h2>
      <p class="muted-note">Each row is that answer alone, against an otherwise clear safety screen. The combination
        column matters as much as the level: several answers that look mild on their own escalate together.</p>
      <div id="trigger-table">${triggerTable()}</div>
    </section>

    <section class="panel">
      <h2>History and risk factors</h2>
      <p class="muted-note">The column that matters is the last pair. <strong>A well woman's result must not change
        because she disclosed a history</strong> — if it did, the tool would be teaching the people at highest risk to
        withhold the very thing that most changes their care. History raises a level only where the current picture is
        already showing something, and never past amber.</p>
      <div style="overflow-x:auto">
      <table class="triggers">
        <thead><tr>
          <th>Question</th><th>Answer</th><th>Weight</th>
          <th>If she is well<br /><span class="muted-note">baseline: low concern</span></th>
          <th>With a moderate current picture<br /><span class="muted-note">baseline: ${esc(SYMPTOMATIC_BASELINE)}</span></th><th></th>
        </tr></thead>
        <tbody>
          ${RISK_ROWS.map((row, index) => {
            const continued = index > 0 && RISK_ROWS[index - 1].itemId === row.itemId;
            const wellMoved = row.wellLevel !== WELL_BASELINE;
            const symptomaticMoved = row.symptomaticLevel !== SYMPTOMATIC_BASELINE;
            return `<tr${continued ? ' class="continued"' : ''}>
              <td class="q">${continued ? '' : esc(row.question)}</td>
              <td>${esc(row.answer)}</td>
              <td><span class="pill" data-weight="${esc(row.weight)}">${esc(row.weight)}</span></td>
              <td>${wellMoved ? `<strong>changed to ${esc(row.wellLevel)}</strong>` : '<span class="unchanged">unchanged — low concern</span>'}</td>
              <td>${symptomaticMoved ? `raised ${esc(SYMPTOMATIC_BASELINE)} → <strong>${esc(row.symptomaticLevel)}</strong>` : `<span class="unchanged">unchanged — ${esc(SYMPTOMATIC_BASELINE)}</span>`}</td>
              <td><button data-try="${esc(JSON.stringify({ [row.itemId]: row.value }))}">Try</button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      </div>
      <p class="muted-note">Weights order the care-planning section and drive specific next steps — a referral to
        perinatal psychiatry for a previous postpartum psychosis, for instance. They no longer set a floor under the
        overall level.</p>
    </section>

    <section class="panel">
      <h2>The rules, one at a time</h2>
      <p class="muted-note">Load any of these into the builder above to see it run.</p>
      ${RULES.map(
        (rule) => `<div class="rule">
          <div class="head">
            <span class="name">${esc(rule.name)}</span>
            <button data-try="${esc(JSON.stringify(rule.scenario))}">Load</button>
          </div>
          <p class="muted-note">${esc(rule.detail)}</p>
        </div>`,
      ).join('')}
    </section>

    <section class="panel">
      <h2>The whole safety space</h2>
      <p class="muted-note">The safety screen is nine questions of five options: 1,953,125 possible combinations.
        You can enumerate all of them here rather than taking the figures on trust.</p>
      <div class="actions"><button data-action="enumerate">Run the full enumeration</button></div>
      <div id="enumeration"></div>
    </section>

    <p class="footnote">Screening observations only — this check-up does not diagnose and cannot rule anything out.
      The logic shown here lives in <code>src/engine/safety.js</code> and <code>src/engine/scoring.js</code>;
      the invariants it is held to live in <code>tests/support/sweep.js</code>.</p>
  `;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

function refresh() {
  writeHash();
  render();
}

root.addEventListener('change', (event) => {
  const target = event.target;
  if (target.dataset?.item) {
    const value = target.value;
    if (value === '') delete answers[target.dataset.item];
    else answers[target.dataset.item] = value;
    refresh();
    return;
  }
  if (target.dataset?.multi) {
    const id = target.dataset.multi;
    const selected = [...root.querySelectorAll(`input[data-multi="${CSS.escape(id)}"]:checked`)].map((i) => i.value);
    answers[id] = selected.length ? selected : ['none'];
    refresh();
    return;
  }
  if (target.id === 'filter-level' || target.id === 'filter-text') applyFilters();
});

root.addEventListener('input', (event) => {
  if (event.target.id === 'filter-text') applyFilters();
});

function applyFilters() {
  filters = {
    level: root.querySelector('#filter-level')?.value ?? 'warning',
    text: root.querySelector('#filter-text')?.value ?? '',
  };
  const host = root.querySelector('#trigger-table');
  if (host) {
    host.innerHTML = triggerTable();
    const box = root.querySelector('#filter-text');
    if (box) {
      box.focus();
      box.setSelectionRange(box.value.length, box.value.length);
    }
  }
}

root.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;

  if (button.dataset.try) {
    const scenario = JSON.parse(button.dataset.try);
    answers = { ...CLEAN };
    for (const id of scenario.__clear ?? []) delete answers[id];
    delete scenario.__clear;
    Object.assign(answers, scenario);
    refresh();
    root.querySelector('.verdict')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const action = button.dataset.action;
  if (action === 'reset') {
    answers = { ...CLEAN };
    refresh();
  } else if (action === 'worst') {
    answers = { ...CLEAN };
    for (const id of SCENARIO_ITEMS) {
      const item = registry.getItem(id);
      const scored = item?.options?.filter((o) => typeof o.score === 'number') ?? [];
      if (scored.length) {
        answers[id] = item.type === 'multi' ? [scored.at(-1).value] : scored.reduce((w, o) => (o.score > w.score ? o : w)).value;
      } else if (item?.options) {
        const flagged = item.options.filter((o) => o.value !== 'pna' && o.flags?.length);
        if (flagged.length) answers[id] = item.type === 'multi' ? [flagged.at(-1).value] : flagged.at(-1).value;
      }
    }
    refresh();
  } else if (action === 'copy-link') {
    const status = root.querySelector('#copy-status');
    try {
      await navigator.clipboard.writeText(window.location.href);
      if (status) status.textContent = 'Link copied. It reproduces exactly these answers.';
    } catch {
      if (status) status.textContent = `Copy this from the address bar: ${window.location.href}`;
    }
  } else if (action === 'enumerate') {
    enumerateSafetySpace();
  }
});

/**
 * Walks all 1,953,125 combinations of the safety screen in chunks, so the page
 * stays responsive and a reviewer can verify the counts rather than trust them.
 */
function enumerateSafetySpace() {
  const ids = safetySection.items.filter((i) => i.id !== 'saf_onset_speed').map((i) => i.id);
  const optionSets = ids.map((id) => registry.getItem(id).options.map((o) => o.value));
  const total = optionSets.reduce((n, o) => n * o.length, 1);
  const counts = { none: 0, elevated: 0, urgent: 0, emergency: 0 };
  const host = root.querySelector('#enumeration');
  const indices = new Array(ids.length).fill(0);
  let done = 0;
  let finished = false;

  const paint = () => {
    host.innerHTML = `
      <table class="triggers enumeration">
        <thead><tr><th>Level</th><th>Combinations</th><th>Share</th></tr></thead>
        <tbody>
          ${Object.entries(counts)
            .map(
              ([level, n]) => `<tr>
                <td><span class="pill" data-level="${level}">${level}</span></td>
                <td class="n">${n.toLocaleString()}</td>
                <td class="n">${done ? ((n / done) * 100).toFixed(2) : '0.00'}%</td>
              </tr>`,
            )
            .join('')}
        </tbody>
      </table>
      <p class="muted-note">${done.toLocaleString()} of ${total.toLocaleString()} combinations${finished ? ' — complete.' : '…'}</p>`;
  };

  const step = () => {
    const until = Math.min(done + 25000, total);
    while (done < until) {
      const state = createState(registry);
      for (let i = 0; i < ids.length; i++) state.set(ids[i], optionSets[i][indices[i]]);
      counts[evaluateSafety(state).level] += 1;
      done += 1;

      let carry = ids.length - 1;
      while (carry >= 0 && ++indices[carry] >= optionSets[carry].length) {
        indices[carry] = 0;
        carry -= 1;
      }
      if (carry < 0) break;
    }
    finished = done >= total;
    paint();
    if (!finished) setTimeout(step, 0);
  };

  paint();
  setTimeout(step, 0);
}

readHash();
render();
