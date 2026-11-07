import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allPages, canScore, hasScore, latestByBovine, validScore } from '../src/utils/scoring.ts';
import type { Evaluation } from '../src/types/api.ts';
const base = { id: 1, bovineId: 1, evaluationDate: '2026-10-01', bodyConditionScore: null, status: 'Draft', images: [] } as unknown as Evaluation;
test('new unscored visit supersedes an earlier score, while rejection is ignored', () => {
  const old = { ...base, bodyConditionScore: 3 };
  const newer = { ...base, id: 2, evaluationDate: '2026-10-02' };
  const rejected = { ...base, id: 3, evaluationDate: '2026-10-03', status: 'Rejected' as const, bodyConditionScore: 4 };
  const latest = latestByBovine([rejected, newer, old]);
  assert.equal(latest.get(1)?.id, 2);
  assert.equal(hasScore(latest.get(1)), false);
  assert.equal(hasScore(old), true);
});
test('right lateral and rear photographs unlock scoring; other pairs do not', () => {
  const photo = (angle: Evaluation['images'][number]['angle']) => ({ angle, uploadStatus: 'Verified' }) as Evaluation['images'][number];
  const required = [photo('RightLateral'), photo('Rear')];
  assert.equal(canScore({ ...base, images: [photo('LeftLateral'), photo('Rear')] }), false);
  assert.equal(canScore({ ...base, images: [photo('RightLateral'), photo('TopBack')] }), false);
  assert.equal(canScore({ ...base, images: required }), true);
  assert.equal(canScore({ ...base, status: 'Complete', images: required }), false);
});
test('score options are quarter points between one and five', () => {
  for (const value of [0, 2.1, 5.25, NaN, null]) assert.equal(validScore(value), false);
  for (let value = 1; value <= 5; value += .25) assert.equal(validScore(value), true);
});
test('filters can rely on complete paginated API results', async () => {
  const result = await allPages(page => Promise.resolve({ items: [page], total: 3, page, pageSize: 1 }));
  assert.deepEqual(result, [1, 2, 3]);
});
