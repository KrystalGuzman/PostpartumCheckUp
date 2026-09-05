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

Then explicit modifiers apply, each logged with a plain-language reason that is shown to the user:

| Module | Modifier |
|---|---|
| Depression | worsening trajectory raises a band; under two weeks caps at moderate; over three months floors at moderate; severe distress floors at moderate |
| Anxiety | worry that does not respond at all to redirection raises a band; over three months floors at moderate; repeated panic-type surges floor at moderate |
| OCD | >1h/day floors at moderate, >3h/day floors at high; avoidance of care situations floors at moderate |
| Trauma | intrusion *and* avoidance together floor at moderate |
| Baby blues | worsening raises a band; no relief between low moments floors at moderate |
| Adjustment | distress that does not lift when the pressure lifts caps at moderate, since it may not be stress-linked alone |

Two rules apply everywhere:

- **Prorating.** Declined and inapplicable answers leave both `raw` and `max`, so skipping is never read as an implicit "no".
- **Cardinal symptoms.** Each module names the symptoms it is defined by. Without at least one endorsed at "more days than not", the band is capped at low, however many peripheral items are endorsed. This is what stops "tired, distracted, and not eating much" from being reported as a depression pattern.

---

## Modules

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

Present because missing it is dangerous: antidepressant monotherapy in undetected bipolar disorder can precipitate a manic episode, and postpartum onset is a recognised high-risk window. The defining item is **decreased need for sleep** — sleeping little and feeling fine — written to be unmistakably different from being exhausted by a waking baby.

A warning is raised when reduced need for sleep occurs with elevated or irritable mood and other features, or when several features clustered in one period caused real problems. A warning forces at least amber overall and generates a specific next step: assessment before any antidepressant is started or changed. Personal and family history are collected as risk context.

### Postpartum psychosis (Part 10)

Handled as an emergency category, never as a score. See [`safety-protocol.md`](safety-protocol.md).

### Adjustment and life stress (Part 11)

Distress closely tied to identifiable stressors, assessed on linkage, distress, capacity to absorb, preoccupation, onset relative to a change, and whether relief in circumstances brings relief in mood. Distress that does not lift when the pressure does is capped here, because that pattern points elsewhere. Nothing in this module implies that circumstantial distress is less real or less deserving of help.

### Grief and loss (Part 12)

Gated on a loss screen that includes losses often left unnamed: the expected birth, physical ability, the feeding relationship, independence, career, and the pre-parent self, alongside miscarriage, stillbirth, neonatal death, termination, fertility struggles, and bereavement. Grief is never reclassified as depression. It contributes at half weight to severity and cannot on its own push a result past amber, while its coexistence with a clinical pattern is stated plainly. Whether anyone has acknowledged the loss is asked, because disenfranchised grief is common here.

### Physical and medical contributors (Part 13)

A checklist of physical symptoms that can drive mood and energy — bleeding, anaemia signs, thyroid signs, pain, infection, blood-pressure warning signs, chronic illness, medication changes, nutrition, substance use — plus whether the person has actually told a clinician the full picture, and whether they have had a postpartum check-up. Endorsements produce a medical next step, not a psychiatric one. The tool diagnoses nothing here; it flags what a clinician should rule out.

### Scenarios (Part 14)

Stage-matched situations across birth, the first month, months 2–3, 4–6, and 6–12. Birth scenarios are shown only when the corresponding context answer was given, so nobody is asked about a NICU stay they did not have. Response options weight the domains the scenario declares; "this is not part of my experience" removes the scenario from scoring rather than scoring it as low. No parenting choice — feeding, working, sleep arrangement, weaning — is scored as better than another.

### Relationship and support (Part 15)

Collected as **context, not symptoms**: night division, practical and emotional support, ongoing conflict, being judged or dismissed, isolation, feeling alone within a relationship, and whether the person feels safe with the people they live with. That last item raises a flag and produces a route to confidential advocacy; it never appears as a psychiatric finding.

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

Language rules, enforced by tests that grep generated output:

- Patterns are attributed to responses, and judgment is attributed to clinicians: *"Your responses show several symptoms commonly associated with depression. A healthcare professional can determine whether they meet criteria for a depressive disorder."*
- A quiet result says what the screening did not find, not that the person is fine.
- No output shames the parent, implies that needing help means failing at parenthood, implies that loving a baby is protective against illness, treats an intrusive thought as intent, or describes psychosis as severe anxiety.
