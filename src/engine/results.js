/**
 * Parts 17, 18 and the final output — turning the scored picture into language.
 *
 * Every phrase here is a screening observation. The module contains no sentence
 * that asserts a diagnosis, and the phrasings called out in Part 18 are used
 * verbatim where they apply.
 */

import { FUNCTIONING_LABEL } from './scoring.js';
import { EMERGENCY_STATEMENT, PSYCHOSIS_STATEMENT } from './safety.js';
import { getRegion, providerRoutes } from '../data/resources.js';

export const DISCLAIMER =
  'These are screening observations, not a diagnosis. This check-up cannot determine the cause of what you are experiencing, and it cannot rule a condition in or out. Only a qualified professional can do that.';

export const CLOSING =
  'You don’t have to wait until things become unbearable to ask for help. Postpartum mental health exists on a spectrum, and getting support early can make a meaningful difference.';

const LOW_CONCERN_STATEMENT =
  'Your responses do not currently suggest a high level of concern based on this screening, although this check-up cannot rule out a mental-health condition.';

/** Wording per domain and band. Nothing below names a disorder as a fact. */
const DOMAIN_LANGUAGE = {
  depression: {
    high: 'Your responses show several symptoms commonly associated with depression. A healthcare professional can determine whether they meet criteria for a depressive disorder.',
    moderate:
      'Your responses show a number of symptoms that can occur with postpartum depression. This is worth raising with a healthcare professional rather than waiting to see whether it passes.',
    low: 'Your responses show a few symptoms that overlap with depression. On their own they may reflect exhaustion or adjustment, but they are worth keeping an eye on.',
  },
  anxiety: {
    high: 'Your responses show a level of worry and physical tension that goes beyond ordinary parental concern, particularly in how hard it is to steer or switch off. A healthcare professional can assess whether an anxiety disorder is present.',
    moderate:
      'Your responses show a pattern of worry that is frequent and hard to settle. This is common after birth and also very treatable, and it is worth discussing with a professional.',
    low: 'Your responses show some worry and vigilance, which is a normal part of caring for a baby. Keep an eye on whether it becomes harder to control.',
  },
  ocd: {
    high: 'Your responses show a pattern of intrusive thoughts and repetitive behaviours that can occur with postpartum OCD. Consider discussing this pattern with a qualified mental-health professional.',
    moderate:
      'Your responses show unwanted intrusive thoughts together with checking, reassurance-seeking, or mental rituals — a pattern that can occur with postpartum OCD. A professional familiar with perinatal OCD can assess it properly.',
    low: 'Your responses mention unwanted intrusive thoughts. These are reported by a large share of new parents and are not a sign of danger, though they are worth mentioning if they become more frequent or start shaping what you do.',
  },
  trauma: {
    high: 'Your responses show intrusion, avoidance, and heightened alertness connected to your birth or the period after it — a pattern that can occur with post-traumatic stress. A professional can assess whether it meets criteria for a trauma-related disorder.',
    moderate:
      'Your responses show ongoing distress connected to what happened around the birth. Birth-related trauma responds well to trauma-focused treatment, and this is worth raising with a professional.',
    low: 'Your responses mention some difficult memories of the birth. Distressing memories are not the same as a trauma disorder, but note whether they are fading or staying put.',
  },
  bipolar: {
    high: 'Your responses include features associated with the bipolar spectrum, including periods of elevated energy with reduced need for sleep. This needs professional assessment rather than being treated as anxiety or ordinary tiredness.',
    moderate:
      'Your responses include some features associated with the bipolar spectrum. This is important to assess properly, because it changes what kind of treatment is safe.',
    low: 'Your responses mention some periods of higher energy. This may be nothing; mention it anyway if you are offered treatment for mood.',
  },
  adjustment: {
    high: 'Your responses show significant distress that tracks closely with identifiable pressures in your life right now. Difficulty of circumstances does not make distress less real or less deserving of support.',
    moderate:
      'Your responses show distress that is closely tied to specific stressors. Practical support and someone to talk to can both make a genuine difference here.',
    low: 'Your responses show manageable stress connected to your circumstances.',
  },
  grief: {
    high: 'Your responses describe substantial grief. Grief is not a mental illness and does not need to be reframed as depression, though the two can sit side by side and both deserve support.',
    moderate: 'Your responses describe grief connected to a real loss. Support for grief is available and is different from treatment for depression.',
    low: 'Your responses touch on a sense of loss.',
  },
  baby_blues: {
    high: 'Your responses show frequent tearfulness and mood swings that go beyond what would usually settle on its own.',
    moderate: 'Your responses show tearfulness and mood swings in the early weeks.',
    low: 'Your responses show some emotional fluctuation in the early weeks.',
  },
  medical: {
    high: 'Your responses mention several physical symptoms that can affect mood and energy. These need a medical assessment, not only a mental-health one.',
    moderate: 'Your responses mention physical symptoms that can affect mood and energy, and are worth a medical review.',
    low: 'Your responses mention a physical symptom worth mentioning at your next appointment.',
  },
  support: {
    high: 'Your responses describe substantial strain in the support around you.',
    moderate: 'Your responses describe some strain in the support around you.',
    low: 'Your responses describe a few pressures in the support around you.',
  },
};

const BABY_BLUES_CONSISTENT =
  'Your responses fit the short-lived early-weeks pattern often called the baby blues: mild, fluctuating, starting soon after birth, and easing rather than deepening. That description is not a psychiatric diagnosis — it is a common adjustment pattern. If it has not lifted within a couple of weeks, or if it starts to deepen, that is the point to have it looked at.';

const NORMAL_ADJUSTMENT =
  'Much of what you describe sits within the range of common postpartum adjustment — the fatigue, the shifting sense of who you are, the stretches of feeling out of your depth. Saying that is not the same as saying it should be easy, and it is not a reason to go without support if you want it.';

const INTRUSIVE_THOUGHTS_NOTE =
  'You mentioned unwanted, frightening thoughts about harm. Thoughts like these are reported by a very large share of new parents. An intrusive thought is not an intention and not a prediction, and the distress they cause you is itself evidence of how far they sit from what you want. They are also very treatable — clinicians who work in perinatal mental health hear about them constantly.';

export function stageSentence(weeks) {
  if (weeks == null) return 'You did not say how far postpartum you are.';
  if (weeks < 2) return 'You are in the first couple of weeks postpartum.';
  if (weeks < 9) return `You are approximately ${Math.round(weeks)} weeks postpartum.`;
  const months = Math.round(weeks / 4.35);
  if (months >= 12) return 'You are around a year or more postpartum.';
  return `You are approximately ${months} months postpartum.`;
}

export function buildResults(scored, state, regionId = 'us') {
  const region = getRegion(regionId);
  const { safety, severity, functioning, ranked, bipolar, babyBlues, drivers } = scored;

  const emergency = safety.stopScoring;

  const patterns = emergency
    ? []
    : ranked
        .filter((d) => !(d.domain === 'baby_blues' && babyBlues.consistent))
        .map((d) => ({
          domain: d.domain,
          label: d.label,
          band: d.band,
          kind: d.kind,
          statement: DOMAIN_LANGUAGE[d.domain]?.[d.band] ?? DOMAIN_LANGUAGE[d.domain]?.low ?? '',
          modifiers: d.modifiers,
        }));

  const notes = [];
  if (!emergency) {
    if (babyBlues.consistent) notes.push(BABY_BLUES_CONSISTENT);
    if (babyBlues.applicable && babyBlues.endorsed && !babyBlues.consistent) {
      notes.push(
        `What you describe goes beyond the short-lived early-weeks pattern, because ${joinList(babyBlues.reasons)}. That does not make it a disorder — it means it deserves a proper look rather than being waved off as the baby blues.`,
      );
    }
    if (patterns.length === 0 || patterns.every((p) => p.band === 'low')) notes.push(NORMAL_ADJUSTMENT);
    if (safety.intrusiveHarmThoughts) notes.push(INTRUSIVE_THOUGHTS_NOTE);
    if (bipolar.warning) notes.push(medicationCautionNote());
  }

  return {
    emergency,
    scoringHalted: emergency
      ? 'Ordinary scoring has been stopped, so no symptom pattern is reported below. That is not a statement that nothing else is going on — it is that the responses above need a person to assess them, and a score would only get in the way.'
      : null,
    statement: emergency ? EMERGENCY_STATEMENT : null,
    psychosisNote: emergency && safety.reasons.some((r) => r.code.startsWith('psychosis')) ? PSYCHOSIS_STATEMENT : null,
    stage: stageSentence(scored.weeksPostpartum),
    severity,
    severityDrivers: drivers,
    functionalImpact: {
      tier: functioning.tier,
      label: FUNCTIONING_LABEL[functioning.tier],
      hardest: functioning.hardest.slice(0, 4),
    },
    patterns,
    lowConcernStatement: !emergency && severity.key === 'green' ? LOW_CONCERN_STATEMENT : null,
    notes: notes.filter(Boolean),
    warnings: safety.reasons.filter((r) => r.level !== 'none'),
    nextSteps: buildNextSteps(scored, state, region),
    providerQuestions: buildProviderQuestions(scored, state),
    resources: region,
    closing: emergency ? null : CLOSING,
    disclaimer: DISCLAIMER,
  };
}

function medicationCautionNote() {
  return 'One practical consequence: if antidepressant treatment is ever discussed, tell the prescriber about these periods of elevated energy and reduced need for sleep first. It changes what is safest to start with.';
}

function buildNextSteps(scored, state, region) {
  const { safety, severity, byDomain, bipolar, functioning } = scored;
  const steps = [];

  if (safety.stopScoring) {
    steps.push({
      priority: 'urgent',
      text: `Seek professional evaluation today — ${providerRoutes.urgent}. Do not wait for a scheduled appointment.`,
    });
    const unsafeAtHome = safety.reasons.some((r) => r.code === 'relationship_safety');
    steps.push({
      priority: 'urgent',
      text: unsafeAtHome
        ? 'Tell someone you trust from outside your home what you have reported here, and ask them to help you get seen. You also indicated you do not feel safe with someone you live with — tell the clinician who assesses you that as well, when you can do so privately.'
        : 'Tell a trusted adult what you have reported here and ask them to stay with you and help you get seen.',
    });
    steps.push({
      priority: 'urgent',
      text: `If there is immediate danger, contact ${region.emergency.contact} or go to the nearest emergency department.`,
    });
    return steps;
  }

  if (severity.key === 'red') {
    steps.push({
      priority: 'urgent',
      text: `Contact a professional today or tomorrow — ${providerRoutes.obstetric}, or ${providerRoutes.primary}, or a crisis line if you cannot get through.`,
    });
    steps.push({ priority: 'urgent', text: 'Tell someone you trust how you are actually doing, today.' });
  } else if (severity.key === 'orange') {
    steps.push({
      priority: 'high',
      text: `Arrange an assessment in the next week or so — with ${providerRoutes.obstetric}, or with ${providerRoutes.primary}.`,
    });
    steps.push({
      priority: 'high',
      text: 'Ask specifically for a formal perinatal mental-health screening rather than a general check-in.',
    });
  } else if (severity.key === 'yellow') {
    steps.push({
      priority: 'medium',
      text: `Raise this at your next appointment, or bring it forward — with ${providerRoutes.obstetric}, with ${providerRoutes.primary}, or with ${providerRoutes.pediatric}.`,
    });
    steps.push({ priority: 'medium', text: 'Tell one person who can check in on you over the coming weeks.' });
  } else {
    steps.push({ priority: 'low', text: 'Keep an eye on how things go, and repeat this check-up if anything shifts.' });
    steps.push({ priority: 'low', text: 'Tell someone you trust how things are going, before it becomes urgent to.' });
  }

  if (bipolar.warning) {
    steps.push({
      priority: 'high',
      text: `Ask for a bipolar-spectrum assessment with ${providerRoutes.psychiatry} before starting or changing any mood medication.`,
    });
  }
  if (['moderate', 'high'].includes(byDomain.ocd.band)) {
    steps.push({
      priority: 'medium',
      text: `Look for ${providerRoutes.therapy} who works with perinatal OCD specifically — exposure-based treatment is well established for this pattern.`,
    });
  }
  if (['moderate', 'high'].includes(byDomain.trauma.band)) {
    steps.push({
      priority: 'medium',
      text: `Ask about trauma-focused therapy, and about a birth debrief or notes review if you want to understand what happened.`,
    });
  }
  if (['moderate', 'high'].includes(byDomain.grief.band)) {
    steps.push({ priority: 'medium', text: 'Consider grief-specific or perinatal-loss support rather than only mood treatment.' });
  }
  if ((state.scoreOf('med_symptoms') ?? 0) > 0) {
    steps.push({
      priority: 'medium',
      text: `Get the physical symptoms you mentioned looked at — bloods for anaemia and thyroid function are routine and can matter here. Speak to ${providerRoutes.primary}.`,
    });
  }
  if (['no', 'downplayed'].includes(state.valueOf('med_discussed'))) {
    steps.push({
      priority: 'medium',
      text: 'You mentioned not having told a professional the full picture. Taking this summary with you makes that conversation shorter.',
    });
  }
  if (state.valueOf('med_checkup') === 'no') {
    steps.push({ priority: 'medium', text: 'Book a postpartum check-up if you have not had one.' });
  }
  if (safety.reasons.some((r) => r.code === 'relationship_safety')) {
    steps.push({
      priority: 'high',
      text: 'You indicated you do not feel safe with someone you live with. A domestic-abuse advocate can talk this through confidentially, and your maternity or primary-care team can help you reach one privately.',
    });
  }
  if ((state.scoreOf('sup_isolated') ?? 0) >= 2 || state.valueOf('ctx_support_emotional') === 'none') {
    steps.push({
      priority: 'medium',
      text: `Consider ${providerRoutes.peer}. Isolation makes everything else heavier, and peer groups are free in most places.`,
    });
  }
  if (functioning.tier === 'severe') {
    steps.push({
      priority: 'high',
      text: 'Ask for practical help with the basics — meals, nights, appointments — alongside anything clinical. Functioning this affected is not something to push through alone.',
    });
  }

  return steps;
}

function buildProviderQuestions(scored, state) {
  const { byDomain, bipolar, functioning, safety } = scored;
  const questions = [];
  const strong = (domain) => ['moderate', 'high'].includes(byDomain[domain].band);

  questions.push('Can we do a formal postpartum mental-health screening today, and record the result?');

  if (strong('depression') || strong('anxiety')) {
    questions.push('Which of what I am describing looks like a mood or anxiety condition to you, and which looks like exhaustion or adjustment?');
    questions.push('What treatment options are appropriate at this stage — therapy, medication, or both — and what would each involve?');
  }
  if (state.valueOf('ctx_feeding')?.some?.((v) => ['breast', 'pumping', 'combination', 'donor_milk'].includes(v))) {
    questions.push('If medication is an option, which ones are compatible with how I am feeding my baby?');
  }
  if (bipolar.warning) {
    questions.push('I have had periods of high energy with little need for sleep. Can we assess for the bipolar spectrum before considering an antidepressant?');
  } else if (bipolar.riskHistory.length > 0) {
    questions.push('There is bipolar disorder in my history or my family. Should that change how we approach treating my mood?');
  }
  if (strong('ocd')) {
    questions.push('I get unwanted intrusive thoughts and find myself checking or seeking reassurance. Can you refer me to someone who treats perinatal OCD?');
  }
  if (strong('trauma')) {
    questions.push('Can I see my birth notes or arrange a birth debrief, and can you refer me for trauma-focused therapy?');
  }
  if ((state.scoreOf('med_symptoms') ?? 0) > 0) {
    questions.push('Can we check for physical contributors — thyroid function, iron and full blood count, vitamin D, and a medication review?');
  }
  if (functioning.tier === 'significant' || functioning.tier === 'severe') {
    questions.push('This is affecting what I can actually do day to day. What support is available quickly, and what is the waiting time?');
  }
  if (safety.reasons.length > 0) {
    questions.push('What should I do, and who should I call, if things get worse before my next appointment?');
  }
  questions.push('What would you want me to watch for, and at what point should I come back sooner?');

  return questions;
}

function joinList(items) {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
