/**
 * Crisis and support resources.
 *
 * DEPLOYMENT NOTE
 * ---------------
 * The lists below are defaults for a handful of English-speaking regions. Any
 * real deployment of this check-up must:
 *   1. replace them with location-specific, currently verified resources;
 *   2. have the emergency pathway reviewed and signed off by licensed clinical
 *      professionals in the jurisdiction it serves;
 *   3. re-verify every number on a scheduled basis — helpline numbers change.
 * Nothing in this file should be treated as clinically or legally sufficient on
 * its own.
 */

export const DEPLOYMENT_NOTE =
  'Resource lists in this build are unverified defaults for demonstration. Configure and clinically review location-specific crisis resources before any real-world use.';

export const regions = [
  {
    id: 'us',
    label: 'United States',
    emergency: { label: 'Emergency services', contact: '911' },
    lines: [
      {
        name: 'National Maternal Mental Health Hotline',
        contact: '1-833-852-6262 (1-833-TLC-MAMA)',
        note: 'Free, confidential, 24/7, for pregnant and postpartum people and their families.',
      },
      {
        name: '988 Suicide & Crisis Lifeline',
        contact: 'Call or text 988',
        note: '24/7 crisis support.',
      },
      {
        name: 'Postpartum Support International HelpLine',
        contact: '1-800-944-4773 · text "Help" to the same number · postpartum.net',
        note: 'Not a crisis line, but connects to perinatal mental-health coordinators, groups, and a provider directory.',
      },
      { name: 'Crisis Text Line', contact: 'Text HOME to 741741' },
    ],
  },
  {
    id: 'uk',
    label: 'United Kingdom',
    emergency: { label: 'Emergency services', contact: '999' },
    lines: [
      { name: 'NHS urgent advice', contact: '111, option 2 for mental health' },
      { name: 'Samaritans', contact: '116 123, free, 24/7' },
      { name: 'Shout', contact: 'Text SHOUT to 85258' },
      { name: 'Association for Post Natal Illness', contact: 'apni.org' },
    ],
  },
  {
    id: 'ca',
    label: 'Canada',
    emergency: { label: 'Emergency services', contact: '911' },
    lines: [
      { name: '9-8-8 Suicide Crisis Helpline', contact: 'Call or text 988' },
      { name: 'Postpartum Support International', contact: '1-800-944-4773 · postpartum.net' },
    ],
  },
  {
    id: 'au',
    label: 'Australia',
    emergency: { label: 'Emergency services', contact: '000' },
    lines: [
      { name: 'PANDA — Perinatal Anxiety & Depression Australia', contact: '1300 726 306' },
      { name: 'Lifeline', contact: '13 11 14, 24/7' },
    ],
  },
  {
    id: 'other',
    label: 'Somewhere else',
    emergency: { label: 'Local emergency number', contact: 'Your local emergency number' },
    lines: [
      {
        name: 'Find a Helpline',
        contact: 'findahelpline.com',
        note: 'Free crisis lines by country.',
      },
      { name: 'Postpartum Support International', contact: 'postpartum.net — international directory and online groups' },
    ],
  },
];

export const getRegion = (id) => regions.find((r) => r.id === id) ?? regions[regions.length - 1];

/** Who to approach for what, used when building next steps. */
export const providerRoutes = {
  obstetric: 'your OB/GYN, midwife, or whoever provided your maternity care',
  primary: 'your GP or primary-care provider',
  pediatric: "your baby's pediatrician or health visitor — many will screen a parent at a baby visit",
  therapy: 'a therapist with perinatal mental-health training',
  psychiatry: 'a psychiatrist, ideally one who works in perinatal mental health',
  peer: 'a perinatal peer-support group, in person or online',
  urgent: 'an emergency department, urgent psychiatric assessment, or your local crisis line',
};
