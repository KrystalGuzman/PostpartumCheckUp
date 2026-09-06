/**
 * Perinatal and psychiatric history.
 *
 * This section exists because history is the strongest single predictor in
 * perinatal mental health, and the check-up previously did not ask for any of
 * it. A prior postpartum episode carries a substantial recurrence risk, and a
 * prior postpartum psychosis carries a very high one — high enough that it
 * changes what should happen in the first days after a birth, not just what a
 * screening result says.
 *
 * Nothing here is scored as a current symptom. These are risk factors: they
 * shape the next steps and what a clinician is told, and they never on their
 * own create a symptom pattern.
 */

import { PREFER_NOT_TO_ANSWER } from './context.js';

const notFirstBaby = (state) => state.valueOf('ctx_first_baby') === 'no';

export const historySection = {
  id: 'history',
  title: 'Before this baby',
  kind: 'history',
  domain: null,
  blurb:
    'What came before matters more than almost anything else here — and it is the part most often not asked about. None of it is scored as a symptom you have now.',
  items: [
    {
      id: 'hist_previous_perinatal',
      type: 'multi',
      contextual: true,
      showIf: notFirstBaby,
      text: 'After any previous birth, did you go through any of these?',
      help: 'Whether or not anyone gave it a name at the time.',
      options: [
        { value: 'depression', label: 'Depression that lasted weeks or longer', flags: ['prior_perinatal_mood'] },
        { value: 'anxiety', label: 'Anxiety that got in the way of things', flags: ['prior_perinatal_mood'] },
        {
          value: 'intrusive',
          label: 'Frightening intrusive thoughts, or checking and rituals you could not stop',
          flags: ['prior_perinatal_mood'],
        },
        { value: 'trauma', label: 'A birth or postpartum experience that still affects me', flags: ['prior_perinatal_trauma'] },
        {
          value: 'psychosis',
          label: 'A period of losing touch with reality, or a psychiatric hospital stay',
          flags: ['prior_postpartum_psychosis'],
        },
        { value: 'none', label: 'None of these', exclusive: true },
        PREFER_NOT_TO_ANSWER,
      ],
    },
    {
      id: 'hist_previous_help',
      type: 'single',
      contextual: true,
      showIf: (state) => state.has('prior_perinatal_mood') || state.has('prior_perinatal_trauma') || state.has('prior_postpartum_psychosis'),
      text: 'Did you get help for it at the time?',
      options: [
        { value: 'helped', label: 'Yes, and it helped' },
        { value: 'partial', label: 'Yes, but it did not help much', flags: ['prior_treatment_failed'] },
        { value: 'sought_unavailable', label: 'I asked, and could not get it', flags: ['prior_treatment_unavailable'] },
        { value: 'none', label: 'No — I got through it on my own', flags: ['prior_untreated'] },
        PREFER_NOT_TO_ANSWER,
      ],
    },
    {
      id: 'hist_compare',
      type: 'single',
      contextual: true,
      showIf: notFirstBaby,
      text: 'Compared with how you were after your previous baby, how is this time?',
      options: [
        { value: 'easier', label: 'Easier' },
        { value: 'same', label: 'About the same' },
        { value: 'harder', label: 'Harder', flags: ['harder_than_last_time'] },
        { value: 'much_harder', label: 'Much harder', flags: ['harder_than_last_time', 'much_harder_than_last_time'] },
        { value: 'different', label: 'Hard in a completely different way' },
        PREFER_NOT_TO_ANSWER,
      ],
    },
    {
      id: 'hist_lifetime',
      type: 'multi',
      contextual: true,
      text: 'Outside of pregnancy and the year after a birth, have you ever experienced any of these?',
      options: [
        { value: 'depression', label: 'Depression', flags: ['lifetime_mood'] },
        { value: 'anxiety', label: 'Anxiety or panic', flags: ['lifetime_mood'] },
        { value: 'ocd', label: 'OCD', flags: ['lifetime_ocd'] },
        { value: 'ptsd', label: 'PTSD or the after-effects of trauma', flags: ['lifetime_trauma'] },
        { value: 'bipolar', label: 'Bipolar disorder', flags: ['lifetime_bipolar'] },
        { value: 'psychosis', label: 'Psychosis', flags: ['lifetime_psychosis'] },
        { value: 'eating', label: 'An eating disorder', flags: ['lifetime_eating'] },
        { value: 'other', label: 'Something else I was treated for' },
        { value: 'none', label: 'None of these', exclusive: true },
        PREFER_NOT_TO_ANSWER,
      ],
    },
    {
      id: 'hist_pregnancy_mood',
      type: 'single',
      contextual: true,
      text: 'How was your mood during this pregnancy?',
      help: 'Low mood or anxiety during pregnancy is one of the clearest signals of what the year after may need, and it is routinely missed.',
      options: [
        { value: 'fine', label: 'Mostly fine' },
        { value: 'some', label: 'Low or anxious some of the time' },
        { value: 'most', label: 'Low or anxious for most of it', flags: ['antenatal_mood'] },
        { value: 'treated', label: 'I was treated for it during the pregnancy', flags: ['antenatal_mood', 'antenatal_treated'] },
        PREFER_NOT_TO_ANSWER,
      ],
    },
  ],
};
