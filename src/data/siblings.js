/**
 * The load of caring for more than one child.
 *
 * A note on the evidence, because this module could easily be built on a
 * folk belief. Whether a later baby carries more risk of postpartum depression
 * than a first is genuinely unsettled: some large samples put multiparous
 * parents at lower risk than first-timers, others find no difference at all.
 * So this module does not assume a subsequent baby is harder, and no result
 * tells a parent that it is.
 *
 * What is better established is that the *shape* of the pressure differs, and
 * that specific things which come with having other children do carry risk:
 * a short gap between births, caring for a child with additional needs, less
 * practical help than the first time, and the loss of any recovery period at
 * all. Those are what this module asks about, and they are asked as symptoms
 * of load rather than as facts about family size.
 */

import { PREFER_NOT_TO_ANSWER } from './context.js';
import { FREQ, SEVERITY } from './domains.js';

const freq = (id, text, extra = {}) => ({ id, type: 'single', text, options: FREQ, ...extra });

export const siblingsModule = {
  id: 'siblings',
  domain: 'siblings',
  title: 'Doing this with more than one',
  kind: 'domain',
  showIf: (state) => state.valueOf('ctx_first_baby') === 'no',
  blurb:
    'Not because a second or third baby is harder than a first — the research on that is genuinely mixed — but because it is a different shape of hard, and most screening questionnaires were written as though every parent were doing this for the first time.',
  cardinal: ['sib_divided', 'sib_no_recovery', 'sib_guilt'],
  cardinalLabel: 'feeling torn between them, no chance to recover, or guilt about your older child',
  items: [
    freq('sib_divided', 'Have you felt torn between them — like whichever one you go to, you are failing the other?', {
      score: true,
    }),
    freq('sib_guilt', 'Have you felt guilty about what your older child has lost since the baby came?', { score: true }),
    freq('sib_no_recovery', 'Has there been no real chance to recover, because someone always needs you?', {
      score: true,
      help: 'Rest after a birth is advice written for people with one child.',
    }),
    freq('sib_touched_out', 'Have you felt touched out — like your body has not been your own for a long time?', {
      score: true,
    }),
    freq('sib_older_reaction', 'Has your older child been having a hard time — clinging, regressing, lashing out — in a way that is wearing you down?', {
      score: true,
    }),
    freq('sib_short_temper', 'Have you been sharper with your older child than you want to be, and hated it afterwards?', {
      score: true,
      help: 'Almost every parent of more than one recognises this. It is asked because it wears people down, not because it makes you a bad parent.',
    }),
    freq('sib_logistics', 'Have the logistics — drop-offs, naps that clash, appointments — felt unmanageable?', {
      score: true,
    }),
    freq('sib_should_cope', 'Have you felt you should be able to handle this because you have done it before?', {
      score: true,
    }),
    freq('sib_not_asking', 'Has that stopped you asking for help, or made you play down how hard it is?', {
      score: true,
    }),
    freq('sib_grief_older', 'Have you missed the way things were with your older child before the baby?', { score: true }),
    {
      id: 'sib_support_change',
      type: 'single',
      contextual: true,
      text: 'Compared with your first baby, how much practical help are you getting this time?',
      help: 'Meals, visitors, time off, someone taking the baby — the fuss around a first baby is often not repeated.',
      options: [
        { value: 'more', label: 'More than last time' },
        { value: 'same', label: 'About the same' },
        { value: 'less', label: 'Less than last time', flags: ['less_support_than_last_time'] },
        { value: 'much_less', label: 'Far less than last time', flags: ['less_support_than_last_time'] },
        { value: 'none_either', label: 'There was not much either time', flags: ['low_support_throughout'] },
        PREFER_NOT_TO_ANSWER,
      ],
    },
    {
      id: 'sib_older_care',
      type: 'single',
      contextual: true,
      text: 'Is there anyone who reliably takes your other children so you can rest or be with the baby?',
      options: [
        { value: 'yes', label: 'Yes, regularly' },
        { value: 'sometimes', label: 'Sometimes' },
        { value: 'no', label: 'No one', flags: ['no_older_child_cover'] },
        PREFER_NOT_TO_ANSWER,
      ],
    },
    {
      id: 'sib_alone_time',
      type: 'single',
      contextual: true,
      text: 'How often do you get any stretch of time where no child needs you?',
      options: [
        { value: 'daily', label: 'Most days' },
        { value: 'weekly', label: 'Once or twice a week' },
        { value: 'rare', label: 'Rarely' },
        { value: 'never', label: 'Never' },
        PREFER_NOT_TO_ANSWER,
      ],
    },
    { id: 'sib_hardest', type: 'single', contextual: true, text: 'What is the hardest part right now?', options: [
      { value: 'divided', label: 'Being pulled in two directions' },
      { value: 'no_rest', label: 'Never getting to stop' },
      { value: 'older_child', label: "My older child's response to it" },
      { value: 'logistics', label: 'The sheer logistics' },
      { value: 'money', label: 'The cost of another child' },
      { value: 'partner', label: 'Doing it without enough help from my partner' },
      { value: 'myself', label: 'Having nothing left for myself' },
      { value: 'other', label: 'Something else' },
      PREFER_NOT_TO_ANSWER,
    ] },
  ],
};
