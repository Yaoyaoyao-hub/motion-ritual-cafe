import test from 'node:test';
import assert from 'node:assert/strict';
import { CUSTOMERS, INITIAL_ORDER, advanceOrder } from '../src/orders.js';
test('wrong movements do not complete requests; repetitions and steps are ordered', () => {
  assert.deepEqual(advanceOrder(INITIAL_ORDER, { key: 'interact' }), INITIAL_ORDER);
  let state = advanceOrder(INITIAL_ORDER, { key: 'jump' });
  assert.equal(state.reps, 1);
  state = advanceOrder(state, { key: 'jump' });
  assert.equal(state.step, 1);
  state = advanceOrder(state, { key: 'interact' });
  assert.equal(state.served, 1);
  assert.equal(state.customer, 1);
});
test('all four recipes finish once and reset fully', () => {
  let state = { ...INITIAL_ORDER };
  for (const customer of CUSTOMERS) for (const step of customer.steps) for (let i = 0; i < step.count; i++) state = advanceOrder(state, { key: step.key });
  assert.equal(state.served, 4);
  assert.deepEqual(advanceOrder(state, { key: 'interact' }), state);
  assert.deepEqual(advanceOrder(state, { type: 'reset' }), INITIAL_ORDER);
});
