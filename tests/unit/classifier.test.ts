import { expect, test } from 'bun:test';
import { classify } from '../../src/classifier.js';

test('a reported setting stays a lookup across topic and politeness changes', () => {
  for (const topic of ['authentication', 'distributed storage', 'compiler', 'billing']) {
    for (const prefix of ['', 'Please ', 'Could you ']) {
      expect(classify(`${prefix}find the retry count in the ${topic} settings and report it.`).tier).toBe('trivial');
    }
  }
});

test('negative instructions do not turn extraction into implementation', () => {
  const task = 'Read the provided status JSON and return the literal value of active.';
  expect(classify(task).tier).toBe('trivial');
  expect(classify(`${task} Do not diagnose the distributed service or design a recovery protocol.`)).toEqual(classify(task));
  expect(classify(`${task} Without changing the endpoint or adding an API.`)).toEqual(classify(task));
});

test('later affirmative work is retained after a negated sentence', () => {
  expect(classify('Do not edit the README. Diagnose a distributed race condition.').tier).toBe('complex');
  expect(classify('Find the retry count and design distributed crash recovery.').tier).toBe('complex');
});

test('bounded configuration changes do not escalate because of their topic', () => {
  for (const topic of ['authentication', 'compiler', 'billing']) {
    expect(classify(`In the ${topic} client, change the retry count from four to five and update the existing test expectation.`).tier).toBe('simple');
  }
});

test('context-free continuation and unrecognized language abstain', () => {
  for (const text of ['Proceed!', 'same as before', 'Do not change anything.', 'asdf qwer', '```implement distributed failover```']) {
    expect(classify(text).abstained).toBe(true);
  }
});

test('recovery invariants survive short wording and irrelevant padding', () => {
  const text = 'Design recovery so duplicate queue delivery and worker crashes preserve one durable result.';
  expect(classify(text).tier).toBe('complex');
  expect(classify(`${text} ${'Use the existing tools. '.repeat(100)}`).tier).toBe('complex');
});

test('unbounded formal feasibility is distinct from a definition', () => {
  expect(classify('Determine feasibility against an adaptive adversary and give a proof or counterexample.').tier).toBe('apex');
  expect(classify('Explain the definition of an adaptive adversary.').tier).toBe('trivial');
});
