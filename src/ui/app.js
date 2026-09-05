/**
 * Browser shell for the check-up.
 *
 * Everything happens in this tab. No answer is transmitted anywhere, and
 * nothing is stored unless the person explicitly asks for their progress to be
 * saved on this device.
 */

import { registry, applicableSections, visibleItems, progress } from '../engine/questionnaire.js';
import { createState, applyExclusive } from '../engine/state.js';
import { evaluateSafety } from '../engine/safety.js';
import { scoreAll } from '../engine/scoring.js';
import { buildResults } from '../engine/results.js';
import { toPlainText, toProviderText } from '../engine/summaryText.js';
import { buildProviderSummary } from '../engine/providerSummary.js';
import { OPENING_STATEMENT } from '../data/context.js';
import { regions, DEPLOYMENT_NOTE } from '../data/resources.js';

const STORAGE_KEY = 'postpartum-checkup:v1';
const app = document.getElementById('app');

const ui = {
  screen: 'intro',
  sectionId: null,
  region: 'us',
  save: false,
  emergencyAcknowledged: false,
  /** Which summary is on screen: the one written for the parent, or the handout. */
  view: 'me',
  /** Optional, for the top of a printed handout. Never leaves the device. */
  name: '',
  completedAt: null,
};

const state = createState(registry, loadSaved());

// ---------------------------------------------------------------------------
// Persistence (opt-in, local only)
// ---------------------------------------------------------------------------

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    ui.save = true;
    ui.region = parsed.region ?? 'us';
    ui.name = parsed.name ?? '';
    return parsed.responses ?? {};
  } catch {
    return {};
  }
}

function persist() {
  try {
    if (!ui.save) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ responses: state.responses, region: ui.region, name: ui.name }));
  } catch {
    /* private browsing, blocked storage — the check-up still works in-memory */
  }
}

function forget() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to do */
  }
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function render({ preserveFocus = false } = {}) {
  const focusId = preserveFocus ? document.activeElement?.id : null;
  const scroll = preserveFocus ? window.scrollY : 0;

  if (ui.screen === 'intro') app.innerHTML = introScreen();
  else if (ui.screen === 'section') app.innerHTML = sectionScreen();
  else if (ui.screen === 'emergency') app.innerHTML = emergencyScreen();
  else app.innerHTML = resultsScreen();

  if (focusId) {
    const el = document.getElementById(focusId);
    if (el) el.focus({ preventScroll: true });
    window.scrollTo(0, scroll);
  } else {
    window.scrollTo({ top: 0 });
    app.querySelector('h1, h2')?.focus?.();
  }
}

function introScreen() {
  return `
    <h1>Postpartum Check-Up</h1>
    <p class="lede">${esc(OPENING_STATEMENT)}</p>
    <div class="notice">
      <h2 style="margin-top:0">Before you start</h2>
      <ul class="plain">
        <li>This takes about 10–15 minutes. You can skip any question.</li>
        <li>Nothing you enter leaves this device. There is no account and no server.</li>
        <li>It is a screening tool, not a diagnosis, and not a substitute for a clinician.</li>
        <li>If you are in danger right now, stop and contact your local emergency number.</li>
      </ul>
    </div>
    <div class="card">
      <p class="q" id="q_region">Where are you? This only decides which support numbers you are shown.</p>
      <div class="options" role="radiogroup" aria-labelledby="q_region">
        ${regions
          .map(
            (r) => `<label class="option" data-checked="${ui.region === r.id}">
              <input type="radio" name="__region" id="__region__${esc(r.id)}" value="${esc(r.id)}" ${ui.region === r.id ? 'checked' : ''} />
              <span class="label">${esc(r.label)}</span>
            </label>`,
          )
          .join('')}
      </div>
      <label class="option" data-checked="${ui.save}">
        <input type="checkbox" id="__save" ${ui.save ? 'checked' : ''} />
        <span class="label">Save my answers on this device so I can come back to them<br />
          <span class="small muted">Off by default. Stored only in this browser, and you can delete them at any time.</span>
        </span>
      </label>
    </div>
    <div class="actions">
      <button class="primary" data-action="begin">Begin the check-up</button>
      ${Object.keys(state.responses).length ? '<button data-action="results">Jump to my summary</button>' : ''}
      ${Object.keys(state.responses).length ? '<button data-action="reset">Delete my answers</button>' : ''}
    </div>
    ${footnote()}
  `;
}

function sectionScreen() {
  const list = applicableSections(state);
  const index = Math.max(0, list.findIndex((s) => s.id === ui.sectionId));
  const section = list[index] ?? list[0];
  ui.sectionId = section.id;
  const items = visibleItems(section, state);
  const p = progress(state);

  return `
    <div class="progress no-print">
      <div class="progress-bar"><i style="width:${Math.round(p.ratio * 100)}%"></i></div>
      <div class="progress-label">
        <span>Section ${index + 1} of ${list.length} · ${esc(section.title)}</span>
        <span>${p.answered} of ${p.total} answered</span>
      </div>
    </div>
    <h1 tabindex="-1">${esc(section.title)}</h1>
    ${section.blurb ? `<p class="lede">${esc(section.blurb)}</p>` : ''}
    ${items.map(itemCard).join('')}
    <div class="actions no-print">
      ${index > 0 ? '<button data-action="back">Back</button>' : '<button data-action="intro">Back</button>'}
      <button class="primary" data-action="next">${index === list.length - 1 ? 'See my summary' : 'Continue'}</button>
    </div>
    <p class="small muted">You can leave anything blank. Skipped questions are left out of the result rather than counted as a zero.</p>
  `;
}

function itemCard(item) {
  const answer = state.responses[item.id];
  const selected = answer ? (Array.isArray(answer.value) ? answer.value : [answer.value]) : [];
  const type = item.type === 'multi' ? 'checkbox' : 'radio';
  return `
    <div class="card" role="${type === 'radio' ? 'radiogroup' : 'group'}" aria-labelledby="q_${esc(item.id)}">
      ${item.situation ? `<div class="situation">${esc(item.situation)}</div>` : ''}
      <p class="q" id="q_${esc(item.id)}">${esc(item.text)}</p>
      ${item.help ? `<p class="help">${esc(item.help)}</p>` : ''}
      <div class="options">
        ${item.options
          .map((option) => {
            const checked = selected.includes(option.value);
            const id = `${item.id}__${option.value}`;
            return `<label class="option${option.value === 'pna' ? ' pna' : ''}" data-checked="${checked}">
              <input type="${type}" name="${esc(item.id)}" id="${esc(id)}" value="${esc(option.value)}" data-item="${esc(item.id)}" ${checked ? 'checked' : ''} />
              <span class="label">${esc(option.label)}</span>
            </label>`;
          })
          .join('')}
      </div>
    </div>`;
}

function emergencyScreen() {
  const safety = evaluateSafety(state);
  const region = regions.find((r) => r.id === ui.region) ?? regions[0];
  return `
    <h1 tabindex="-1">Please read this before going any further</h1>
    <div class="notice urgent">
      <p>Some of your responses indicate symptoms that can require urgent professional assessment. This check-up cannot determine the cause of these symptoms. Please seek immediate medical or psychiatric evaluation and involve a trusted adult or support person. If there is immediate danger, contact emergency services or go to the nearest emergency department.</p>
      <p>This is not a judgment about you, and it does not mean you are a bad parent or that your baby will be taken from you. It means some of what you described needs a person, not a questionnaire.</p>
    </div>
    ${resourceBlock(region)}
    <h2>What flagged this</h2>
    <ul class="plain">${safety.reasons.filter((r) => r.level === 'emergency' || r.level === 'urgent').map((r) => `<li>${esc(r.label)}</li>`).join('')}</ul>
    <p class="small muted">Ordinary scoring has been stopped. A low score elsewhere in this check-up would not change what is written above.</p>
    <div class="actions no-print">
      <button class="primary" data-action="results">Go to my summary</button>
      <button data-action="continue-anyway">Answer the remaining questions first</button>
    </div>
    ${footnote()}
  `;
}

function resultsScreen() {
  const scored = scoreAll(state);
  const results = buildResults(scored, state, ui.region);
  ui.completedAt = ui.completedAt ?? new Date();

  return `
    ${summaryControls()}
    <div id="summary-doc">
      ${ui.view === 'provider' ? providerDoc(scored, results) : parentSummary(results)}
    </div>
    <div class="actions no-print">
      <button data-action="review">Go back to my answers</button>
      <button data-action="reset">Start over and delete my answers</button>
    </div>
    <p class="small muted" id="copy-status" role="status"></p>
  `;
}

/** View switch, name field, and the save/print controls. Never printed. */
function summaryControls() {
  return `
    <div class="controls no-print">
      <div class="switch" role="group" aria-label="Which summary to show">
        <button data-action="view-me" class="${ui.view === 'me' ? 'active' : ''}" aria-pressed="${ui.view === 'me'}">Written for me</button>
        <button data-action="view-provider" class="${ui.view === 'provider' ? 'active' : ''}" aria-pressed="${ui.view === 'provider'}">For my provider</button>
      </div>
      ${
        ui.view === 'provider'
          ? `<p class="small muted" style="margin:.7rem 0 .4rem">This version shows what you actually answered, including the safety questions, so a clinician can see the detail rather than a summary of it. Check it before you hand it over — you decide what to share.</p>
             <label class="namefield">Name or initials for the top of the page (optional)
               <input type="text" id="__name" value="${esc(ui.name)}" autocomplete="off" placeholder="Leave blank to stay anonymous" />
             </label>`
          : ''
      }
      <div class="actions" style="margin-top:.9rem">
        <button class="primary" data-action="print">Print or save as PDF</button>
        <button data-action="download-html">Save as a web page</button>
        <button data-action="download-text">Save as plain text</button>
        <button data-action="copy">Copy as text</button>
      </div>
    </div>`;
}

function parentSummary(results) {
  return `
    <h1 tabindex="-1">Your Postpartum Check-Up Summary</h1>
    <p class="small muted">Completed ${esc((ui.completedAt ?? new Date()).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' }))}</p>
    ${
      results.emergency
        ? `<div class="notice urgent"><h2 style="margin-top:0">Urgent</h2><p>${esc(results.statement)}</p>${
            results.psychosisNote ? `<p>${esc(results.psychosisNote)}</p>` : ''
          }</div>`
        : ''
    }
    <p class="lede">${esc(results.stage)}</p>

    <div class="severity" data-key="${esc(results.severity.key)}">
      <span class="icon" aria-hidden="true">${results.severity.icon}</span>
      <div>
        <strong>${esc(results.severity.label)}</strong>
        ${
          results.severityDrivers.length
            ? `<p class="small muted" style="margin:.35rem 0 0">Based on ${esc(results.severityDrivers.join('; '))}.</p>`
            : ''
        }
      </div>
    </div>

    ${results.warnings.length ? `<h2>Warning signs flagged</h2><ul class="plain">${results.warnings
      .map((w) => `<li>${esc(w.label)}</li>`)
      .join('')}</ul>` : ''}

    <h2>Strongest patterns</h2>
    ${
      results.scoringHalted
        ? `<p>${esc(results.scoringHalted)}</p>`
        : results.patterns.length
        ? results.patterns
            .map(
              (p) => `<div class="pattern">
                <div class="head"><span class="name">${esc(p.label)}</span><span class="band" data-band="${esc(p.band)}">${esc(p.band)}</span></div>
                <p style="margin:0">${esc(p.statement)}</p>
                ${
                  p.modifiers.length
                    ? `<p class="small muted" style="margin:.5rem 0 0">Adjusted because ${esc(
                        p.modifiers.map((m) => m.reason).join('; '),
                      )}.</p>`
                    : ''
                }
              </div>`,
            )
            .join('')
        : `<p>${esc(results.lowConcernStatement ?? 'No pattern stood out strongly in this check-up.')}</p>`
    }
    ${results.patterns.length && results.lowConcernStatement ? `<p>${esc(results.lowConcernStatement)}</p>` : ''}

    <h2>Functional impact</h2>
    <p>Your responses suggest <strong>${esc(results.functionalImpact.label)}</strong>.</p>
    ${
      results.functionalImpact.hardest.length
        ? `<p class="small muted">Hardest right now: ${esc(results.functionalImpact.hardest.map((h) => h.text.toLowerCase()).join('; '))}.</p>`
        : ''
    }

    ${results.notes.length ? `<h2>Worth knowing</h2>${results.notes.map((n) => `<p>${esc(n)}</p>`).join('')}` : ''}

    <h2>Suggested next steps</h2>
    <ul class="plain">${results.nextSteps.map((s) => `<li>${esc(s.text)}</li>`).join('')}</ul>

    <h2>Questions to bring to a healthcare provider</h2>
    <ul class="plain">${results.providerQuestions.map((q) => `<li>${esc(q)}</li>`).join('')}</ul>

    <h2>Support</h2>
    ${resourceBlock(results.resources)}

    <h2>Please remember</h2>
    <p>${esc(results.disclaimer)}</p>
    ${results.closing ? `<p><strong>${esc(results.closing)}</strong></p>` : ''}

    ${footnote()}
  `;
}

/** The clinician handout: what was answered, not a retelling of it. */
function providerDoc(scored, results) {
  const provider = buildProviderSummary(scored, state, { completedAt: ui.completedAt, name: ui.name });
  const { meta, safety, patterns, functioning, context, scenarioResponses, bipolar } = provider;

  return `
    <header class="doc-head">
      <h1 tabindex="-1">Postpartum Check-Up — summary for a healthcare provider</h1>
      <p class="small muted">Patient-completed screening · not a diagnosis · not a validated instrument</p>
      <dl class="meta">
        ${meta.name ? `<div><dt>Completed by</dt><dd>${esc(meta.name)}</dd></div>` : ''}
        <div><dt>Completed</dt><dd>${esc(meta.completedAtLabel)}</dd></div>
        <div><dt>Stage</dt><dd>${esc(meta.stage)}</dd></div>
        <div><dt>Overall</dt><dd>${meta.severity.icon} ${esc(meta.severity.label)}</dd></div>
        <div><dt>Functional impact</dt><dd>${esc(functioning.label)}</dd></div>
      </dl>
      ${meta.drivers.length ? `<p class="small">Driven by ${esc(meta.drivers.join('; '))}.</p>` : ''}
    </header>

    ${
      meta.halted
        ? `<div class="notice urgent"><h2 style="margin-top:0">Scoring was halted by the safety screen</h2>
             <p>${esc(results.statement)}</p>
             <p class="small">The patient was shown this message and advised to seek immediate evaluation. Symptom bands below are included for completeness and were not presented to them as a result.</p>
           </div>`
        : ''
    }

    <section>
      <h2>Safety screen <span class="tag">level: ${esc(safety.level)}</span></h2>
      <table class="doc-table">
        <tbody>
          ${safety.items
            .map(
              (item) => `<tr class="${item.endorsed ? 'flagged' : ''}">
                <th scope="row">${esc(item.text)}</th>
                <td>${item.endorsed ? '<strong>' : ''}${esc(item.answer)}${item.endorsed ? '</strong>' : ''}</td>
              </tr>`,
            )
            .join('')}
        </tbody>
      </table>
      ${
        safety.flags.length
          ? `<p class="small"><strong>Flags:</strong> ${esc(safety.flags.map((f) => `[${f.level}] ${f.label}`).join(' · '))}</p>`
          : '<p class="small">No safety flags raised.</p>'
      }
      ${
        safety.intrusiveHarmThoughts
          ? '<p class="small">Reported unwanted, ego-dystonic intrusive thoughts about harm. Recorded as an obsessional pattern, not as risk.</p>'
          : ''
      }
    </section>

    <section>
      <h2>Symptom patterns</h2>
      ${patterns
        .map(
          (p) => `<div class="pattern">
            <div class="head">
              <span class="name">${esc(p.label)}</span>
              <span class="band" data-band="${esc(p.band)}">${esc(p.band)}${
                p.percent == null ? '' : ` · ${p.raw}/${p.max} (${p.percent}%)`
              }</span>
            </div>
            ${p.cardinalMet ? '' : '<p class="small muted" style="margin:.2rem 0">Cardinal symptoms not endorsed; band capped.</p>'}
            ${p.modifiers
              .map((m) => `<p class="small muted" style="margin:.2rem 0">Adjusted — ${esc(m.effect)}: ${esc(m.reason)}.</p>`)
              .join('')}
            ${
              p.endorsed.length
                ? `<ul class="items">${p.endorsed
                    .map((e) => `<li><span class="score">${e.score}</span> ${esc(e.text)} — <em>${esc(e.answer)}</em></li>`)
                    .join('')}</ul>`
                : '<p class="small muted" style="margin:.2rem 0">Nothing endorsed in this module.</p>'
            }
            ${
              p.contextual.length
                ? `<ul class="items context">${p.contextual
                    .map((c) => `<li>${esc(c.text)} — <em>${esc(c.answer)}</em></li>`)
                    .join('')}</ul>`
                : ''
            }
          </div>`,
        )
        .join('')}
    </section>

    ${
      bipolar.warning
        ? `<section>
             <h2>Bipolar-spectrum warning</h2>
             <p>Reduced need for sleep was endorsed alongside other elevated-mood features. The patient has been advised to ask for assessment before any antidepressant is started or changed.</p>
             <ul class="items">
               <li>Reduced need for sleep, item score: ${bipolar.decreasedNeedForSleep}/3</li>
               <li>Features at “more days than not” or above: ${bipolar.symptomCount}</li>
               ${bipolar.duration ? `<li>Longest episode: ${esc(bipolar.duration)}</li>` : ''}
               ${bipolar.impact ? `<li>Impact: ${esc(bipolar.impact)}</li>` : ''}
               ${bipolar.history ? `<li>History: ${esc(bipolar.history)}</li>` : ''}
             </ul>
           </section>`
        : ''
    }

    <section>
      <h2>Functioning</h2>
      <p>${esc(functioning.label)}${functioning.percent == null ? '' : ` (${functioning.raw}/${functioning.max}, ${functioning.percent}%)`}</p>
      <ul class="items">
        ${functioning.items
          .filter((item) => (item.score ?? 0) > 0)
          .map((item) => `<li><span class="score">${item.score}</span> ${esc(item.text)} — <em>${esc(item.answer)}</em></li>`)
          .join('')}
      </ul>
    </section>

    <section>
      <h2>Context</h2>
      <table class="doc-table">
        <tbody>${context.map((c) => `<tr><th scope="row">${esc(c.text)}</th><td>${esc(c.answer)}</td></tr>`).join('')}</tbody>
      </table>
    </section>

    ${
      scenarioResponses.length
        ? `<section>
             <h2>Scenario responses</h2>
             ${scenarioResponses
               .map(
                 (sc) => `<div class="scenario-row">
                   ${sc.situation ? `<p class="small muted" style="margin:0 0 .2rem">${esc(sc.situation)}</p>` : ''}
                   <p style="margin:0">${esc(sc.answer)}</p>
                 </div>`,
               )
               .join('')}
           </section>`
        : ''
    }

    <section>
      <h2>Requested next steps, as shown to the patient</h2>
      <ul class="plain">${results.nextSteps.map((step) => `<li>${esc(step.text)}</li>`).join('')}</ul>
    </section>

    <section>
      <h2>What this is and is not</h2>
      <ul class="plain">${provider.limitations.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
    </section>
  `;
}

function resourceBlock(region) {
  return `<div class="resources">
    <dl>
      <dt>${esc(region.emergency.label)}</dt><dd>${esc(region.emergency.contact)}</dd>
      ${region.lines
        .map(
          (l) => `<dt>${esc(l.name)}</dt><dd>${esc(l.contact)}${l.note ? `<br /><span class="small muted">${esc(l.note)}</span>` : ''}</dd>`,
        )
        .join('')}
    </dl>
  </div>`;
}

function footnote() {
  return `<p class="footnote">Screening observations only — this check-up does not diagnose, and it cannot rule anything out.
    Built from published perinatal mental-health guidance; it reproduces no copyrighted questionnaire.
    ${esc(DEPLOYMENT_NOTE)}</p>`;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

app.addEventListener('input', (event) => {
  if (event.target instanceof HTMLInputElement && event.target.id === '__name') {
    ui.name = event.target.value;
    persist();
  }
});

app.addEventListener('change', (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;

  if (input.id === '__save') {
    ui.save = input.checked;
    if (ui.save) persist();
    else forget();
    render({ preserveFocus: true });
    return;
  }
  if (input.id === '__name') {
    // Typing only persists (see the `input` listener); the redraw that puts the
    // name into the document happens here, on blur, so the caret is left alone.
    ui.name = input.value;
    persist();
    render({ preserveFocus: true });
    return;
  }
  if (input.name === '__region') {
    ui.region = input.value;
    persist();
    render({ preserveFocus: true });
    return;
  }

  const itemId = input.dataset.item;
  const item = registry.getItem(itemId);
  if (!item) return;

  if (item.type === 'multi') {
    const previous = state.valueOf(itemId) ?? [];
    state.set(itemId, applyExclusive(item, previous, input.value));
  } else {
    state.set(itemId, input.value);
  }
  persist();
  render({ preserveFocus: true });
});

app.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const action = button.dataset.action;

  if (action === 'begin') {
    ui.screen = 'section';
    ui.sectionId = applicableSections(state)[0].id;
  } else if (action === 'intro') {
    ui.screen = 'intro';
  } else if (action === 'next' || action === 'back') {
    const list = applicableSections(state);
    const index = list.findIndex((s) => s.id === ui.sectionId);
    const nextIndex = action === 'next' ? index + 1 : index - 1;

    if (action === 'next' && list[index]?.id === 'safety' && !ui.emergencyAcknowledged && evaluateSafety(state).stopScoring) {
      ui.screen = 'emergency';
    } else if (nextIndex >= list.length) {
      ui.screen = 'results';
    } else if (nextIndex < 0) {
      ui.screen = 'intro';
    } else {
      ui.sectionId = list[nextIndex].id;
    }
  } else if (action === 'continue-anyway') {
    ui.emergencyAcknowledged = true;
    const list = applicableSections(state);
    const index = list.findIndex((s) => s.id === 'safety');
    ui.screen = 'section';
    ui.sectionId = list[Math.min(index + 1, list.length - 1)].id;
  } else if (action === 'results') {
    ui.screen = 'results';
  } else if (action === 'review') {
    ui.screen = 'section';
    ui.sectionId = applicableSections(state)[0].id;
  } else if (action === 'view-me' || action === 'view-provider') {
    ui.view = action === 'view-me' ? 'me' : 'provider';
  } else if (action === 'print') {
    window.print();
    return;
  } else if (action === 'copy') {
    copySummary();
    return;
  } else if (action === 'download-text') {
    downloadFile(`${filenameStem()}.txt`, summaryAsText(), 'text/plain');
    return;
  } else if (action === 'download-html') {
    downloadStandaloneHtml();
    return;
  } else if (action === 'reset') {
    if (!confirm('Delete every answer and start over?')) return;
    for (const id of Object.keys(state.responses)) state.clear(id);
    forget();
    ui.save = false;
    ui.emergencyAcknowledged = false;
    ui.screen = 'intro';
  }

  render();
});

/** Whichever summary is currently on screen, as plain text. */
function summaryAsText() {
  const scored = scoreAll(state);
  const results = buildResults(scored, state, ui.region);
  return ui.view === 'provider'
    ? toProviderText(buildProviderSummary(scored, state, { completedAt: ui.completedAt ?? new Date(), name: ui.name }))
    : toPlainText(results);
}

function filenameStem() {
  const date = (ui.completedAt ?? new Date()).toISOString().slice(0, 10);
  const who = ui.name.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  const audience = ui.view === 'provider' ? 'for-provider' : 'summary';
  return ['postpartum-check-up', audience, who, date].filter(Boolean).join('-');
}

function status(message) {
  const el = document.getElementById('copy-status');
  if (el) el.textContent = message;
}

function downloadFile(filename, contents, type) {
  try {
    const url = URL.createObjectURL(new Blob([contents], { type: `${type};charset=utf-8` }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status(`Saved as ${filename}. It is in your downloads, and nothing was sent anywhere.`);
  } catch {
    status('Saving was blocked by your browser. Use “Print or save as PDF”, or copy the text instead.');
  }
}

/**
 * A self-contained copy of what is on screen: the summary markup with the
 * stylesheet inlined, so the saved file opens and prints correctly anywhere,
 * offline, with no reference back to this app.
 */
async function downloadStandaloneHtml() {
  const doc = document.getElementById('summary-doc');
  if (!doc) return;

  const clone = doc.cloneNode(true);
  clone.querySelectorAll('.no-print').forEach((el) => el.remove());

  let css = '';
  try {
    const response = await fetch(new URL('../../assets/styles.css', import.meta.url));
    css = await response.text();
  } catch {
    css = 'body{font:16px/1.6 system-ui,sans-serif;max-width:44rem;margin:2rem auto;padding:0 1rem;color:#222}';
  }

  const title = ui.view === 'provider' ? 'Postpartum Check-Up — summary for a healthcare provider' : 'Postpartum Check-Up Summary';
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<style>${css}</style>
</head>
<body><main class="wrap">${clone.innerHTML}</main></body>
</html>`;

  downloadFile(`${filenameStem()}.html`, html, 'text/html');
}

async function copySummary() {
  const text = summaryAsText();
  try {
    await navigator.clipboard.writeText(text);
    status('Copied. You can paste it into a note, a message, or an email to your provider.');
  } catch {
    status('Copying was blocked by your browser. Use “Save as plain text” instead.');
  }
}

render();
