# Postpartum Check-Up

An evidence-informed postpartum mental-health **check-up and navigation tool**. It helps a parent in the first year after birth reflect on what they are experiencing, recognise patterns that may warrant support, and work out what level of care to seek.

It is **not** a diagnostic instrument. It produces screening observations, symptom patterns, and next steps — never a diagnosis.

```
npm start     # serve at http://localhost:4173
npm test      # run the engine test suite
```

Everything runs in the browser. There is no backend, no account, and no analytics. Answers stay in memory unless the person explicitly opts in to saving them in their own browser, and they can delete them from the summary screen.

---

## What it does

The check-up runs in this order, and the order is the point:

1. **Context** — stage, birth, feeding, sleep, work, stressors, support. Contextual only; no circumstance is treated as inherently healthier than another.
2. **Safety** — asked of everyone, before any symptom scoring. Self-harm, harm towards others, capacity to keep everyone safe, and reality testing.
3. **Symptom modules** — baby blues (early weeks only), depression, anxiety, perinatal OCD, birth trauma, bipolar spectrum, adjustment, grief, physical contributors, and the support context.
4. **Scenarios** — stage-matched everyday situations, from birth through the first birthday.
5. **Functioning** — what the person can actually do, scored separately from how they feel.
6. **Summary** — stage, ranked patterns, a severity band, functional impact, next steps, questions to take to a clinician, and local crisis resources.

A full run is around 90 questions; conditional gates (trauma, grief, baby blues, scenario stage) cut that down considerably for most people. Every question can be skipped.

## Design rules the code enforces

- **Safety outranks scoring.** `evaluateSafety()` runs first and can halt ordinary scoring entirely. A low depression score never cancels a psychosis warning sign — there is a test for exactly that.
- **Skipped is not zero.** Declined questions are dropped from both the numerator and the denominator, so opting out never quietly reads as "no symptoms".
- **Cardinal symptoms gate a pattern.** A module cannot report a notable pattern on peripheral items alone; without one of its defining symptoms it is capped.
- **Severity is never just a number.** Bands are adjusted by explicit, logged modifiers — duration, trajectory, controllability, time consumed, avoidance — and every adjustment is shown to the user in plain language.
- **Intrusive thoughts are not intent.** The OCD module asks about the person's *relationship* to the thought. Ego-dystonic distress routes to the OCD pattern; loss of insight routes to the psychosis pathway instead.
- **Exhaustion is not mania.** The bipolar module turns on decreased *need* for sleep, explicitly distinguished from being kept awake by a baby.
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
- Review the wording with people who have lived experience of perinatal mental illness, and with a perinatal loss organisation for the grief module.
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
