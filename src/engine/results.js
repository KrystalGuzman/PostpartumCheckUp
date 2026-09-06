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
    high: 'Your responses show a pattern of intrusive thoughts and repetitive behaviors that can occur with postpartum OCD. Consider discussing this pattern with a qualified mental-health professional.',
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
  siblings: {
    high: 'Your responses describe a heavy load in caring for more than one child — being pulled between them, with no real chance to recover in between. That is a description of circumstances, not of something wrong with you, and it is also the kind of load that wears people into depression and anxiety if it does not let up.',
    moderate:
      'Your responses describe real strain in caring for more than one child. Most of what makes this hard is structural — two sets of needs and one of you — rather than anything about how you are doing it.',
    low: 'Your responses describe some of the ordinary friction of caring for more than one child.',
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

const REALITY_TESTING_NOTE =
  'You answered yes to at least one question about experiences that can involve losing touch with what is real — things others did not perceive, beliefs others contradicted, or ordinary events seeming to carry a message. A single "once or twice" is not a diagnosis of anything, and there are ordinary explanations, exhaustion among them. It is on this page because it is the one category where waiting is the wrong call: it should be assessed by a professional soon, in days rather than months, and sooner still if it becomes more frequent.';

const NOT_FIRST_BABY_NOTE =
  'Having done this before does not protect you. Whether a later baby carries more risk than a first is genuinely unsettled in the research — some large studies put experienced parents at lower risk, others find no difference — so this check-up does not assume either. What it does weigh is your own history and your own load, and those are what count. Experience is not immunity, and "I should know how to do this by now" is the single most common reason people wait too long to say something.';

const HARDER_THAN_LAST_TIME_NOTE =
  'You said this time is harder than last. Your own comparison across babies is better evidence than any average, and it is worth saying to a professional in exactly those words — it tends to land where a symptom list does not.';

const PRIOR_EPISODE_NOTE =
  'You came into this with a previous perinatal episode behind you. That is the strongest single predictor in this field: recurrence estimates run from roughly a quarter to about a half, higher when the earlier episode was severe. It is not a sentence — it is a reason to be seen early rather than to wait and see whether this settles, and a reason to say plainly what happened last time and what did or did not help.';

const PRIOR_PSYCHOSIS_NOTE =
  'You reported a previous postpartum episode involving loss of touch with reality or a psychiatric admission. This is the part of your history that most changes what should happen: recurrence after a later birth is high, onset can be fast, and it is one of the few situations in perinatal mental health where care put in place ahead of time is known to prevent an episode rather than only treat one. This warrants specialist perinatal psychiatric input now, whether or not you feel unwell today.';

const INTRUSIVE_THOUGHTS_NOTE =
  'You mentioned unwanted, frightening thoughts about harm. Thoughts like these are reported by a very large share of new parents. An intrusive thought is not an intention and not a prediction, and the distress they cause you is itself evidence of how far they sit from what you want. They are also very treatable — clinicians who work in perinatal mental health hear about them constantly.';

/** Your baby's age in the units a parent actually uses for it. */
export function describeAge(weeks) {
  if (weeks == null) return null;
  const days = Math.round(weeks * 7);
  if (days < 14) return `${days} day${days === 1 ? '' : 's'} old`;
  if (weeks < 9) return `${Math.round(weeks)} weeks old`;

  let months = Math.floor(weeks / 4.348);
  let spareWeeks = Math.round(weeks - months * 4.348);
  if (spareWeeks >= 4) {
    months += 1;
    spareWeeks = 0;
  }
  if (months >= 12) {
    const years = Math.floor(months / 12);
    const rest = months % 12;
    const yearPart = `${years} year${years === 1 ? '' : 's'}`;
    return rest ? `${yearPart} and ${rest} month${rest === 1 ? '' : 's'} old` : `${yearPart} old`;
  }
  return spareWeeks >= 1
    ? `${months} months and ${spareWeeks} week${spareWeeks === 1 ? '' : 's'} old`
    : `${months} months old`;
}

function roughStage(weeks) {
  if (weeks < 2) return 'the first couple of weeks';
  if (weeks < 9) return `${Math.round(weeks)} weeks`;
  const months = Math.round(weeks / 4.348);
  return months >= 12 ? 'a year or more' : `${months} months`;
}

export function stageSentence(weeks, exact = false) {
  if (weeks == null) return 'You did not say how far postpartum you are.';
  if (exact) {
    const stage = roughStage(weeks);
    return stage === 'the first couple of weeks'
      ? `Your baby is ${describeAge(weeks)}, so you are in the first couple of weeks postpartum.`
      : `Your baby is ${describeAge(weeks)}, which puts you about ${stage} postpartum.`;
  }
  if (weeks < 2) return 'You are in the first couple of weeks postpartum.';
  if (weeks < 9) return `You are approximately ${Math.round(weeks)} weeks postpartum.`;
  const months = Math.round(weeks / 4.348);
  if (months >= 12) return 'You are around a year or more postpartum.';
  return `You are approximately ${months} months postpartum.`;
}

export function buildResults(scored, state, regionId = 'us') {
  const region = getRegion(regionId);
  const { safety, severity, functioning, rankedSymptoms, rankedContext, bipolar, babyBlues, drivers, risk } = scored;

  const emergency = safety.stopScoring;

  const describe = (d) => ({
    domain: d.domain,
    label: d.label,
    band: d.band,
    kind: d.kind,
    statement: DOMAIN_LANGUAGE[d.domain]?.[d.band] ?? DOMAIN_LANGUAGE[d.domain]?.low ?? '',
    // A band held down by the cardinal-symptom rule can still sit on top of a
    // real symptom load. Saying so is the difference between a rule that
    // protects against over-reading and one that buries what someone reported.
    reviewNote: d.cappedButLoaded
      ? `You endorsed a good number of symptoms here, but ${d.cardinalLabel ?? 'the symptoms this pattern is defined by'} did not come through in your answers, so this check-up holds the pattern at a low reading. That is a limit of the questionnaire, not a verdict on what you described — it is worth putting in front of a professional rather than setting aside.`
      : null,
    modifiers: d.modifiers,
  });

  const visible = (list) => list.filter((d) => !(d.domain === 'baby_blues' && babyBlues.consistent)).map(describe);
  const patterns = emergency ? [] : visible(rankedSymptoms);
  const contextPatterns = emergency ? [] : visible(rankedContext);

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
    if (safety.reasons.some((r) => r.code === 'psychosis_possible')) notes.push(REALITY_TESTING_NOTE);
    if (risk.priorPostpartumPsychosis) notes.push(PRIOR_PSYCHOSIS_NOTE);
    if (risk.priorPerinatalMood) notes.push(PRIOR_EPISODE_NOTE);
    if (risk.firstBaby === false) notes.push(NOT_FIRST_BABY_NOTE);
    if (risk.harderThanLastTime) notes.push(HARDER_THAN_LAST_TIME_NOTE);
    if (bipolar.warning) notes.push(medicationCautionNote());
  }

  return {
    emergency,
    scoringHalted: emergency
      ? 'Ordinary scoring has been stopped, so no symptom pattern is reported below. That is not a statement that nothing else is going on — it is that the responses above need a person to assess them, and a score would only get in the way.'
      : null,
    statement: emergency ? EMERGENCY_STATEMENT : null,
    psychosisNote: emergency && safety.reasons.some((r) => r.code.startsWith('psychosis')) ? PSYCHOSIS_STATEMENT : null,
    stage: stageSentence(scored.weeksPostpartum, scored.exactAge),
    severity,
    severityDrivers: drivers,
    riskFactors: risk.factors,
    functionalImpact: {
      tier: functioning.tier,
      label: FUNCTIONING_LABEL[functioning.tier],
      hardest: functioning.hardest.slice(0, 4),
    },
    patterns,
    contextPatterns,
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
  const { safety, severity, byDomain, bipolar, functioning, risk } = scored;
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
  if (risk.priorPostpartumPsychosis) {
    steps.push({
      priority: 'high',
      text: `Ask to be referred to ${providerRoutes.psychiatry} on the basis of your history, separately from how you feel today. A previous postpartum psychotic episode is one of the few things in this field where a plan made in advance — including what happens in the first days after any future birth — measurably changes the outcome.`,
    });
    steps.push({
      priority: 'high',
      text: 'Agree a plan with someone close to you for what to do if you start to seem unwell, including who they call. Onset can be fast, and it is often other people who notice first.',
    });
  } else if (risk.priorPerinatalMood) {
    steps.push({
      priority: 'high',
      text: 'Tell whoever you see that you had a perinatal episode after a previous birth, and say what helped and what did not. It should move you up the list rather than down it.',
    });
  }
  if (risk.barriers.length) {
    steps.push({
      priority: 'medium',
      text: 'Last time, getting help either did not happen or did not work. Say that out loud at the next appointment, along with what got in the way — a referral that never came, a wait, a treatment that did nothing. It is the fastest way to avoid repeating it.',
    });
  }
  if (risk.firstBaby === false) {
    steps.push({
      priority: 'medium',
      text: 'Ask for help with your older children, not only with the baby — someone to do a school run, take them for an afternoon, or hold the baby while you are with them. Practical cover for the other children is the help most often not offered and most often needed.',
    });
  }
  if (risk.demandingOlderChild) {
    steps.push({
      priority: 'medium',
      text: "Mention your older child's needs when you describe your situation. Caregiving load of that kind is a real contributor to how you are doing, and postpartum appointments rarely ask about it.",
    });
  }
  if (risk.multiples) {
    steps.push({
      priority: 'medium',
      text: 'Look for a multiples-specific support group. Parents of twins carry a somewhat higher risk in the first six months, and groups for multiples tend to be far more useful than general baby groups.',
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
      text: `Get the physical symptoms you mentioned looked at — bloods for anemia and thyroid function are routine and can matter here. Speak to ${providerRoutes.primary}.`,
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
  const { byDomain, bipolar, functioning, safety, risk } = scored;
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
  if (risk.priorPostpartumPsychosis) {
    questions.push('I had a postpartum psychotic episode after a previous birth. What monitoring or preventive treatment should be in place for me, and who should be managing that?');
  }
  if (risk.priorPerinatalMood) {
    questions.push('I had a perinatal episode after a previous birth. Given the recurrence rate, should I be seen sooner or more often rather than waiting to see how this goes?');
  }
  if (risk.firstBaby === false) {
    questions.push('Most of the advice I get assumes I have one child. What is realistic for recovery and rest when there is an older child at home?');
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
