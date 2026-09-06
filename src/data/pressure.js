/**
 * Where the pressure sits, and whether she is adapting to it.
 *
 * Two separate things, deliberately measured apart:
 *
 *   Pressure   — how much load, and which kind. Circumstance, never a symptom.
 *   Adaptation — whether she is gaining ground, holding, or losing it.
 *
 * Measuring them apart is the point. High pressure with good adaptation is not
 * a clinical finding; it is someone carrying a lot well, and what they need is
 * less to carry. Low pressure with poor adaptation is the opposite, and it is
 * the pattern most often waved away — by the person themselves first of all —
 * with "but I have nothing to complain about". When the load does not explain
 * how someone feels, that is a pointer towards something clinical rather than
 * something more help at home would fix.
 *
 * The comparison items exist because a parent's own yardstick beats any
 * population norm. For someone who has done this before, the sharpest probe is
 * not "is it harder?" but "where has the pressure moved?" — confidence with a
 * baby usually rises with experience while everything around it gets heavier,
 * and a single "harder or easier" question cannot see that.
 */

import { PREFER_NOT_TO_ANSWER } from './context.js';

const notFirstBaby = (state) => state.valueOf('ctx_first_baby') === 'no';

/** How heavily one kind of pressure is sitting on her right now. */
const PRESSURE = [
  { value: '0', label: 'Not really a pressure', score: 0 },
  { value: '1', label: 'Some', score: 1 },
  { value: '2', label: 'A lot', score: 2 },
  { value: '3', label: 'More than I can carry', score: 3 },
  PREFER_NOT_TO_ANSWER,
];

const pressure = (id, text, extra = {}) => ({ id, type: 'single', score: true, text, options: PRESSURE, ...extra });

export const pressureModule = {
  id: 'pressure',
  domain: 'pressure',
  title: 'Where the pressure sits',
  kind: 'domain',
  blurb:
    'Not how you are coping — just where the weight is. Everyone has some of these. Naming which ones are heavy is what makes it possible to take something off the pile.',
  cardinal: [],
  items: [
    pressure('pr_body', 'Your body — recovery, pain, how it feels to be in it'),
    pressure('pr_sleep', 'Sleep, and the debt that has built up'),
    pressure('pr_time', 'Time — there is never enough of it'),
    pressure('pr_mental_load', 'Being the one who holds it all in your head: what is needed, when, by whom'),
    pressure('pr_money', 'Money'),
    pressure('pr_relationship', 'Your relationship'),
    pressure('pr_needed', 'Being the person everyone needs, all of the time'),
    pressure('pr_identity', 'Who you are now, and what happened to who you were'),
    pressure('pr_judged', 'Being watched or judged for how you are doing it'),
    pressure('pr_divided', 'Splitting yourself between your children', { showIf: notFirstBaby }),
    {
      id: 'pr_vs_expected',
      type: 'single',
      contextual: true,
      text: 'Compared with what you expected before the birth, how much is this asking of you?',
      options: [
        { value: 'less', label: 'Less than I expected' },
        { value: 'expected', label: 'About what I expected' },
        { value: 'more', label: 'More than I expected', flags: ['harder_than_expected'] },
        { value: 'far_more', label: 'Far more than I expected', flags: ['harder_than_expected'] },
        { value: 'no_expectation', label: 'I had no idea what to expect' },
        PREFER_NOT_TO_ANSWER,
      ],
    },
    {
      id: 'pr_shifted',
      type: 'multi',
      contextual: true,
      showIf: notFirstBaby,
      text: 'Compared with your last baby, where has the pressure moved?',
      help: 'Not whether it is harder — where it is different. Choose everything that fits.',
      options: [
        { value: 'confident_depleted', label: 'I am more confident with the baby, but more depleted overall' },
        { value: 'worry_moved', label: 'Less worry about the baby, more about everything else' },
        { value: 'logistics', label: 'The logistics are the hard part now, not the baby' },
        { value: 'physical', label: 'It is more physical this time — my body has less to give' },
        { value: 'guilt_spread', label: 'More guilt, spread across more people' },
        { value: 'less_help', label: 'Less help than last time' },
        { value: 'money', label: 'More money pressure' },
        { value: 'no_self', label: 'No time to myself at all this time' },
        { value: 'same_heavier', label: 'The same pressures, just heavier' },
        { value: 'unchanged', label: 'It feels much the same as last time', exclusive: true },
        PREFER_NOT_TO_ANSWER,
      ],
    },
    {
      id: 'pr_confidence_split',
      type: 'single',
      contextual: true,
      showIf: notFirstBaby,
      text: 'How do you feel about the baby-care part specifically, compared with everything around it?',
      help: 'Knowing what you are doing with a baby and being able to withstand the rest of it are two different things.',
      options: [
        { value: 'both_fine', label: 'Fine with both' },
        {
          value: 'confident_baby_struggling_rest',
          label: 'Confident with the baby, struggling with everything else',
          flags: ['competent_but_depleted'],
        },
        { value: 'struggling_both', label: 'Struggling with both' },
        { value: 'struggling_baby', label: 'Struggling with the baby, the rest is manageable' },
        PREFER_NOT_TO_ANSWER,
      ],
    },
  ],
};

/** Reverse-coded: a higher score means adapting less well. */
export const adaptationModule = {
  id: 'adaptation_check',
  domain: 'adaptation',
  title: 'How you are adapting',
  kind: 'domain',
  blurb:
    'Being under pressure and adapting to it is a different thing from being under pressure and losing ground. These questions are about the direction of travel, not the size of the load.',
  cardinal: ['ad_direction', 'ad_restoration', 'ad_forward'],
  cardinalLabel: 'losing ground, not being restored by rest, or being unable to picture this easing',
  items: [
    {
      id: 'ad_direction',
      type: 'single',
      score: true,
      text: 'Over the past month, which is closest?',
      options: [
        { value: '0', label: 'I am finding my feet', score: 0 },
        { value: '1', label: 'Holding steady', score: 1 },
        { value: '2', label: 'Slipping', score: 2 },
        { value: '3', label: 'Going under', score: 3 },
        PREFER_NOT_TO_ANSWER,
      ],
    },
    {
      id: 'ad_restoration',
      type: 'single',
      score: true,
      text: 'When you do get a break, or a decent stretch of sleep, does it restore you?',
      help: 'Whether rest still works is one of the more telling questions here.',
      options: [
        { value: '0', label: 'Yes — I come back feeling like myself', score: 0 },
        { value: '1', label: 'A bit, for a while', score: 1 },
        { value: '2', label: 'Barely — it wears off almost at once', score: 2 },
        { value: '3', label: 'Not at all. Rest does not touch it any more', score: 3 },
        PREFER_NOT_TO_ANSWER,
      ],
    },
    {
      id: 'ad_confidence',
      type: 'single',
      score: true,
      text: 'Do you feel more capable at this than you did a month ago?',
      options: [
        { value: '0', label: 'Yes, noticeably', score: 0 },
        { value: '1', label: 'About the same', score: 1 },
        { value: '2', label: 'Less capable than I did', score: 2 },
        { value: '3', label: 'I have stopped feeling capable at all', score: 3 },
        PREFER_NOT_TO_ANSWER,
      ],
    },
    {
      id: 'ad_forward',
      type: 'single',
      score: true,
      text: 'Can you picture this feeling manageable a few months from now?',
      options: [
        { value: '0', label: 'Yes', score: 0 },
        { value: '1', label: 'Probably', score: 1 },
        { value: '2', label: 'I find that hard to imagine', score: 2 },
        { value: '3', label: 'No', score: 3 },
        PREFER_NOT_TO_ANSWER,
      ],
    },
    {
      id: 'ad_margin',
      type: 'single',
      score: true,
      text: 'How much margin do you have before the edge — if one more thing went wrong this week?',
      options: [
        { value: '0', label: 'A reasonable amount', score: 0 },
        { value: '1', label: 'Thin, but there', score: 1 },
        { value: '2', label: 'None', score: 2 },
        { value: '3', label: 'I am already past it', score: 3 },
        PREFER_NOT_TO_ANSWER,
      ],
    },
    {
      id: 'ad_effort',
      type: 'single',
      score: true,
      text: 'Is getting through a day taking more out of you than it did a month ago?',
      options: [
        { value: '0', label: 'Less than it did', score: 0 },
        { value: '1', label: 'About the same', score: 1 },
        { value: '2', label: 'More', score: 2 },
        { value: '3', label: 'Far more', score: 3 },
        PREFER_NOT_TO_ANSWER,
      ],
    },
    {
      id: 'ad_good_moments',
      type: 'single',
      score: true,
      text: 'Do the good moments still land — do they reach you?',
      options: [
        { value: '0', label: 'Yes', score: 0 },
        { value: '1', label: 'Some of them', score: 1 },
        { value: '2', label: 'Rarely', score: 2 },
        { value: '3', label: 'No. I can see them happening but they do not reach me', score: 3 },
        PREFER_NOT_TO_ANSWER,
      ],
    },
  ],
};
