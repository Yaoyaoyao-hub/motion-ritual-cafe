export const CUSTOMERS = [
  { name: 'Jun', title: 'The early bird', drink: 'Cloud cappuccino', color: '#bd795c', skin: 0xc79069, hair: 0x302c28, request: 'A little foam, please!', steps: [{ key: 'jump', label: 'Squat + rise to froth', count: 2 }, { key: 'interact', label: 'Raise a hand to serve', count: 1 }] },
  { name: 'Amara', title: 'The neighbourhood artist', drink: 'Honey oat latte', color: '#7d9170', skin: 0x88583e, hair: 0x26231f, request: 'Give it a gentle swirl.', steps: [{ key: 'leanLeft', label: 'Lean left to swirl', count: 2 }, { key: 'leanRight', label: 'Lean right to swirl', count: 2 }, { key: 'interact', label: 'Raise a hand to serve', count: 1 }] },
  { name: 'Theo', title: 'The bookshop owner', drink: 'Double espresso', color: '#738da8', skin: 0xe4b18e, hair: 0x73645c, request: 'A strong start for a long story.', steps: [{ key: 'stepForward', label: 'Step closer to grind', count: 2 }, { key: 'stepBack', label: 'Step back to tamp', count: 2 }, { key: 'interact', label: 'Raise a hand to serve', count: 1 }] },
  { name: 'Iris', title: 'The weekend wanderer', drink: 'Maple iced coffee', color: '#b795ba', skin: 0xd8a47b, hair: 0x693b2e, request: 'One last shake before I go!', steps: [{ key: 'jump', label: 'Squat + rise to shake', count: 2 }, { key: 'leanLeft', label: 'Lean left to pour', count: 1 }, { key: 'leanRight', label: 'Lean right to finish', count: 1 }, { key: 'interact', label: 'Raise a hand to serve', count: 1 }] },
];
export const INITIAL_ORDER = { customer: 0, step: 0, reps: 0, served: 0 };
export function advanceOrder(state, action) {
  if (action.type === 'reset') return { ...INITIAL_ORDER };
  const customer = CUSTOMERS[state.customer];
  if (!customer || customer.steps[state.step].key !== action.key) return state;
  if (state.reps + 1 < customer.steps[state.step].count) return { ...state, reps: state.reps + 1 };
  if (state.step + 1 < customer.steps.length) return { ...state, step: state.step + 1, reps: 0 };
  return { customer: state.customer + 1, served: state.served + 1, step: 0, reps: 0 };
}
