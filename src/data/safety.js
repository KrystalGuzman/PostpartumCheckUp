/**
 * Part 2 and Part 10 — safety and psychosis screening.
 *
 * This section runs BEFORE any ordinary symptom scoring and its results can
 * halt scoring entirely (see src/engine/safety.js). Wording is deliberately
 * neutral and non-graphic: no item asks for a description of self-harm or
 * violence, and no item asks the person to argue about whether a belief is true.
 */

import { PREFER_NOT_TO_ANSWER } from './context.js';

const NEUTRAL_FREQUENCY = [
  { value: '0', label: 'Not at all', score: 0 },
  { value: '1', label: 'Once or twice', score: 1 },
  { value: '2', label: 'Several times', score: 2 },
  { value: '3', label: 'Most days', score: 3 },
  PREFER_NOT_TO_ANSWER,
];

/** Items in this cluster are evaluated together as a possible psychosis pattern. */
const psychosisItem = (id, text, flag, help) => ({
  id,
  type: 'single',
  cluster: 'psychosis',
  flagOnScore: flag,
  text,
  help,
  options: NEUTRAL_FREQUENCY,
});

export const safetySection = {
  id: 'safety',
  title: 'Safety first',
  kind: 'safety',
  blurb:
    'These questions come before anything else, and they are asked of everyone. Some of them are hard to read. Answer as plainly as you can — nothing here is a judgment about you as a parent, and you can skip any question.',
  items: [
    {
      id: 'saf_self_harm',
      type: 'single',
      text: 'In the past two weeks, have you had thoughts of not wanting to be here, or of hurting yourself?',
      options: [
        { value: 'none', label: 'No', score: 0 },
        {
          value: 'passive',
          label: 'Passing thoughts that everyone would be better off without me, or that I would rather not wake up',
          score: 1,
          flags: ['si_passive'],
        },
        {
          value: 'active_no_plan',
          label: 'Thoughts of hurting myself, though I do not intend to act on them',
          score: 2,
          flags: ['si_active'],
        },
        {
          value: 'plan_or_intent',
          label: 'I have thought about how I would do it, or I am not sure I can keep myself safe',
          score: 3,
          flags: ['si_plan'],
        },
        { ...PREFER_NOT_TO_ANSWER, flags: ['safety_declined'] },
      ],
    },
    {
      id: 'saf_harm_others',
      type: 'single',
      text: 'Have you had thoughts about your baby or someone else being harmed by you?',
      help:
        'Frightening, unwanted thoughts about harm are extremely common after birth and are not the same as wanting to cause harm. This question is trying to tell those apart, not to catch you out.',
      options: [
        { value: 'none', label: 'No', score: 0 },
        {
          value: 'intrusive',
          label: 'Unwanted, frightening thoughts or images that horrify me and that I would never act on',
          score: 1,
          flags: ['harm_intrusive'],
        },
        {
          value: 'urge',
          label: 'Thoughts that feel more like an urge or a pull, and that worry me because of that',
          score: 2,
          flags: ['harm_urge'],
        },
        {
          value: 'justified',
          label: 'Thoughts that harm might be necessary, deserved, or the right thing to do',
          score: 3,
          flags: ['harm_intent'],
        },
        { ...PREFER_NOT_TO_ANSWER, flags: ['safety_declined'] },
      ],
    },
    {
      id: 'saf_care_capacity',
      type: 'single',
      text: 'Right now, are you able to keep yourself and your baby safe and cared for?',
      options: [
        { value: 'yes', label: 'Yes', score: 0 },
        { value: 'mostly', label: 'Mostly — it is hard, but we are okay', score: 1, benign: true },
        { value: 'unsure', label: 'I am not sure', score: 2, flags: ['care_unsure'] },
        { value: 'no', label: 'No — I need help today', score: 3, flags: ['care_unable'] },
        { ...PREFER_NOT_TO_ANSWER, flags: ['safety_declined'] },
      ],
    },
    psychosisItem(
      'saf_hallucination',
      'Have you seen, heard, or sensed things that other people did not?',
      'psy_hallucination',
    ),
    psychosisItem(
      'saf_delusion',
      'Have you been certain of something that people close to you told you was clearly not true?',
      'psy_delusion',
      'You do not need to explain or defend the belief. Just whether this has happened.',
    ),
    psychosisItem(
      'saf_confusion',
      'Have you had periods of severe confusion — losing track of where you are, what is real, or blocks of time?',
      'psy_confusion',
    ),
    psychosisItem(
      'saf_control',
      'Have you felt that an outside force was controlling your thoughts or actions?',
      'psy_control',
    ),
    psychosisItem(
      'saf_reference',
      'Have ordinary things — the news, a song, something a stranger said — seemed to carry a special or threatening message meant for you?',
      'psy_reference',
    ),
    psychosisItem(
      'saf_observed_change',
      'Have people close to you said that you seem very different lately — agitated, not making sense, or not yourself?',
      'psy_observed',
    ),
    {
      id: 'saf_onset_speed',
      type: 'single',
      text: 'Have any of those experiences come on quickly?',
      showIf: (state) => state.flags.some((f) => f.startsWith('psy_')),
      options: [
        { value: 'no', label: 'They have not really happened, or they have been there a long time', score: 0 },
        { value: 'gradual', label: 'They built up gradually over months', score: 1, benign: true },
        { value: 'rapid', label: 'They came on over days or a couple of weeks', score: 2, flags: ['rapid_onset'] },
        PREFER_NOT_TO_ANSWER,
      ],
    },
  ],
};
