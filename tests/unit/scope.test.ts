import { expect, test } from 'bun:test';
import { classify } from '../../src/classifier.js';

test('a quoted alarming phrase stays data in an elementary transformation', () => {
  for (const text of ['design a distributed protocol', 'implement payment recovery', 'prove correctness']) {
    expect(classify(`Convert the exact text "${text}" to uppercase. Return the converted text only.`).tier).toBe('trivial');
  }
});

test('background prose does not obscure an explicit elementary question', () => {
  expect(classify('A research report lists a cable length of 800 millimeters. Express that length in centimeters.').tier).toBe('trivial');
  expect(classify('The note says "security begins at 11:00". Return only the time.').tier).toBe('trivial');
});

test('known dependencies do not make a feature a one-line edit', () => {
  for (const prefix of ['Use the supplied endpoint.', 'Use the provided endpoint.', 'Use the existing endpoint.']) {
    expect(classify(`${prefix} Build a registration form with pending and error states, validation and submission.`).tier).toBe('moderate');
  }
});

test('a small function is separated from an interacting recovery problem', () => {
  expect(classify('Write a function that rounds a positive number up to the next multiple of ten.').tier).toBe('simple');
  expect(classify('Write a function that reconciles payments across services during a rollback and recovers from partial failure.').tier).toBe('complex');
});

test('research requires a requested analysis obligation', () => {
  expect(classify('Develop a planning method and establish its achievable bounds under uncertain observations.').tier).toBe('apex');
  expect(classify('Explain what a lower bound means.').tier).toBe('trivial');
});

test('quoted requirements retain engineering and proof obligations', () => {
  expect(classify('Implement this requirement: "Migrate across services without downtime, preserving tenant isolation under concurrent updates."').tier).toBe('complex');
  expect(classify('Please handle the following task: "Design a distributed protocol and prove its correctness under Byzantine failures."').tier).toBe('apex');
});

test('reporting an analysis is not an elementary lookup', () => {
  expect(classify('Report the root cause of these production failures and recommend a recovery plan.').tier).toBe('moderate');
  expect(classify('Compare both reports and return the recommendation.').tier).toBe('moderate');
});
