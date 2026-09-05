/**
 * Parts 3-13 and 15 — symptom pattern modules.
 *
 * Every module is a *pattern* screen, never a diagnostic instrument. Items are
 * original wording written for this tool; validated instruments (EPDS, PHQ-9,
 * GAD-7, MDQ, PCL-5, and the perinatal OCD literature) were used as conceptual
 * references for which constructs to cover, not as text to copy.
 *
 * Item fields:
 *   score       - contributes to the module's pattern strength
 *   contextual  - collected but not summed; used as a modifier or for narrative
 *   cardinal    - listed on the module; a module needs at least one endorsed
 *                 cardinal item before its pattern is reported as notable
 */

import { PREFER_NOT_TO_ANSWER } from './context.js';

/** Frequency over the past two weeks. */
export const FREQ = [
  { value: '0', label: 'Not at all', score: 0 },
  { value: '1', label: 'A few days', score: 1 },
  { value: '2', label: 'More days than not', score: 2 },
  { value: '3', label: 'Almost every day', score: 3 },
  PREFER_NOT_TO_ANSWER,
];

/** Intensity rather than frequency. */
export const SEVERITY = [
  { value: '0', label: 'Not at all', score: 0 },
  { value: '1', label: 'A little', score: 1 },
  { value: '2', label: 'Quite a bit', score: 2 },
  { value: '3', label: 'A great deal', score: 3 },
  PREFER_NOT_TO_ANSWER,
];

const freq = (id, text, extra = {}) => ({ id, type: 'single', text, options: FREQ, ...extra });
const sev = (id, text, extra = {}) => ({ id, type: 'single', text, options: SEVERITY, ...extra });

const DURATION_OPTIONS = [
  { value: 'lt2w', label: 'Less than 2 weeks', weeks: 1 },
  { value: 'w2_4', label: '2 to 4 weeks', weeks: 3 },
  { value: 'm1_3', label: '1 to 3 months', weeks: 8 },
  { value: 'gt3m', label: 'More than 3 months', weeks: 20 },
  PREFER_NOT_TO_ANSWER,
];

const TRAJECTORY_OPTIONS = [
  { value: 'better', label: 'Slowly getting better' },
  { value: 'same', label: 'About the same' },
  { value: 'worse', label: 'Getting worse' },
  { value: 'fluctuating', label: 'Up and down with no clear direction' },
  PREFER_NOT_TO_ANSWER,
];

// ---------------------------------------------------------------------------
// Part 4 — Baby blues (only offered in the early weeks)
// ---------------------------------------------------------------------------

export const babyBluesModule = {
  id: 'baby_blues',
  domain: 'baby_blues',
  title: 'The early weeks',
  kind: 'domain',
  showIf: (state) => (state.weeksPostpartum ?? 99) <= 8,
  blurb:
    'A short-lived wave of tearfulness and mood swings in the first days or weeks is common. What matters most here is timing and direction of travel.',
  cardinal: ['bb_tearful', 'bb_swings'],
  cardinalLabel: 'tearfulness or mood swings',
  items: [
    freq('bb_tearful', 'Have you been crying easily, sometimes without a clear reason?', { score: true }),
    freq('bb_swings', 'Have your moods swung quickly — fine one hour, undone the next?', { score: true }),
    freq('bb_irritable', 'Have you felt irritable or short-tempered?', { score: true }),
    freq('bb_sensitive', 'Have you felt raw or easily hurt by things people say?', { score: true }),
    freq('bb_overwhelmed', 'Have you felt overwhelmed by everything there is to do?', { score: true }),
    freq('bb_concentration', 'Has it been hard to hold a thought or finish a task?', { score: true }),
    {
      id: 'bb_onset',
      type: 'single',
      contextual: true,
      text: 'When did this start?',
      options: [
        { value: 'first_days', label: 'In the first few days after birth' },
        { value: 'first_two_weeks', label: 'Within the first two weeks' },
        { value: 'later', label: 'Later than that' },
        { value: 'always', label: 'It was already there during pregnancy' },
        PREFER_NOT_TO_ANSWER,
      ],
    },
    {
      id: 'bb_trajectory',
      type: 'single',
      contextual: true,
      text: 'Which direction is it heading?',
      options: TRAJECTORY_OPTIONS,
    },
    {
      id: 'bb_impairment',
      type: 'single',
      contextual: true,
      text: 'Between the harder moments, do you still have stretches where you feel like yourself?',
      options: [
        { value: 'yes_often', label: 'Yes, most days have good stretches' },
        { value: 'yes_some', label: 'Some, but they are getting rarer' },
        { value: 'no', label: 'Not really — it does not lift' },
        PREFER_NOT_TO_ANSWER,
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Part 5 — Depression
// ---------------------------------------------------------------------------

export const depressionModule = {
  id: 'depression',
  domain: 'depression',
  title: 'Mood and interest',
  kind: 'domain',
  blurb:
    'Depression after birth does not always look like crying. For some people it looks like flatness, emptiness, or getting everything done while feeling nothing at all.',
  cardinal: ['dep_mood', 'dep_anhedonia', 'dep_numb'],
  cardinalLabel: 'persistent low mood, loss of interest, or emotional numbness',
  items: [
    freq('dep_mood', 'Have you felt persistently low, hopeless, or heavy?', { score: true }),
    freq('dep_anhedonia', 'Have things you normally enjoy stopped giving you much of anything?', { score: true }),
    freq('dep_numb', 'Have you felt emotionally blank or empty — going through the motions without feeling much?', {
      score: true,
    }),
    freq('dep_guilt', 'Have you felt like a failure, or been harsh with yourself about the kind of parent you are?', {
      score: true,
    }),
    freq('dep_worthless', 'Have you felt worthless, or that your family would manage fine without you?', {
      score: true,
    }),
    freq('dep_energy', 'Have you felt drained in a way that rest does not touch?', { score: true }),
    freq('dep_sleep', 'Have you struggled to sleep even when you had the chance, or slept far more than usual?', {
      score: true,
      help: 'Answer about your own sleep difficulty, separately from the baby waking you.',
    }),
    freq('dep_appetite', 'Has your appetite changed noticeably — forgetting to eat, or eating far more?', {
      score: true,
    }),
    freq('dep_concentration', 'Has it been hard to concentrate, decide things, or follow a conversation?', {
      score: true,
    }),
    freq('dep_psychomotor', 'Have you been moving or speaking noticeably slower, or been unable to sit still?', {
      score: true,
    }),
    freq('dep_withdrawal', 'Have you pulled away from people, or let messages go unanswered?', { score: true }),
    freq('dep_bond', 'Have you felt disconnected from your baby, or like you are caring for them from behind glass?', {
      score: true,
      help: 'This is a symptom question, not a verdict on your love for your baby.',
    }),
    freq('dep_self', 'Have you felt disconnected from yourself — like the person you were is gone?', { score: true }),
    {
      id: 'dep_duration',
      type: 'single',
      contextual: true,
      text: 'How long have these feelings been around?',
      options: DURATION_OPTIONS,
    },
    {
      id: 'dep_trajectory',
      type: 'single',
      contextual: true,
      text: 'Which direction are they heading?',
      options: TRAJECTORY_OPTIONS,
    },
    sev('dep_distress', 'How much distress do these feelings cause you?', { contextual: true }),
  ],
};

// ---------------------------------------------------------------------------
// Part 6 — Anxiety
// ---------------------------------------------------------------------------

export const anxietyModule = {
  id: 'anxiety',
  domain: 'anxiety',
  title: 'Worry and tension',
  kind: 'domain',
  blurb:
    'Some vigilance about a baby is protective and expected. This section is about worry that has become constant, hard to steer, or physically exhausting.',
  cardinal: ['anx_worry', 'anx_uncontrollable'],
  cardinalLabel: 'frequent worry that is hard to steer',
  items: [
    freq('anx_worry', 'Have you spent much of the day worrying?', { score: true }),
    freq('anx_uncontrollable', 'Once the worry starts, is it hard to stop or steer?', { score: true }),
    freq('anx_catastrophic', 'Does your mind jump to the worst possible outcome?', { score: true }),
    freq('anx_dread', 'Have you had a sense of dread that something bad is about to happen?', { score: true }),
    freq('anx_onedge', 'Have you felt on alert even when your baby is safe and asleep?', { score: true }),
    freq('anx_relax', 'Has it been hard to rest or relax when you finally get the chance?', { score: true }),
    freq('anx_racing', 'Have your thoughts felt fast or crowded?', { score: true }),
    freq('anx_irritable', 'Have you felt keyed up or snappy?', { score: true }),
    freq('anx_physical', 'Have you had physical symptoms — tight chest, racing heart, nausea, clenched jaw, shaking?', {
      score: true,
    }),
    freq('anx_sleep', 'Have you lain awake because of worry even when you were exhausted?', { score: true }),
    freq('anx_avoid', 'Have you avoided going out, or being alone with the baby, because of anxiety?', { score: true }),
    freq('anx_panic', 'Have you had sudden surges of fear that peaked within minutes, with strong physical symptoms?', {
      score: true,
    }),
    {
      id: 'anx_control',
      type: 'single',
      contextual: true,
      text: 'When you try to put the worry down, what happens?',
      options: [
        { value: 'can', label: 'I can usually redirect it' },
        { value: 'partly', label: 'Sometimes, with effort' },
        { value: 'rarely', label: 'Rarely — it comes straight back' },
        { value: 'never', label: 'It runs on regardless of what I do' },
        PREFER_NOT_TO_ANSWER,
      ],
    },
    {
      id: 'anx_duration',
      type: 'single',
      contextual: true,
      text: 'How long has the worry been at this level?',
      options: DURATION_OPTIONS,
    },
  ],
};

// ---------------------------------------------------------------------------
// Part 7 — Perinatal OCD
// ---------------------------------------------------------------------------

export const ocdModule = {
  id: 'ocd',
  domain: 'ocd',
  title: 'Intrusive thoughts and repeated behaviors',
  kind: 'domain',
  blurb:
    'Unwanted, frightening thoughts about harm coming to a baby are reported by a large share of new parents. Having such a thought is not the same as wanting it, and it says nothing about your intentions. These questions are about how often they come and what you find yourself doing about them.',
  cardinal: ['ocd_intrusive'],
  cardinalLabel: 'unwanted intrusive thoughts',
  items: [
    freq('ocd_intrusive', 'Have unwanted thoughts, images, or urges about something bad happening to your baby pushed into your mind?', {
      score: true,
    }),
    {
      id: 'ocd_themes',
      type: 'multi',
      contextual: true,
      text: 'What do they tend to be about?',
      help: 'You do not need to describe them. Just choose the themes that fit.',
      showIf: (state) => (state.scoreOf('ocd_intrusive') ?? 0) > 0,
      options: [
        { value: 'accident', label: 'Accidental harm — dropping, falling, stairs, the car' },
        { value: 'contamination', label: 'Germs, contamination, or cleanliness' },
        { value: 'illness', label: 'Illness or something being medically wrong' },
        { value: 'mistake', label: 'Making a mistake — a wrong dose, a missed sign' },
        { value: 'self_caused', label: 'Somehow causing harm myself' },
        { value: 'sleep_safety', label: 'Breathing, sleep safety, or the baby dying in their sleep' },
        { value: 'other', label: 'Something else' },
        PREFER_NOT_TO_ANSWER,
      ],
    },
    {
      id: 'ocd_relationship',
      type: 'single',
      contextual: true,
      key: 'insight',
      text: 'When one of those thoughts arrives, which is closest to your experience of it?',
      showIf: (state) => (state.scoreOf('ocd_intrusive') ?? 0) > 0,
      options: [
        {
          value: 'ego_dystonic',
          label: 'It horrifies me. I do not want it, and I work hard to make sure nothing like it ever happens.',
          flags: ['insight_intact'],
        },
        {
          value: 'recognized',
          label: 'It upsets me, but I can mostly see it as just a thought passing through.',
          flags: ['insight_intact'],
        },
        {
          value: 'uncertain',
          label: 'I am not always sure whether it is a thought or something that is really happening.',
          flags: ['insight_uncertain'],
        },
        {
          value: 'believed',
          label: 'I believe what it tells me is true, even when people say it is not.',
          flags: ['insight_absent'],
        },
        PREFER_NOT_TO_ANSWER,
      ],
    },
    sev('ocd_distress', 'How distressing are these thoughts when they come?', { score: true }),
    freq('ocd_checking', 'Have you checked things repeatedly — breathing, straps, locks, temperature — beyond what felt necessary?', {
      score: true,
    }),
    freq('ocd_reassurance', 'Have you needed others to reassure you, or searched online again and again for the same answer?', {
      score: true,
    }),
    freq('ocd_mental', 'Have you replayed events in your head, counted, prayed, or mentally reviewed to make sure nothing went wrong?', {
      score: true,
    }),
    freq('ocd_cleaning', 'Have you washed, sterilized, or cleaned far beyond what is needed?', { score: true }),
    freq('ocd_avoid', 'Have you avoided situations — bathing, stairs, knives, being alone with the baby — because of these thoughts?', {
      score: true,
    }),
    {
      id: 'ocd_time',
      type: 'single',
      contextual: true,
      text: 'Roughly how much of your day goes to these thoughts and the things you do to settle them?',
      options: [
        { value: 'none', label: 'Almost none', score: 0 },
        { value: 'lt1h', label: 'Under an hour', score: 1 },
        { value: 'h1_3', label: '1 to 3 hours', score: 2 },
        { value: 'gt3h', label: 'More than 3 hours', score: 3 },
        PREFER_NOT_TO_ANSWER,
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Part 8 — Birth trauma and post-traumatic stress
// ---------------------------------------------------------------------------

export const traumaModule = {
  id: 'trauma',
  domain: 'trauma',
  title: 'The birth and what came after',
  kind: 'domain',
  blurb:
    'Birth can be frightening even when it ends well, and even when everyone around you calls it routine. Your experience of it is the thing that counts here.',
  cardinal: ['ptsd_intrusion', 'ptsd_nightmares', 'ptsd_avoid'],
  cardinalLabel: 'intrusive memories, nightmares, or avoidance of reminders',
  items: [
    {
      id: 'ptsd_event',
      type: 'multi',
      contextual: true,
      gate: true,
      text: 'Did any of these happen around your birth or the days after?',
      options: [
        { value: 'frightening', label: 'It was frightening — I thought I or my baby might not be okay' },
        { value: 'emergency', label: 'An emergency procedure or an unplanned rush to the operating room' },
        { value: 'complication_self', label: 'A severe medical complication for me' },
        { value: 'complication_baby', label: 'A frightening medical event involving my baby' },
        { value: 'nicu', label: 'A NICU or special care stay' },
        { value: 'powerless', label: 'I felt powerless, trapped, or unable to say no' },
        { value: 'dismissed', label: 'I was dismissed, spoken over, or treated badly by staff' },
        { value: 'unsafe', label: 'I felt unsafe' },
        { value: 'prior_trauma', label: 'It brought back an earlier trauma' },
        { value: 'none', label: 'None of these', exclusive: true },
        PREFER_NOT_TO_ANSWER,
      ],
    },
    freq('ptsd_intrusion', 'Have memories of it pushed their way in when you did not want them?', {
      score: true,
      showIf: (state) => state.gatePassed('ptsd_event'),
    }),
    freq('ptsd_nightmares', 'Have you had nightmares or woken with the feeling of it happening again?', {
      score: true,
      showIf: (state) => state.gatePassed('ptsd_event'),
    }),
    freq('ptsd_avoid', 'Have you steered away from reminders — the hospital, appointments, photos, talking about it?', {
      score: true,
      showIf: (state) => state.gatePassed('ptsd_event'),
    }),
    freq('ptsd_distress', 'Do reminders leave you badly shaken?', {
      score: true,
      showIf: (state) => state.gatePassed('ptsd_event'),
    }),
    freq('ptsd_physical', 'Do reminders set off physical reactions — heart pounding, sweating, feeling sick?', {
      score: true,
      showIf: (state) => state.gatePassed('ptsd_event'),
    }),
    freq('ptsd_hypervigilance', 'Have you felt jumpy, on guard, or startled easily?', {
      score: true,
      showIf: (state) => state.gatePassed('ptsd_event'),
    }),
    freq('ptsd_detachment', 'Have you felt detached, numb, or as if things around you are not quite real?', {
      score: true,
      showIf: (state) => state.gatePassed('ptsd_event'),
    }),
    freq('ptsd_blame', 'Have you blamed yourself, or been unable to trust medical people since?', {
      score: true,
      showIf: (state) => state.gatePassed('ptsd_event'),
    }),
    freq('ptsd_fear', 'Have you felt persistent fear about future pregnancy, birth, or medical care?', {
      score: true,
      showIf: (state) => state.gatePassed('ptsd_event'),
    }),
    {
      id: 'ptsd_duration',
      type: 'single',
      contextual: true,
      showIf: (state) => state.gatePassed('ptsd_event'),
      text: 'How long have these reactions been going on?',
      options: [
        { value: 'lt1m', label: 'Less than a month since the event', weeks: 2 },
        { value: 'gt1m', label: 'More than a month', weeks: 8 },
        { value: 'gt6m', label: 'More than six months', weeks: 28 },
        PREFER_NOT_TO_ANSWER,
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Part 9 — Bipolar spectrum / mania warning screen
// ---------------------------------------------------------------------------

export const bipolarModule = {
  id: 'bipolar',
  domain: 'bipolar',
  title: 'Energy, sleep, and periods of feeling different',
  kind: 'domain',
  blurb:
    'This section is looking for something specific and easy to miss: stretches where your energy ran high rather than low. It matters because it changes what kind of help is safest, so it is worth answering carefully even if none of it fits.',
  cardinal: ['bip_sleep_no_need', 'bip_elevated', 'bip_irritable'],
  cardinalLabel: 'reduced need for sleep, or a period of elevated or unusually irritable mood',
  items: [
    {
      id: 'bip_sleep_no_need',
      type: 'single',
      score: true,
      key: 'decreased_need_for_sleep',
      text: 'Have you had days where you slept very little and yet did not feel tired?',
      help:
        'This is different from exhaustion caused by a baby who wakes constantly. The question is whether you felt genuinely rested and energised on very little sleep.',
      options: [
        { value: '0', label: 'No — when I lose sleep, I feel it', score: 0 },
        { value: '1', label: 'Once or twice, briefly', score: 1 },
        { value: '2', label: 'Several days where I ran on almost nothing and felt fine', score: 2 },
        { value: '3', label: 'Days on end with very little sleep and more energy than usual', score: 3 },
        PREFER_NOT_TO_ANSWER,
      ],
    },
    freq('bip_elevated', 'Have you had periods of feeling unusually high, elated, or unstoppable — not like your usual self?', {
      score: true,
    }),
    freq('bip_irritable', 'Have you had periods of unusual irritability — flaring at people in a way that is not like you?', {
      score: true,
    }),
    freq('bip_energy', 'Have you had stretches of far more energy than usual, lasting days?', { score: true }),
    freq('bip_racing', 'Have your thoughts raced so fast that you could not keep up with them?', { score: true }),
    freq('bip_talkative', 'Have you talked much more or faster than usual, or found people struggling to interrupt you?', {
      score: true,
    }),
    freq('bip_confidence', 'Have you felt unusually confident, powerful, or certain you could do anything?', {
      score: true,
    }),
    freq('bip_activity', 'Have you taken on far more than usual — projects, plans, reorganizing things through the night?', {
      score: true,
    }),
    freq('bip_impulsive', 'Have you acted on impulses that were out of character — spending, decisions, risks?', {
      score: true,
    }),
    {
      id: 'bip_same_period',
      type: 'single',
      contextual: true,
      showIf: (state) => state.moduleRawScore('bipolar') > 0,
      text: 'Did several of those happen during the same stretch of time?',
      options: [
        { value: 'yes', label: 'Yes, they went together' },
        { value: 'no', label: 'No, they were separate' },
        { value: 'unsure', label: 'I am not sure' },
        PREFER_NOT_TO_ANSWER,
      ],
    },
    {
      id: 'bip_duration',
      type: 'single',
      contextual: true,
      showIf: (state) => state.moduleRawScore('bipolar') > 0,
      text: 'How long did the longest such stretch last?',
      options: [
        { value: 'hours', label: 'A few hours' },
        { value: 'd1_3', label: '1 to 3 days' },
        { value: 'd4_6', label: '4 to 6 days' },
        { value: 'w1plus', label: 'A week or more' },
        PREFER_NOT_TO_ANSWER,
      ],
    },
    {
      id: 'bip_impact',
      type: 'single',
      contextual: true,
      showIf: (state) => state.moduleRawScore('bipolar') > 0,
      text: 'Did it cause problems, or did people around you comment on it?',
      options: [
        { value: 'none', label: 'No' },
        { value: 'noticed', label: 'People noticed, but nothing went wrong' },
        { value: 'problems', label: 'It caused real problems — money, work, relationships, or safety' },
        PREFER_NOT_TO_ANSWER,
      ],
    },
    {
      id: 'bip_history',
      type: 'multi',
      contextual: true,
      text: 'Has any of this ever come up before?',
      options: [
        { value: 'prior_dx', label: 'A professional has raised bipolar disorder with me before' },
        { value: 'family', label: 'A close relative has bipolar disorder' },
        { value: 'antidepressant_reaction', label: 'An antidepressant once made me feel wired, sped up, or worse' },
        { value: 'prior_episode', label: 'I have had a period like this before, unrelated to this birth' },
        { value: 'none', label: 'None of these', exclusive: true },
        PREFER_NOT_TO_ANSWER,
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Part 11 — Adjustment and life-stress response
// ---------------------------------------------------------------------------

export const adjustmentModule = {
  id: 'adjustment',
  domain: 'adjustment',
  title: 'Stress and circumstances',
  kind: 'domain',
  blurb: 'Some postpartum distress tracks closely with what is actually happening around you.',
  cardinal: ['adj_link'],
  cardinalLabel: 'distress that tracks with identifiable pressures',
  items: [
    {
      id: 'adj_link',
      type: 'single',
      score: true,
      text: 'Do your hardest feelings line up with particular pressures — money, work, childcare, family, feeding, housing?',
      options: [
        { value: '0', label: 'No, the feelings are there regardless', score: 0 },
        { value: '1', label: 'Loosely', score: 1 },
        { value: '2', label: 'Mostly, yes', score: 2 },
        { value: '3', label: 'Almost entirely — take the pressure away and I think I would be okay', score: 3 },
        PREFER_NOT_TO_ANSWER,
      ],
    },
    sev('adj_distress', 'How much distress are those pressures causing you?', { score: true }),
    sev('adj_overwhelm', 'How much do they exceed what you feel able to absorb right now?', { score: true }),
    freq('adj_preoccupied', 'Have you been preoccupied with them — turning them over, unable to set them down?', {
      score: true,
    }),
    {
      id: 'adj_onset',
      type: 'single',
      contextual: true,
      text: 'Did the distress start within roughly three months of a specific change or event?',
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' },
        { value: 'unsure', label: 'I am not sure' },
        PREFER_NOT_TO_ANSWER,
      ],
    },
    {
      id: 'adj_relief',
      type: 'single',
      contextual: true,
      text: 'On days when the pressure eases, does the feeling ease too?',
      options: [
        { value: 'yes', label: 'Yes, noticeably' },
        { value: 'some', label: 'A little' },
        { value: 'no', label: 'No — it stays whatever is happening' },
        PREFER_NOT_TO_ANSWER,
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Part 12 — Grief and loss
// ---------------------------------------------------------------------------

export const griefModule = {
  id: 'grief',
  domain: 'grief',
  title: 'Loss',
  kind: 'domain',
  blurb:
    'Grief is not depression, though the two can sit side by side. Some postpartum losses are obvious to everyone; others go unnamed.',
  cardinal: ['grief_waves', 'grief_yearning', 'grief_stuck'],
  cardinalLabel: 'waves of sadness, longing for what was lost, or feeling stuck in it',
  items: [
    {
      id: 'grief_event',
      type: 'multi',
      contextual: true,
      gate: true,
      text: 'Are you carrying any of these?',
      options: [
        { value: 'miscarriage', label: 'A miscarriage' },
        { value: 'stillbirth', label: 'A stillbirth' },
        { value: 'neonatal', label: 'The death of a baby' },
        { value: 'multiple_loss', label: 'The loss of one baby from a multiple pregnancy' },
        { value: 'fertility', label: 'Fertility struggles' },
        { value: 'termination', label: 'A termination, including for medical reasons' },
        { value: 'birth_experience', label: 'The loss of the birth I expected' },
        { value: 'body_health', label: 'The loss of physical ability or health' },
        { value: 'feeding', label: 'The loss of the feeding relationship I wanted' },
        { value: 'independence', label: 'The loss of my independence or freedom' },
        { value: 'career', label: 'The loss of my career or working life as it was' },
        { value: 'identity', label: 'The loss of who I was before' },
        { value: 'bereavement', label: 'The death of someone close to me' },
        { value: 'relationship', label: 'The end or unravelling of a relationship' },
        { value: 'none', label: 'None of these', exclusive: true },
        PREFER_NOT_TO_ANSWER,
      ],
    },
    freq('grief_waves', 'Does the sadness come in waves, often set off by a reminder?', {
      score: true,
      showIf: (state) => state.gatePassed('grief_event'),
    }),
    freq('grief_yearning', 'Do you find yourself longing for what was lost, or for how things were meant to be?', {
      score: true,
      showIf: (state) => state.gatePassed('grief_event'),
    }),
    freq('grief_avoid', 'Do you avoid reminders — places, people, dates, other people’s news?', {
      score: true,
      showIf: (state) => state.gatePassed('grief_event'),
    }),
    freq('grief_stuck', 'Do you feel stuck in it, or unable to find a way forward?', {
      score: true,
      showIf: (state) => state.gatePassed('grief_event'),
    }),
    {
      id: 'grief_acknowledged',
      type: 'single',
      contextual: true,
      showIf: (state) => state.gatePassed('grief_event'),
      text: 'Has anyone around you acknowledged this loss?',
      options: [
        { value: 'yes', label: 'Yes, and it helps' },
        { value: 'some', label: 'A little' },
        { value: 'no', label: 'No — I carry it privately' },
        { value: 'dismissed', label: 'It has been brushed aside or minimized' },
        PREFER_NOT_TO_ANSWER,
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Part 13 — Physical and medical contributors
// ---------------------------------------------------------------------------

export const medicalModule = {
  id: 'medical',
  domain: 'medical',
  title: 'Physical health',
  kind: 'domain',
  blurb:
    'Postpartum mood and energy can have physical drivers. None of this can be sorted out by a questionnaire, but it is worth flagging for whoever you see next.',
  cardinal: [],
  items: [
    {
      id: 'med_symptoms',
      type: 'multi',
      score: true,
      text: 'Have you had any of these since the birth?',
      options: [
        { value: 'bleeding', label: 'Heavy or prolonged bleeding' },
        { value: 'anemia', label: 'Dizziness, breathlessness, or looking very pale' },
        { value: 'thyroid', label: 'Heart racing, temperature intolerance, or unusual hair loss' },
        { value: 'pain', label: 'Ongoing pain — incision, perineum, back, headaches, nipples' },
        { value: 'infection', label: 'Fever or an infection' },
        { value: 'bp', label: 'High blood pressure, severe headaches, or vision changes' },
        { value: 'chronic', label: 'A chronic condition that has flared' },
        { value: 'medication', label: 'Started, stopped, or changed a medication' },
        { value: 'nutrition', label: 'Skipping meals or not drinking enough, most days' },
        { value: 'substances', label: 'Using alcohol or something else to get through' },
        { value: 'none', label: 'None of these', exclusive: true },
        PREFER_NOT_TO_ANSWER,
      ],
    },
    {
      id: 'med_discussed',
      type: 'single',
      contextual: true,
      text: 'Have you told a healthcare professional how you have actually been feeling?',
      options: [
        { value: 'yes_full', label: 'Yes, in full' },
        { value: 'partial', label: 'I mentioned some of it' },
        { value: 'downplayed', label: 'I was asked and played it down' },
        { value: 'no', label: 'No' },
        PREFER_NOT_TO_ANSWER,
      ],
    },
    {
      id: 'med_checkup',
      type: 'single',
      contextual: true,
      text: 'Have you had a postpartum check-up?',
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'scheduled', label: 'It is booked' },
        { value: 'no', label: 'No' },
        { value: 'na', label: 'Not applicable to me' },
        PREFER_NOT_TO_ANSWER,
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Part 15 — Relationship and support (contextual, never scored as symptoms)
// ---------------------------------------------------------------------------

export const supportModule = {
  id: 'support',
  domain: 'support',
  title: 'People around you',
  kind: 'context',
  blurb:
    'These are circumstances, not symptoms. They are here because support is one of the few things that reliably changes how postpartum months go.',
  cardinal: [],
  items: [
    {
      id: 'sup_nights',
      type: 'single',
      contextual: true,
      text: 'How are nights divided?',
      options: [
        { value: 'shared', label: 'Shared fairly' },
        { value: 'mostly_me', label: 'Mostly me' },
        { value: 'all_me', label: 'All me' },
        { value: 'other', label: 'Someone else does most of them' },
        { value: 'na', label: 'Not applicable' },
        PREFER_NOT_TO_ANSWER,
      ],
    },
    sev('sup_practical', 'How much practical help do you get with the day-to-day?', { contextual: true }),
    sev('sup_emotional', 'How much emotional support do you get?', { contextual: true }),
    {
      id: 'sup_conflict',
      type: 'multi',
      contextual: true,
      text: 'Is there ongoing conflict about any of these?',
      options: [
        { value: 'feeding', label: 'Feeding' },
        { value: 'sleep', label: 'Sleep' },
        { value: 'childcare', label: 'Childcare' },
        { value: 'money', label: 'Money' },
        { value: 'chores', label: 'Division of work at home' },
        { value: 'family', label: 'Family or in-laws' },
        { value: 'intimacy', label: 'Intimacy' },
        { value: 'none', label: 'No ongoing conflict', exclusive: true },
        PREFER_NOT_TO_ANSWER,
      ],
    },
    // Scored so the strain can be described back to the person. The support
    // domain carries no severity weight, so it never turns circumstances into
    // a clinical finding. The two questions above are deliberately not scored:
    // there, a high answer means more support, not more distress.
    freq('sup_judged', 'Have you felt judged for the choices you are making?', { score: true }),
    freq('sup_dismissed', 'Have you felt dismissed when you tried to say how you were doing?', { score: true }),
    freq('sup_isolated', 'Have you gone through days with no real adult contact?', { score: true }),
    freq('sup_alone_within', 'Have you felt alone in this even with someone right there?', { score: true }),
    {
      id: 'sup_safety',
      type: 'single',
      contextual: true,
      text: 'Do you feel safe — physically and emotionally — with the people you live with?',
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'mostly', label: 'Mostly' },
        { value: 'no', label: 'No', flags: ['relationship_safety'] },
        PREFER_NOT_TO_ANSWER,
      ],
    },
  ],
};

export const domainModules = [
  babyBluesModule,
  depressionModule,
  anxietyModule,
  ocdModule,
  traumaModule,
  bipolarModule,
  adjustmentModule,
  griefModule,
  medicalModule,
  supportModule,
];
