import { test } from 'node:test';
import assert from 'node:assert';
import { getWorstStatus } from './normalize.ts';

// Re-defining for easier type safety in test but it's really the same
type ProviderStatus = 'unknown' | 'operational' | 'maintenance' | 'degraded' | 'outage';

test('getWorstStatus', async (t) => {
  await t.test('returns fallback when statuses array is empty', () => {
    assert.strictEqual(getWorstStatus([], 'unknown'), 'unknown');
    assert.strictEqual(getWorstStatus([], 'operational'), 'operational');
  });

  await t.test('returns the single status when only one is provided', () => {
    assert.strictEqual(getWorstStatus(['operational']), 'operational');
    assert.strictEqual(getWorstStatus(['outage']), 'outage');
    assert.strictEqual(getWorstStatus(['degraded']), 'degraded');
  });

  await t.test('returns the worst status from a list', () => {
    const statuses: ProviderStatus[] = ['operational', 'degraded', 'operational'];
    assert.strictEqual(getWorstStatus(statuses), 'degraded');

    const statuses2: ProviderStatus[] = ['operational', 'outage', 'degraded'];
    assert.strictEqual(getWorstStatus(statuses2), 'outage');

    const statuses3: ProviderStatus[] = ['maintenance', 'operational'];
    assert.strictEqual(getWorstStatus(statuses3), 'maintenance');
  });

  await t.test('handles unknown status priority correctly', () => {
    assert.strictEqual(getWorstStatus(['unknown', 'operational']), 'operational');
    assert.strictEqual(getWorstStatus(['operational', 'unknown']), 'operational');
  });

  await t.test('returns the first worst status when multiple have same highest priority', () => {
    assert.strictEqual(getWorstStatus(['outage', 'outage']), 'outage');
    assert.strictEqual(getWorstStatus(['degraded', 'maintenance', 'degraded']), 'degraded');
  });

  await t.test('uses default fallback of unknown when not provided', () => {
    assert.strictEqual(getWorstStatus([]), 'unknown');
  });
});
