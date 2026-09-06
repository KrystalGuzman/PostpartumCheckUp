/**
 * Part 14 — Real-life postpartum scenarios.
 *
 * Scenarios are stage-matched and deliberately non-prescriptive: no parenting
 * choice is scored as better than another. Only the person's *reaction* carries
 * weight, and only into the domains a scenario is declared to touch. Choosing
 * "this is not part of my experience" removes the scenario from scoring
 * altogether rather than counting as a low score.
 */

const scenario = (id, stage, domains, situation, question, options) => ({
  id,
  stage,
  // Any domain an option can weight has to be declared, or its contribution
  // would be silently dropped when the scenario is scored.
  domains: [...new Set([...domains, ...options.flatMap((o) => Object.keys(o.weights ?? {}))])],
  type: 'single',
  kind: 'scenario',
  situation,
  text: question,
  options: [...options, { value: 'na', label: 'This is not part of my experience', notApplicable: true }],
});

const opt = (value, label, weights = {}) => ({ value, label, weights });

export const scenarios = [
  // --- Birth -------------------------------------------------------------
  scenario(
    'sc_birth_unplanned',
    'birth',
    ['trauma', 'grief', 'adjustment'],
    'The birth went somewhere you had not planned for — a cesarean, an induction, forceps, or a rush of decisions made for you.',
    'When it comes back to you now, what happens?',
    [
      opt('settled', 'I can think about it without much charge. It went how it went.', {}),
      opt('sad', 'There is real sadness or disappointment in it, but I can hold it.', { grief: 1, adjustment: 1 }),
      opt('replay', 'I replay it — what I could have asked for, where it turned.', { trauma: 2, grief: 2 }),
      opt('avoid', 'I steer away from it entirely. I would rather not go near it.', { trauma: 3, grief: 2 }),
    ],
  ),
  scenario(
    'sc_birth_emergency',
    'birth',
    ['trauma'],
    'At some point it became an emergency — an alarm, a room filling with people, a run down a corridor.',
    'How does your body respond when something brings that back?',
    [
      opt('calm', 'Nothing much. It is a memory like any other.', {}),
      opt('uneasy', 'I feel uneasy for a moment, then it passes.', { trauma: 1 }),
      opt('physical', 'My heart goes, or I feel sick. It lands in my body.', { trauma: 3 }),
      opt('shutdown', 'I go blank or somewhere else entirely.', { trauma: 3 }),
    ],
  ),
  scenario(
    'sc_birth_nicu',
    'birth',
    ['trauma', 'depression', 'grief'],
    'Your baby needed the NICU or special care, and the first days happened beside monitors instead of at home.',
    'Where has that left you?',
    [
      opt('through', 'We got through it and it feels behind us.', {}),
      opt('tender', 'It is tender, and I am still catching up on it.', { grief: 1, adjustment: 1 }),
      opt('guarded', 'I still brace for something to go wrong, and I watch them constantly.', { trauma: 2, anxiety: 2 }),
      opt('robbed', 'I feel I lost the beginning I was supposed to have with them.', { grief: 3, depression: 2, trauma: 2 }),
    ],
  ),
  scenario(
    'sc_birth_dismissed',
    'birth',
    ['trauma'],
    'You told someone caring for you that something was wrong, and it was not taken seriously.',
    'What has stayed with you from that?',
    [
      opt('none', 'Nothing much stayed with me.', {}),
      opt('annoyed', 'Frustration, mostly. I would handle it differently now.', { adjustment: 1 }),
      opt('distrust', 'I find it hard to trust medical people now, including for my baby.', { trauma: 2 }),
      opt('avoidant', 'I put off appointments because of it.', { trauma: 3 }),
    ],
  ),

  // --- First month -------------------------------------------------------
  scenario(
    'sc_m1_feeding',
    'month1',
    ['adjustment', 'anxiety', 'grief'],
    'Feeding is not going the way you hoped — pain, a latch that will not hold, weight checks, top-ups, or a pump that rules your day.',
    'What does that bring up?',
    [
      opt('practical', 'It is a practical problem. Frustrating, but that is all.', {}),
      opt('tired', 'It wears me down and I dread the next feed.', { adjustment: 2 }),
      opt('failure', 'It makes me feel like I am failing at something basic.', { depression: 2, adjustment: 2 }),
      opt('grief', 'I am grieving the feeding relationship I thought I would have.', { grief: 3, depression: 1 }),
    ],
  ),
  scenario(
    'sc_m1_nights',
    'month1',
    ['adjustment', 'depression'],
    'It is 3am again. The baby has been up every ninety minutes and the night stretches ahead of you.',
    'What goes through your head in that moment?',
    [
      opt('endure', 'This is hard, and it is temporary. I will get through it.', {}),
      opt('resentful', 'Resentment — at the night, at whoever is asleep beside me.', { adjustment: 2 }),
      opt('despair', 'That I cannot do this, and something in me is giving way.', { depression: 3, adjustment: 2 }),
      opt('nothing', 'Nothing. I just do it. I have stopped feeling much either way.', { depression: 3 }),
    ],
  ),
  scenario(
    'sc_m1_checking',
    'month1',
    ['ocd', 'anxiety'],
    'The baby is finally asleep. You have already checked that they are breathing.',
    'What happens next?',
    [
      opt('settle', 'I settle. I might glance over, but I can rest.', {}),
      opt('once_more', 'I check once more, then manage to leave it.', { anxiety: 1 }),
      opt('repeat', 'I check again and again, and the relief never lasts long.', { ocd: 3, anxiety: 2 }),
      opt('cant_rest', 'I cannot sleep at all unless I can see them or hear them breathing.', { anxiety: 3, ocd: 2 }),
    ],
  ),
  scenario(
    'sc_m1_visitors',
    'month1',
    ['support', 'adjustment'],
    'People keep arriving, holding the baby, and telling you what they did in their day.',
    'How does that sit?',
    [
      opt('welcome', 'Mostly welcome. The company helps.', {}),
      opt('draining', 'Draining. I end up hosting instead of resting.', { adjustment: 1 }),
      opt('judged', 'I feel watched and judged in my own home.', { adjustment: 2 }),
      opt('unseen', 'Everyone asks about the baby. Nobody asks about me.', { depression: 1, adjustment: 2 }),
    ],
  ),
  scenario(
    'sc_m1_crying',
    'month1',
    ['baby_blues', 'depression'],
    'You find yourself crying in the shower, or over something small, without quite knowing why.',
    'How would you describe it?',
    [
      opt('passing', 'It passes quickly and I feel better afterwards. Some days are fine.', { baby_blues: 2 }),
      opt('waves', 'It comes in waves through the day, but there are good stretches too.', { baby_blues: 3 }),
      opt('most_days', 'It is most days now, and it has been going on for weeks.', { depression: 3, baby_blues: 1 }),
      opt('cant_cry', 'I do not cry. I would like to, but nothing comes.', { depression: 3 }),
    ],
  ),

  // --- Months 2-3 --------------------------------------------------------
  scenario(
    'sc_m23_work',
    'months2_3',
    ['adjustment', 'anxiety'],
    'Leave is running out, and childcare and logistics have to be decided.',
    'How is that sitting with you?',
    [
      opt('planned', 'It is sorted, or nearly. I feel okay about it.', {}),
      opt('stressed', 'It is stressful and I keep putting off the calls.', { adjustment: 2 }),
      opt('dread', 'I dread it constantly and it is affecting my sleep.', { anxiety: 3, adjustment: 2 }),
      opt('impossible', 'The numbers do not work and I do not see a way through.', { adjustment: 3, depression: 2 }),
    ],
  ),
  scenario(
    'sc_m23_isolation',
    'months2_3',
    ['depression', 'adjustment'],
    'Another day has gone by where the only voice in the house was yours and the baby’s.',
    'What does that do to you?',
    [
      opt('fine', 'I am okay with my own company.', {}),
      opt('lonely', 'It is lonely, but I have people I could call.', { adjustment: 1 }),
      opt('cut_off', 'I feel cut off, and reaching out has started to feel like too much.', { depression: 2, adjustment: 2 }),
      opt('invisible', 'I feel invisible — like I have disappeared from my own life.', { depression: 3 }),
    ],
  ),
  scenario(
    'sc_m23_partner',
    'months2_3',
    ['support', 'depression'],
    'Your partner or the people around you have gone back to their normal lives. Yours has not come back.',
    'How does that land?',
    [
      opt('fair', 'It feels fair enough. We talk about it.', {}),
      opt('unequal', 'It feels unequal and it comes up in arguments.', { adjustment: 2 }),
      opt('resentment', 'I am carrying resentment I do not know what to do with.', { depression: 1, adjustment: 2 }),
      opt('alone', 'I feel completely alone in it even with them in the room.', { depression: 2, adjustment: 2 }),
    ],
  ),
  scenario(
    'sc_m23_crying_baby',
    'months2_3',
    ['adjustment', 'anxiety', 'depression'],
    'The baby has been crying for a long stretch and nothing you try is working.',
    'What happens in you?',
    [
      opt('steady', 'I stay reasonably steady and keep trying things.', {}),
      opt('panicky', 'I get panicky and start to feel out of my depth.', { anxiety: 2 }),
      opt('overwhelmed', 'I feel it rising in me and sometimes have to put them down and step away.', { adjustment: 2, anxiety: 2 }),
      opt('numb_or_angry', 'I go numb, or a wave of anger comes that frightens me afterwards.', { depression: 2, adjustment: 2 }),
    ],
  ),

  // --- Months 4-6 --------------------------------------------------------
  scenario(
    'sc_m46_regression',
    'months4_6',
    ['depression', 'adjustment'],
    'Sleep had started to improve. Now it has fallen apart again.',
    'How are you taking it?',
    [
      opt('phase', 'As a phase. Annoying, but it will pass.', {}),
      opt('deflated', 'It has knocked the wind out of me.', { adjustment: 2 }),
      opt('hopeless', 'It feels like proof that nothing is ever going to get better.', { depression: 3 }),
      opt('wired', 'Strangely, I am running on almost no sleep and feel wired rather than tired.', { bipolar: 3 }),
    ],
  ),
  scenario(
    'sc_m46_solids',
    'months4_6',
    ['anxiety', 'ocd'],
    'Solids are starting — new textures, new choking risks, new opinions from everyone.',
    'How do mealtimes go for you?',
    [
      opt('enjoy', 'Mostly fun, if messy.', {}),
      opt('careful', 'I am careful and a bit tense, but it is manageable.', { anxiety: 1 }),
      opt('rules', 'I have strict rules and rituals about it and cannot relax them.', { ocd: 3, anxiety: 2 }),
      opt('avoid', 'I avoid certain foods or hand it over to someone else because I cannot bear the risk.', { anxiety: 3, ocd: 2 }),
    ],
  ),
  scenario(
    'sc_m46_normal',
    'months4_6',
    ['depression', 'grief'],
    'People have started saying you must be "back to normal" by now.',
    'What is your honest reaction?',
    [
      opt('mostly', 'Mostly I am, in the ways that matter to me.', {}),
      opt('pretend', 'I say yes and keep the rest to myself.', { depression: 1 }),
      opt('far', 'I am nowhere near it, and hearing it makes me feel behind.', { depression: 2, adjustment: 1 }),
      opt('never', 'I do not think the old normal is coming back, and I am mourning it.', { grief: 3, depression: 2 }),
    ],
  ),
  scenario(
    'sc_m46_return',
    'months4_6',
    ['adjustment', 'anxiety'],
    'You are back at work, or about to be, and drop-off is part of the day now.',
    'What is the hardest part?',
    [
      opt('logistics', 'Just the logistics. Emotionally it is okay.', {}),
      opt('guilt', 'The guilt, though I can put it down once the day starts.', { adjustment: 1 }),
      opt('preoccupied', 'I cannot concentrate at work for thinking about them.', { anxiety: 2, adjustment: 2 }),
      opt('distress', 'It floods me — I have cried in the car or in a toilet cubicle.', { depression: 2, anxiety: 2 }),
    ],
  ),

  // --- Doing this with more than one child --------------------------------
  scenario(
    'sc_sib_regression',
    'siblings',
    ['siblings', 'adjustment'],
    'Your older child has started up again at night, or asking to be a baby, or hitting out at the baby when you are not looking.',
    'How is that landing on you?',
    [
      opt('expected', 'As expected. It is a big change for them and we are working through it.', {}),
      opt('draining', 'It is draining. I am parenting a regression and a newborn at once.', { siblings: 2 }),
      opt('guilt', 'I feel like I did this to them, and the guilt sits on me.', { siblings: 3, depression: 1 }),
      opt('anger', 'I lose my temper with them more than I want to, and it frightens me afterwards.', { siblings: 3, depression: 2 }),
    ],
  ),
  scenario(
    'sc_sib_no_recovery',
    'siblings',
    ['siblings', 'depression'],
    'The baby finally goes down. Your older child appears in the doorway, wide awake and wanting you.',
    'What happens in you at that moment?',
    [
      opt('fine', 'I manage. It is the job.', {}),
      opt('flat', 'Something in me goes flat. I do it anyway.', { siblings: 2, depression: 1 }),
      opt('never_stops', 'It hits me that there is no point in the day where I get to stop.', { siblings: 3, depression: 2 }),
      opt('breaking', 'I feel like I am coming apart, and I have nowhere to put it.', { siblings: 3, depression: 3 }),
    ],
  ),
  scenario(
    'sc_sib_divided',
    'siblings',
    ['siblings', 'grief'],
    'The baby needs feeding and your older child has been waiting all afternoon for you to do something with them.',
    'Which is closest to what that is like?',
    [
      opt('juggle', 'I juggle it. Nobody gets all of me but everybody gets some.', {}),
      opt('torn', 'I feel torn, and whichever one I choose I feel I have let the other down.', { siblings: 2 }),
      opt('failing', 'I feel like I am failing both of them, every day.', { siblings: 3, depression: 2 }),
      opt('mourning', 'I miss what I had with my older one before, and I feel disloyal even thinking it.', { siblings: 3, grief: 3 }),
    ],
  ),
  scenario(
    'sc_sib_support_gap',
    'siblings',
    ['siblings', 'adjustment'],
    'With your first, there were visitors, meals, people wanting a turn. This time it has been quieter.',
    'How does that sit?',
    [
      opt('relief', 'Honestly, a relief. I did not want the fuss.', {}),
      opt('noticed', 'I have noticed, and it stings a bit.', { siblings: 1 }),
      opt('alone', 'I am doing far more of it alone than I did last time.', { siblings: 3, adjustment: 2 }),
      opt('forgotten', 'It feels like everyone assumes I am fine because it is not my first.', { siblings: 3, depression: 1 }),
    ],
  ),
  scenario(
    'sc_sib_should_know',
    'siblings',
    ['siblings', 'depression'],
    'Someone says, "Well, you know what you\u2019re doing this time."',
    'What do you say, and what do you actually think?',
    [
      opt('true', 'It is broadly true. Some of it is easier.', {}),
      opt('smile', 'I smile and agree, and keep the rest to myself.', { siblings: 2 }),
      opt('unsaid', 'I have stopped saying I am struggling, because I am supposed to know how.', { siblings: 3, depression: 2 }),
      opt('worse', 'I am worse this time than I was with my first, and almost nobody knows.', { siblings: 3, depression: 3 }),
    ],
  ),

  // --- Months 6-12 -------------------------------------------------------
  scenario(
    'sc_m612_mobility',
    'months6_12',
    ['anxiety', 'ocd'],
    'They are crawling or pulling up, and the house has become a landscape of edges and sockets.',
    'How does that go?',
    [
      opt('vigilant', 'Normal vigilance. I have babyproofed and moved on.', {}),
      opt('tense', 'I am tense but I can let them explore.', { anxiety: 1 }),
      opt('scanning', 'I scan constantly for hazards and cannot switch it off.', { anxiety: 3 }),
      opt('rituals', 'I check and re-check the same things, or run the same disaster scene in my head.', { ocd: 3, anxiety: 2 }),
    ],
  ),
  scenario(
    'sc_m612_daycare',
    'months6_12',
    ['adjustment'],
    'Daycare has brought a rolling cycle of illness — theirs, then yours, then missed work.',
    'Where are you with it?',
    [
      opt('coping', 'It is relentless but we are coping.', {}),
      opt('stretched', 'It has stretched my leave, my patience, and my finances thin.', { adjustment: 2 }),
      opt('breaking', 'Every new bug feels like the thing that will break the arrangement.', { adjustment: 3, anxiety: 2 }),
      opt('guilty', 'I feel guilty every time I send them, and guilty every time I keep them home.', { adjustment: 2, depression: 1 }),
    ],
  ),
  scenario(
    'sc_m612_weaning',
    'months6_12',
    ['grief', 'depression'],
    'Feeding is winding down — by your choice, by theirs, or by circumstance.',
    'How does that feel?',
    [
      opt('ready', 'Ready. I am glad to have my body back to myself.', {}),
      opt('mixed', 'Mixed — relief and sadness at the same time.', { grief: 1 }),
      opt('low', 'My mood has dipped noticeably since it started.', { depression: 2, grief: 2 }),
      opt('loss', 'It feels like losing something I am not ready to lose.', { grief: 3, depression: 1 }),
    ],
  ),
  scenario(
    'sc_m612_comparison',
    'months6_12',
    ['depression', 'adjustment'],
    'Your feed is full of other people’s babies hitting milestones and other parents looking fine.',
    'What does that do?',
    [
      opt('scroll', 'Not much. I scroll past it.', {}),
      opt('twinge', 'A twinge, then I let it go.', { adjustment: 1 }),
      opt('behind', 'I come away convinced my baby or I are behind.', { anxiety: 2, depression: 2 }),
      opt('worthless', 'I come away feeling worthless as a parent.', { depression: 3 }),
    ],
  ),
  scenario(
    'sc_m612_birthday',
    'months6_12',
    ['grief', 'depression', 'trauma'],
    'The first birthday is coming up, and with it the anniversary of the birth.',
    'What comes with that?',
    [
      opt('celebration', 'Mostly celebration. We made it.', {}),
      opt('bittersweet', 'Pride, and some sadness for how the year actually went.', { grief: 1 }),
      opt('dread', 'A creeping dread as the date gets closer.', { trauma: 2, depression: 1 }),
      opt('lost_year', 'A sense that I lost the year, and I cannot get it back.', { grief: 3, depression: 3 }),
    ],
  ),
  scenario(
    'sc_m612_another',
    'months6_12',
    ['trauma', 'anxiety'],
    'The question of another pregnancy has started to come up — from you, a partner, or other people.',
    'What is your reaction to it?',
    [
      opt('open', 'Open, whenever the time is right.', {}),
      opt('undecided', 'Undecided, and that is fine for now.', {}),
      opt('fear', 'The thought of going through birth again frightens me.', { trauma: 2, anxiety: 2 }),
      opt('never', 'I could not face it, and that certainty is itself upsetting.', { trauma: 3, anxiety: 2 }),
    ],
  ),
];

/** Stage ordering used to pick which scenario sets to show. */
export const STAGE_FOR_WEEKS = (weeks) => {
  if (weeks == null) return 'month1';
  if (weeks <= 6) return 'month1';
  if (weeks <= 13) return 'months2_3';
  if (weeks <= 26) return 'months4_6';
  return 'months6_12';
};

/**
 * Birth scenarios stay available at every stage — birth experiences do not
 * expire — but only ones with an endorsed corresponding context answer are
 * shown, so nobody is asked about a NICU stay they did not have.
 */
export function selectScenarios(state) {
  const stage = STAGE_FOR_WEEKS(state.weeksPostpartum);
  const birth = scenarios.filter((s) => s.stage === 'birth' && birthScenarioApplies(s, state)).slice(0, 3);
  const staged = scenarios.filter((s) => s.stage === stage).slice(0, 4);
  // Sibling scenarios are additive rather than a replacement: someone with two
  // children still has whatever their stage brings.
  const siblings =
    state.valueOf('ctx_first_baby') === 'no' ? scenarios.filter((s) => s.stage === 'siblings').slice(0, 3) : [];
  return [...birth, ...staged, ...siblings];
}

function birthScenarioApplies(scenarioItem, state) {
  const birth = state.valueOf('ctx_birth') ?? [];
  const medical = state.valueOf('ctx_medical') ?? [];
  const events = state.valueOf('ptsd_event') ?? [];
  switch (scenarioItem.id) {
    case 'sc_birth_unplanned':
      return (
        ['cesarean_unplanned', 'assisted', 'induced', 'complicated', 'preterm'].some((v) => birth.includes(v)) ||
        events.includes('powerless')
      );
    case 'sc_birth_emergency':
      return (
        birth.includes('cesarean_unplanned') ||
        birth.includes('complicated') ||
        events.includes('emergency') ||
        events.includes('frightening')
      );
    case 'sc_birth_nicu':
      return medical.includes('nicu') || medical.includes('baby_complication') || events.includes('nicu');
    case 'sc_birth_dismissed':
      return events.includes('dismissed') || events.includes('unsafe');
    default:
      return false;
  }
}
