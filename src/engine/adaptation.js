/**
 * Load and how it is being carried, read together.
 *
 * Pressure and adaptation are scored separately and then crossed, because
 * neither one alone says much:
 *
 *                    adapting                    losing ground
 *   low pressure     settled                     not explained by the load
 *   high pressure    carrying it, for now        load has outrun capacity
 *
 * The bottom-left cell is the one worth building for. Someone with ordinary
 * circumstances who is still losing ground is the person most likely to be
 * told — and to tell themselves — that they have nothing to complain about.
 * When the load does not explain how someone feels, that is a pointer towards
 * something clinical rather than towards more help with the laundry.
 */

import { registry } from './questionnaire.js';

const PRESSURE_ITEMS = [
  'pr_body',
  'pr_sleep',
  'pr_time',
  'pr_mental_load',
  'pr_money',
  'pr_relationship',
  'pr_needed',
  'pr_identity',
  'pr_judged',
  'pr_divided',
];

const QUADRANTS = {
  settled: {
    key: 'settled',
    headline: 'A manageable load, and you are adapting to it',
    statement:
      'You do not describe an unusual amount of pressure, and by your own account you are gaining ground rather than losing it. That is worth naming, and worth keeping an eye on if either half changes.',
  },
  carrying: {
    key: 'carrying',
    headline: 'A heavy load, and you are carrying it',
    statement:
      'You describe a lot of pressure and you are still adapting to it. That is a real strength, and it is not a reason to keep carrying this indefinitely — coping has a limit, and the load itself is worth reducing before you find where yours is. What you need most here is less to carry, not a diagnosis.',
  },
  outrun: {
    key: 'outrun',
    headline: 'The load has outrun what you have to meet it with',
    statement:
      'You describe both a heavy load and losing ground against it. Both halves need attention, and they need different things: the load needs to come down, and how you are doing needs to be looked at by a professional. Doing only one of the two tends not to hold.',
  },
  unexplained: {
    key: 'unexplained',
    headline: 'You are losing ground, and the load does not explain it',
    statement:
      'You do not describe an unusual amount of pressure, and you are still losing ground. That combination is worth taking seriously rather than dismissing. It is the pattern most often waved away — often by the person themselves — with some version of "but I have nothing to complain about". When circumstances do not account for how someone feels, that points towards something worth assessing clinically rather than something more help at home would fix. Nothing about it means you are ungrateful, or that you are failing at something other people manage.',
  },
};

export function evaluateAdaptation(state) {
  const pressureItems = PRESSURE_ITEMS.map((id) => ({ id, score: state.scoreOf(id) })).filter(
    (item) => item.score !== null,
  );
  const pressureRaw = pressureItems.reduce((total, item) => total + item.score, 0);
  const pressureMax = pressureItems.length * 3;
  const pressureRatio = pressureMax > 0 ? pressureRaw / pressureMax : null;

  const adaptationItems = registry
    .scoredItemsForDomain('adaptation')
    .map((item) => ({ id: item.id, text: item.text, score: state.scoreOf(item.id) }))
    .filter((item) => item.score !== null);
  const adaptationRaw = adaptationItems.reduce((total, item) => total + item.score, 0);
  const adaptationMax = adaptationItems.length * 3;
  const adaptationRatio = adaptationMax > 0 ? adaptationRaw / adaptationMax : null;

  const answered = pressureItems.length >= 4 && adaptationItems.length >= 4;

  const pressureLevel = pressureRatio == null ? null : pressureRatio >= 0.5 ? 'high' : pressureRatio >= 0.28 ? 'moderate' : 'low';
  const adapting = adaptationRatio == null ? null : adaptationRatio >= 0.45 ? 'losing' : adaptationRatio >= 0.25 ? 'strained' : 'adapting';

  let quadrant = null;
  if (answered) {
    const heavy = pressureLevel === 'high';
    const losing = adapting === 'losing';
    if (heavy && losing) quadrant = QUADRANTS.outrun;
    else if (heavy) quadrant = QUADRANTS.carrying;
    else if (losing) quadrant = QUADRANTS.unexplained;
    else quadrant = QUADRANTS.settled;
  }

  // Which pressures are actually heavy, in the person's own ranking.
  const topPressures = pressureItems
    .filter((item) => item.score >= 2)
    .sort((a, b) => b.score - a.score)
    .map((item) => ({ id: item.id, score: item.score, text: registry.getItem(item.id)?.text ?? item.id }));

  // Adaptation signals worth naming individually rather than only as a band.
  const restNotRestoring = (state.scoreOf('ad_restoration') ?? 0) >= 2;
  const noForwardView = (state.scoreOf('ad_forward') ?? 0) >= 2;
  const goodMomentsNotLanding = (state.scoreOf('ad_good_moments') ?? 0) >= 3;
  const noMargin = (state.scoreOf('ad_margin') ?? 0) >= 2;

  return {
    answered,
    pressureRatio,
    pressureLevel,
    pressureRaw,
    pressureMax,
    adaptationRatio,
    adapting,
    adaptationRaw,
    adaptationMax,
    quadrant,
    topPressures,
    restNotRestoring,
    noForwardView,
    goodMomentsNotLanding,
    noMargin,
    harderThanExpected: state.has('harder_than_expected'),
    // The multiparous probe: competence with the baby is not the same as
    // capacity for everything around it, and the two often move apart.
    competentButDepleted: state.has('competent_but_depleted'),
    shift: state.valueOf('pr_shifted') ?? [],
    shiftLabels: (state.valueOf('pr_shifted') ?? [])
      .filter((v) => v !== 'pna')
      .map((v) => registry.getItem('pr_shifted')?.options.find((o) => o.value === v)?.label)
      .filter(Boolean),
  };
}
