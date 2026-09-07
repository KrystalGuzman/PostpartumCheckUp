# Postpartum Check-Up

An evidence-informed postpartum mental-health **check-up and navigation tool**. It helps a parent in the first year after birth reflect on what they are experiencing, recognize patterns that may warrant support, and work out what level of care to seek.

It is **not** a diagnostic instrument. It produces screening observations, symptom patterns, and next steps — never a diagnosis.

```
npm start     # serve at http://localhost:4173
npm test      # run the engine test suite
```

Everything runs in the browser. There is no backend, no account, and no analytics. Answers stay in memory unless the person explicitly opts in to saving them in their own browser, and they can delete them from the summary screen.

---

## What it does

The check-up runs in this order, and the order is the point:

1. **Context** — the baby's date of birth (which gives the exact stage; a coarse band is the fallback if someone would rather not give a date), birth, feeding, sleep, work, stressors, support. Contextual only; no circumstance is treated as inherently healthier than another.
2. **History** — episodes after a previous birth, whether help was obtained and whether it worked, mood during this pregnancy, lifetime psychiatric history. Risk factors, never symptoms.
3. **Safety** — asked of everyone, before any symptom scoring. Self-harm, harm towards others, capacity to keep everyone safe, and reality testing.
4. **Symptom modules** — baby blues (early weeks only), depression, anxiety, perinatal OCD, birth trauma, bipolar spectrum, adjustment, the load of caring for more than one child, where the pressure sits and how she is adapting to it, grief, physical contributors, and the support context.
5. **Scenarios** — stage-matched everyday situations, from birth through the first birthday, plus scenarios for parents doing this alongside older children.
6. **Functioning** — what the person can actually do, scored separately from how they feel.
7. **Summary** — in two versions, switched at the top of the results page.

### Two summaries

**Written for me** — stage, ranked patterns, a severity band, functional impact, next steps, questions to take to a clinician, and local crisis resources.

**For my provider** — a handout meant to be printed or saved and handed over. It shows what was actually endorsed rather than a retelling of it:

- header with optional name or initials, date and time completed, stage, overall band and what drove it;
- the safety screen in full, **including the negatives**, so a denial is distinguishable from an unanswered question, with endorsements marked and benign answers not;
- each module with its band, raw score over available score, prorated percentage, every logged band adjustment, and the individual items endorsed with their levels;
- the bipolar warning detail, functioning item by item, the context answers, the scenarios the person picked, and the next steps they were shown;
- a closing block stating plainly that this is patient-completed, unreviewed, and that the numbers are not EPDS, PHQ-9, GAD-7, MDQ or PCL-5 scores.

Either version can be printed (a print stylesheet handles page breaks, drops the interface, and marks flagged rows without relying on colour), saved as a self-contained `.html` file with the stylesheet inlined, saved as wrapped plain text, or copied to the clipboard. Saving is a local file write — nothing is uploaded, and the name field never leaves the device.

### Two lengths

The check-up opens with a choice, and **the condensed version is the default**.

**Short (~5 minutes, roughly half the questions).** Safety, history and adaptation are asked in full — none of those is ever trimmed. Every other module is reduced to the items it is *defined* by: its cardinal symptoms plus one measure of intensity, along with any gate or safety-relevant item, so branching still works and nothing that could raise a flag is skipped. Scenarios are dropped. A module asked this way is capped at moderate, marked `screened only`, and reported as provisional wherever it appears: enough to say *look here*, never enough to say *how much*.

**Full (~20 minutes).** Every section, in one pass.

### Going deeper afterwards

The short summary ends with **Worth going deeper on** — the longer modules ranked by what the answers actually said, most useful first, each showing how many more questions it adds. Opening one drops into that module alone and returns straight to the updated summary; its cap lifts and it leaves the list. Four are offered at a time, with an *Answer everything that is left* option behind them.

Ranking is by signal strength, except that four things are always offered however low they score, because a three-item screen under-reads them: endorsed intrusive thoughts, a difficult birth, reduced need for sleep, and a loss being carried.

In practice a full run is about 125 questions for a first baby and 150 with older children; the condensed version is 62 and 73. Conditional gates cut both down further. Every question can be skipped.

## Design rules the code enforces

- **Not being able to function is itself a warning.** An inability to carry out care alongside a basic — getting up, eating, washing — reaches the urgent tier on its own, with no safety answer required. Severity used to top out at amber for everything that was not a safety flag, which meant someone reporting they could not care for themselves or their baby was told to arrange something in the next week.
- **Safety outranks scoring.** `evaluateSafety()` runs first and can halt ordinary scoring entirely. A low depression score never cancels a psychosis warning sign — there is a test for exactly that.
- **A safety flag interrupts when it happens, not at the end.** The level is re-checked after every section, because safety-relevant answers are not confined to the safety screen — the insight question sits in the OCD module, the household-safety question in the support module. Urgent flags interrupt as well as emergencies, and either way the person chooses whether to finish: being told something needs attention is not a reason to lose the rest of what they came to say.
- **A cap is a ceiling.** Caps are held back and applied after every other adjustment, so a later floor ("persistent for more than three months") can no longer overrule the cardinal-symptom rule. Where a band is held down but the symptom load behind it is real, both summaries say so rather than burying it.
- **Skipped is not zero.** Declined questions are dropped from both the numerator and the denominator, so opting out never quietly reads as "no symptoms".
- **Cardinal symptoms gate a pattern.** A module cannot report a notable pattern on peripheral items alone; without one of its defining symptoms it is capped.
- **Severity is never just a number.** Bands are adjusted by explicit, logged modifiers — duration, trajectory, controllability, time consumed, avoidance — and every adjustment is shown to the user in plain language.
- **Intrusive thoughts are not intent.** The OCD module asks about the person's *relationship* to the thought. Ego-dystonic distress routes to the OCD pattern; loss of insight routes to the psychosis pathway instead.
- **Exhaustion is not mania.** The bipolar module turns on decreased *need* for sleep, explicitly distinguished from being kept awake by a baby.
- **Load and adaptation are measured apart, then crossed.** Pressure is circumstance and carries no severity weight; adaptation — gaining ground, holding, or slipping — is what drives the level. A heavy load carried well is not converted into a diagnosis; its next step is subtraction. Losing ground *without* a load to explain it raises concern, names itself as a driver, and gets said out loud, because it is the pattern most often dismissed as having nothing to complain about.
- **History is a risk factor, not a symptom.** A previous perinatal episode, bipolar disorder, or antenatal depression can raise the floor of concern and change the next step, but never creates a symptom pattern or adds to a band. A previous postpartum psychosis also lowers the threshold on the current safety screen.
- **A later baby is not assumed to be harder.** The research on parity genuinely conflicts, so no result claims otherwise. What the tool weighs instead is the person's own history and their own load — and it says plainly that experience is not immunity.
- **Grief is not depression.** Grief is reported as grief, can coexist with anything else, and does not on its own escalate to a clinical concern.
- **Multiple patterns, not one verdict.** Nobody is forced into a single category.
- **No shaming, ever.** No result implies that needing help makes someone a bad parent, that loving a baby protects against illness, or that psychosis is severe anxiety. There is a test that greps generated output for banned phrasings.

## Clinical basis

Conceptual references: DSM-5-TR criteria sets, current ACOG perinatal mental-health guidance, American Psychiatric Association recommendations, Postpartum Support International materials, and the perinatal literature on OCD, PTSD, bipolar disorder, and postpartum psychosis. Construct coverage was informed by EPDS, PHQ-9, GAD-7, MDQ, and PCL-5.

**No copyrighted questionnaire is reproduced.** Every item is original wording written for this tool. Validated instruments were used to decide *which constructs to cover*, never as text to copy. Scores here are not EPDS or PHQ-9 scores and must not be reported as such.

See [`docs/clinical-framework.md`](docs/clinical-framework.md) for the per-module rationale and [`docs/safety-protocol.md`](docs/safety-protocol.md) for the escalation logic.

## Before any real-world use

This repository is a working reference implementation, not a deployable clinical product. Before it is put in front of real parents:

- Have the safety pathway reviewed and signed off by licensed clinicians in the jurisdiction it serves.
- Replace `src/data/resources.js` with verified, location-specific crisis resources, and re-verify them on a schedule.
- Decide and document what happens when someone triggers the emergency pathway — a live handoff, a warm line, an escalation contact — rather than leaving a screen of text as the whole response.
- Review the wording with people who have lived experience of perinatal mental illness, and with a perinatal loss organization for the grief module.
- Consider regulatory posture: depending on jurisdiction and claims, screening software can fall under medical-device rules.
- Test with screen readers, at 200% zoom, and on a cheap phone at 3am.

## Layout

```
index.html                 entry point
assets/styles.css
src/data/                  question banks — context, safety, domains, scenarios, functioning, resources
src/engine/                state, questionnaire assembly, safety, scoring, results, plain-text summary
src/ui/app.js              browser shell
tests/                     engine tests (node --test)
docs/                      clinical framework and safety protocol
```

The engine has no DOM dependency, so it can be reused behind a different interface — a conversational agent, a clinic intake form — without rewriting the logic.
