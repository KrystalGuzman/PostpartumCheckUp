# Clinical framework

How each part of the check-up is constructed, what it is and is not claiming, and where the judgment calls are. Read alongside [`safety-protocol.md`](safety-protocol.md).

Throughout: this tool produces **screening observations**. It does not diagnose, and it cannot rule a condition in or out.

---

## Sources and copyright

Conceptual references are DSM-5-TR criteria sets, current ACOG perinatal mental-health guidance, American Psychiatric Association recommendations, Postpartum Support International materials, and the clinical literature on perinatal OCD, PTSD, bipolar disorder, and postpartum psychosis. Construct coverage was informed by the EPDS, PHQ-9, GAD-7, MDQ, and PCL-5.

Every item in `src/data/` is original wording. No validated instrument is reproduced, in whole or in fragments. This matters twice over: those instruments are copyrighted, and a paraphrase of a validated scale carries none of its validation. Nothing this tool produces should be recorded as an EPDS or PHQ-9 score.

Response anchors ("A few days", "More days than not") are generic frequency descriptors, not instrument text.

---

## Scoring model

Each module produces a **pattern strength**, not a diagnosis:

```
raw   = sum of scores on answered, scored items (+ scenario weights for that domain)
max   = 3 × count of those items          (+ 3 per contributing scenario)
ratio = raw / max
band  = minimal (<.17) · low (<.34) · moderate (<.55) · high (≥.55)
```

Then explicit modifiers apply, each logged with a plain-language reason that is shown to the user. Floors and steps apply first; **caps are held back and applied last, as a ceiling**, so that a floor can never quietly overrule the cardinal-symptom rule:

| Module | Modifier |
|---|---|
| Depression | worsening trajectory raises a band; under two weeks caps at moderate; over three months floors at moderate; severe distress floors at moderate |
| Anxiety | worry that does not respond at all to redirection raises a band; over three months floors at moderate; repeated panic-type surges floor at moderate |
| OCD | >1h/day floors at moderate, >3h/day floors at high; avoidance of care situations floors at moderate |
| Trauma | intrusion *and* avoidance together floor at moderate |
| Baby blues | worsening raises a band; no relief between low moments floors at moderate |
| Adjustment | distress that does not lift when the pressure lifts caps at moderate, since it may not be stress-linked alone |
| Every module | five or more symptoms endorsed at the top of the scale floor at high, three or more at moderate — several maximal answers should not be diluted by the items someone answered "not at all" |

Two rules apply everywhere:

- **Prorating.** Declined and inapplicable answers leave both `raw` and `max`, so skipping is never read as an implicit "no".
- **Cardinal symptoms.** Each module names the symptoms it is defined by. The rule is met by one endorsed at "more days than not", **or by two present at any level** — several mild cardinal symptoms still make the pattern, and requiring a single strong one missed people whose symptoms were spread thin. Otherwise the band is capped at low, however many peripheral items are endorsed. This is what stops "tired, distracted, and not eating much" from being reported as a depression pattern.
- **A cap is not a dismissal.** Where the cardinal rule holds a band down but the underlying ratio is moderate or higher, both summaries carry an explicit note naming the missing cardinal symptoms and saying the load is worth a clinician's eye. The rule protects against over-reading; it must not bury what someone reported.

---

## Modules

### Perinatal and psychiatric history

Added because history is the strongest predictor in this field and the check-up originally asked for none of it. Covered: episodes after a previous birth (depression, anxiety, intrusive thoughts, birth trauma, psychosis or admission), whether help was obtained and whether it worked, mood during this pregnancy, lifetime psychiatric history, and — for parents who have done this before — their own comparison with last time.

Everything here is a **risk factor, not a symptom**. It never creates a pattern, never adds to a band, and never appears in a list of what someone is experiencing. What it can do is raise the floor of concern, change the next step, and make sure a clinician is told:

| Weight | What qualifies | Effect |
|---|---|---|
| high | Previous postpartum psychosis or psychiatric admission; bipolar disorder; previous psychosis | floors overall concern at amber |
| elevated | Depression, anxiety or intrusive thoughts after a previous birth; low mood through most of this pregnancy; "much harder than last time" | floors it at yellow |
| context | Lifetime history, treatment barriers last time, multiples, short interval, an older child with additional needs, less help than last time | reported and acted on, moves nothing |

A previous postpartum psychosis also lowers the threshold on the *current* safety screen: one endorsed reality-testing item is treated as an emergency rather than urgent. Recurrence after a later birth is high, onset is fast, and it is one of the few situations in perinatal mental health where care arranged in advance prevents an episode rather than only treating one.

### Pressure and adaptation

Two things, measured apart and then crossed, because neither says much alone.

**Pressure** is a profile rather than a total: body, sleep debt, time, mental load, money, relationship, being the person everyone needs, identity, being judged, and — for parents of more than one — splitting themselves between the children. It is scored as circumstance, carries no severity weight, and is reported under context. A heavy load is not a finding about a person.

**Adaptation** is the direction of travel under that load: finding your feet or slipping, whether rest still restores you, whether you feel more capable than a month ago, whether you can picture this easing, how much margin is left, whether a day costs more than it did, and whether good moments still land. This is scored as a symptom module, because losing ground *is* the clinical signal.

Crossing them gives four readings:

| | adapting | losing ground |
|---|---|---|
| **low pressure** | settled | **the load does not explain it** |
| **high pressure** | carrying it, for now | the load has outrun capacity |

The bottom-left cell is why the section exists. Someone with ordinary circumstances who is still losing ground is the person most likely to be told — and to tell themselves — that they have nothing to complain about. The result says so directly, raises the floor to yellow, adds a named driver so the level does not look unaccountable, and gives them the sentence to use: *"things are not especially hard right now and I am still going under."*

The top-right cell matters too, in the other direction: a heavy load carried well is not converted into a clinical finding. The next step there is subtraction — naming the two heaviest pressures and taking something off them — not treatment.

Two items are called out individually rather than only inside a band. **Rest no longer restoring** separates exhaustion from sleep debt and usually changes what a clinician looks for. **Good moments not landing** is anhedonia in the language people actually use.

### Probing the difference in pressure

For a parent who has done this before, "is it harder?" is the wrong question — it forces a single comparison onto something that has moved rather than grown. Two items do better:

- **Where has the pressure moved?** — more confident with the baby but more depleted overall; less worry about the baby, more about everything else; the logistics rather than the baby; more physical this time; guilt spread across more people; less help; the same pressures, only heavier.
- **The confidence/capacity split** — how the baby-care part feels *compared with everything around it*. Parenting self-efficacy reliably rises with experience while capacity for everything else falls, and a single "harder or easier" question cannot see that divergence. Endorsing "confident with the baby, struggling with everything else" produces a note naming the split, because it is missed in both directions: from outside she looks like someone who has this handled, and from inside it can feel as though there is no legitimate reason to be struggling.

### Caring for more than one child

Built carefully, because it could easily rest on a folk belief. **Whether a later baby carries more risk than a first is genuinely unsettled** — some large samples put multiparous parents at lower risk than first-timers, others find no difference — so no result tells a parent that a subsequent baby is harder, and the tool says as much in plain terms.

What is better supported is that the shape of the pressure differs, and that specific things which travel with having other children carry their own risk: a short gap between births, caring for a child with a disability or ongoing medical needs, less practical help than the first time, and the loss of any recovery period at all. Those are what the module asks about, as load rather than as facts about family size.

It also asks the two questions that keep experienced parents out of care: whether they feel they should be able to handle this because they have done it before, and whether that has stopped them asking for help. The result names that directly — experience is not immunity, and "I should know how to do this by now" is among the most common reasons people wait too long to speak.

Scored as a symptom module (it produces distress and impairment, like the adjustment module) but worded throughout as circumstance. Functioning gains an item about caring for the other children; the scenario bank gains stage-independent scenarios about divided attention, an older child's reaction, the help that did not come the second time, and being told "you know what you're doing this time".

### Common postpartum adjustment (Part 3)

Not a diagnosis and not a scored module — a framing applied when nothing else stands out. The distinction from a clinical pattern is made on duration, severity, persistence, trajectory, functional impairment, distress, and capacity for self- and infant care, not on the fact of having recently given birth. The result text is careful never to say "that's normal" as a way of closing a conversation.

### Baby blues (Part 4)

Offered only up to eight weeks postpartum. Reported as consistent only when the pattern is mild-to-moderate, began in the first days or fortnight, is settling rather than deepening, leaves stretches of relief, is not accompanied by a strong depression or anxiety pattern, is not significantly impairing, and raises no safety flags. Otherwise the disqualifying reasons are named and the person is pointed at evaluation instead. It is presented explicitly as a common adjustment pattern, not a DSM-5-TR diagnosis.

### Depression (Part 5)

Cardinal items are low mood, anhedonia, **and emotional numbness** — the third is there because postpartum depression frequently presents as flatness or absence of feeling rather than sadness, and a screen that only asks about crying misses it. Also covered: guilt, worthlessness, energy, sleep (asked separately from infant-driven waking), appetite, concentration, psychomotor change, withdrawal, disconnection from the baby, and disconnection from the self.

The two-week duration threshold is applied as a *cap with an explanation*, never as a gate that hides the result.

### Anxiety (Part 6)

Ordinary parental vigilance is separated from an anxiety pattern by intensity, frequency, **controllability**, impairment, avoidance, reassurance-seeking, and physical symptoms. Controllability carries a modifier of its own because it is the most reliable discriminator in this population. Panic-type surges are asked about directly.

### Perinatal OCD (Part 7)

The critical item is not the content of the thought but the person's **relationship to it**:

- *"It horrifies me, I don't want it, I work to make sure nothing like it happens"* → ego-dystonic; OCD pattern.
- *"I'm not sure whether it's a thought or something really happening"* → uncertain insight; escalates.
- *"I believe it, even when people tell me otherwise"* → absent insight; routes to the psychosis pathway.

The module asks about themes as categories so nobody has to type out a frightening thought. Compulsions covered: checking, reassurance-seeking, repeated searching, mental review, cleaning, and avoidance, plus time consumed. Results state plainly that an intrusive thought is not an intention — this is the single most common reason parents conceal these symptoms.

### Trauma (Part 8)

Gated on an event screen that includes the ones clinicians miss: feeling powerless, being dismissed or spoken over, and earlier trauma reactivated by birth. A birth can be traumatic even when the outcome was good and everyone called it routine. Symptoms cover intrusion, nightmares, avoidance, distress and physical reactivity to reminders, hypervigilance, detachment, blame and loss of trust in providers, and fear of future care. Duration is recorded because the one-month mark distinguishes an acute stress response from PTSD — recorded, not used to dismiss distress inside the first month.

### Bipolar spectrum (Part 9)

Present because missing it is dangerous: antidepressant monotherapy in undetected bipolar disorder can precipitate a manic episode, and postpartum onset is a recognized high-risk window. The defining item is **decreased need for sleep** — sleeping little and feeling fine — written to be unmistakably different from being exhausted by a waking baby.

Reduced need for sleep is the gate — exhaustion cannot reach the warning however much irritability or racing thought accompanies it. Past that gate a warning is raised when features clustered in one period, counting several mild features as heavily as a couple of severe ones, since an early screen that demands severity on every item misses the presentations most likely to be dismissed as tiredness. A warning forces at least amber overall and generates a specific next step: assessment before any antidepressant is started or changed. Personal and family history are collected as risk context.

### Postpartum psychosis (Part 10)

Handled as an emergency category, never as a score. See [`safety-protocol.md`](safety-protocol.md).

### Adjustment and life stress (Part 11)

Distress closely tied to identifiable stressors, assessed on linkage, distress, capacity to absorb, preoccupation, onset relative to a change, and whether relief in circumstances brings relief in mood. Distress that does not lift when the pressure does is capped here, because that pattern points elsewhere. Nothing in this module implies that circumstantial distress is less real or less deserving of help.

### Grief and loss (Part 12)

Gated on a loss screen that includes losses often left unnamed: the expected birth, physical ability, the feeding relationship, independence, career, and the pre-parent self, alongside miscarriage, stillbirth, neonatal death, termination, fertility struggles, and bereavement. Grief is never reclassified as depression. It contributes at half weight to severity and cannot on its own push a result past amber, while its coexistence with a clinical pattern is stated plainly. Whether anyone has acknowledged the loss is asked, because disenfranchised grief is common here.

### Physical and medical contributors (Part 13)

A checklist of physical symptoms that can drive mood and energy — bleeding, anemia signs, thyroid signs, pain, infection, blood-pressure warning signs, chronic illness, medication changes, nutrition, substance use — plus whether the person has actually told a clinician the full picture, and whether they have had a postpartum check-up. Endorsements produce a medical next step, not a psychiatric one. The tool diagnoses nothing here; it flags what a clinician should rule out.

### Scenarios (Part 14)

Stage-matched situations across birth, the first month, months 2–3, 4–6, and 6–12. Birth scenarios are shown only when the corresponding context answer was given, so nobody is asked about a NICU stay they did not have. Response options weight the domains the scenario declares; "this is not part of my experience" removes the scenario from scoring rather than scoring it as low. No parenting choice — feeding, working, sleep arrangement, weaning — is scored as better than another.

### Relationship and support (Part 15)

Reported under its own heading, never among the strongest patterns: a module of circumstances must not head a list a parent reads as a list of things wrong with them. Collected as **context, not symptoms**: night division, practical and emotional support, ongoing conflict, being judged or dismissed, isolation, feeling alone within a relationship, and whether the person feels safe with the people they live with. That last item raises a flag and produces a route to confidential advocacy; it never appears as a psychiatric finding.

### Functioning (Part 16)

Twelve activities scored for difficulty and prorated separately from every symptom module, then weighed alongside them. Severe difficulty with self-care, eating, getting up, or infant care lifts the tier regardless of the average. An unanswered section reports as *unknown*, never as "little interference".

---

## Result construction (Parts 17–18)

The summary reports stage, ranked patterns, a severity band, functional impact, next steps, questions for a clinician, and resources. Severity comes from the pattern bands, functional impact, the bipolar warning, and the safety evaluation together — never from a single number — and the drivers are listed.

| Band | Meaning |
|---|---|
| 🟢 | Low concern / monitor |
| 🟡 | Mild-to-moderate concern / consider professional support |
| 🟠 | Significant concern / arrange professional assessment |
| 🔴 | Urgent concern / seek immediate professional evaluation |

### The clinician handout

The results page offers a second view intended to be printed or saved and handed to a professional. It is a record of responses, not an assessment, and it makes no recommendation the parent-facing summary does not also make.

Three decisions worth naming:

- **Negatives are reported.** The safety block lists every safety question with its answer, including denials, and distinguishes both from "not answered". A clinician reading a screening handout needs to know that self-harm was asked about and denied, not merely that it is absent from the page.
- **Benign answers are not marked as findings.** "Mostly — it is hard, but we are okay" scores above zero for the capacity item but is flagged in the data as benign, so it is not highlighted as an endorsement. Options carry that marker rather than the rendering code guessing from scores.
- **Item-level detail, not just bands.** Each module lists what was endorsed and at what level, alongside the raw score, the denominator, and every band adjustment with its reason. A band on its own is not clinically actionable, and a prorated percentage is misleading without the count of answered items beside it.

The handout also states, in its own words, that it is patient-completed, that no clinician reviewed it, and that its numbers are not scores from any validated instrument.

Language rules, enforced by tests that grep generated output:

- Patterns are attributed to responses, and judgment is attributed to clinicians: *"Your responses show several symptoms commonly associated with depression. A healthcare professional can determine whether they meet criteria for a depressive disorder."*
- A quiet result says what the screening did not find, not that the person is fine.
- No output shames the parent, implies that needing help means failing at parenthood, implies that loving a baby is protective against illness, treats an intrusive thought as intent, or describes psychosis as severe anxiety.
