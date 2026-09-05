# Safety protocol

The safety screen runs before any symptom scoring and outranks all of it. Implementation: [`src/engine/safety.js`](../src/engine/safety.js); tests: [`tests/safety.test.js`](../tests/safety.test.js).

## Priority order

1. Safety
2. Reality testing
3. Severe functional impairment
4. Mania and psychosis warning signs
5. Suicidality and self-harm
6. Harm towards others
7. Medical contributors
8. Psychiatric symptom patterns
9. Normal adjustment

An overall positive picture never cancels a warning sign. Someone can score low on depression and still show possible psychosis; the psychosis finding wins, ordinary scoring stops, and the summary says so rather than reporting that nothing stood out.

## Levels

| Level | Effect |
|---|---|
| `emergency` | Ordinary scoring halts. The urgent pathway and local resources are shown, with a clear statement that a low score elsewhere would not change it. |
| `urgent` | The check-up completes, but the overall result is forced to 🔴 and next steps are same-day. |
| `elevated` | The overall result cannot fall below 🟠. |
| `none` | Nothing here changes the ordinary result. |

## Triggers

**Reality testing.** Five core items — hallucinations, fixed beliefs others contradict, severe confusion, external control of thoughts, ordinary events carrying special or threatening meaning — plus one corroborating item, whether people close by have said the person seems very different. Emergency when any core item reaches "several times", when two core items are endorsed at all, when one core item is endorsed alongside rapid onset or an observer's report, or when insight into intrusive thoughts is lost. A single core endorsement on its own is urgent.

Rapid onset matters: postpartum psychosis characteristically develops over days, most often in the first two weeks.

**Self-harm.** Graded rather than lumped together. Passive thoughts of being better off gone are `elevated`; thoughts of hurting oneself without intent are `urgent`; a plan, intent, or uncertainty about staying safe is `emergency`.

**Harm towards others.** The question distinguishes what the person's experience of the thought is, not how alarming it sounds:

- unwanted, frightening, horrifying → **not** a safety flag; routes to the OCD module and produces an explicit note that an intrusive thought is not an intention;
- feels like an urge or a pull → emergency;
- feels necessary, deserved, or right → emergency.

Getting this distinction wrong in either direction causes harm. Treating intrusive thoughts as danger drives parents into silence, which is the main reason perinatal OCD goes untreated for years. Treating an urge as an intrusive thought misses a person in danger.

**Capacity.** Unable to keep self and baby safe → emergency. Unsure → urgent, or emergency alongside any reality-testing endorsement.

**Interpersonal safety.** Not feeling safe with someone at home is `elevated` and produces a route to confidential advocacy. In the emergency pathway it also changes the advice about who to involve — "someone you trust from outside your home" rather than a generic trusted adult.

**Declined questions.** Skipping safety items is `elevated`. It is never read as a "no".

## Wording rules

- No item asks for a description of self-harm or violence, and none asks the person to prove or defend a belief.
- The emergency screen states plainly that the flag is not a judgment about them as a parent and does not mean their baby will be taken away — fear of exactly that is a leading reason these symptoms go unreported.
- Psychosis is described as rare, as a medical and psychiatric emergency, and explicitly not as a severe form of anxiety.

## In the clinician handout

The provider view reports the entire safety screen, answered or not, endorsed or not. Denials are shown rather than omitted, unanswered questions are labelled as such, and options marked benign in the data are not highlighted as findings. Where scoring was halted, the handout says so at the top and notes that the symptom bands below it were never presented to the patient as a result.

## What this file does not cover

The emergency pathway here ends in text on a screen. A real deployment needs more: licensed clinicians who have reviewed and signed off the logic, verified location-specific crisis resources, a defined handoff, a documented record of what the person was shown, and a decision about mandatory-reporting obligations in the jurisdiction. None of that can be inferred from the code, and shipping without it would be worse than not shipping.
