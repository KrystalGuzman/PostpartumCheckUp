/**
 * Part 16 — Functioning.
 *
 * Functional impact is assessed separately from symptom counts and is weighed
 * alongside them, never derived from them.
 */

import { PREFER_NOT_TO_ANSWER } from './context.js';

const DIFFICULTY = [
  { value: '0', label: 'No difficulty', score: 0 },
  { value: '1', label: 'Some difficulty', score: 1 },
  { value: '2', label: 'A lot of difficulty', score: 2 },
  { value: '3', label: 'I mostly cannot do it', score: 3 },
  { value: 'na', label: 'Not applicable to me', score: null },
  PREFER_NOT_TO_ANSWER,
];

/**
 * The activities whose loss says most about whether someone is coping. Named
 * here so the safety evaluation can read them without depending on scoring.
 */
export const CARE_ITEMS = ['fn_baby_care', 'fn_self_care'];
export const BASIC_ITEMS = ['fn_get_up', 'fn_eat', 'fn_shower', 'fn_sleep'];

const fn = (id, text, extra = {}) => ({ id, type: 'single', score: true, text, options: DIFFICULTY, ...extra });

export const functioningSection = {
  id: 'functioning',
  domain: 'functioning',
  title: 'How much it is affecting your days',
  kind: 'functioning',
  blurb:
    'Not how you feel, but what you can actually do. Answer for how things have been over the past two weeks, thinking about the effect of how you have been feeling rather than the ordinary difficulty of having a baby.',
  items: [
    fn('fn_get_up', 'Getting out of bed in the morning'),
    fn('fn_eat', 'Eating properly'),
    fn('fn_shower', 'Showering and basic self-care'),
    fn('fn_sleep', 'Sleeping when you have the chance'),
    fn('fn_appointments', 'Getting to appointments'),
    fn('fn_leave_house', 'Leaving the house'),
    fn('fn_work', 'Working or studying'),
    fn('fn_relationships', 'Staying connected to the people who matter to you'),
    fn('fn_baby_care', 'Doing the practical care your baby needs'),
    fn('fn_baby_enjoy', 'Being present with your baby — playing, responding, enjoying them'),
    fn('fn_other_children', 'Caring for your other children — and being present with them, not only managing them', {
      showIf: (state) => state.valueOf('ctx_first_baby') === 'no',
    }),
    fn('fn_self_care', 'Looking after yourself — medication, food, follow-up, rest'),
    fn('fn_responsibilities', 'Ordinary responsibilities — bills, messages, the house'),
  ],
};
