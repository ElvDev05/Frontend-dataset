import { test } from "node:test";
import assert from "node:assert/strict";
import { createSerialQueue } from "../src/utils/serialQueue.ts";

test("serializes overlapping metadata changes and recovers after a rejected mutation", async () => {
  const queue = createSerialQueue();
  const operations: number[] = [];
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const first = queue(async () => {
    await gate;
    operations.push(1);
    throw new Error("conflict");
  });
  const rejected = assert.rejects(first, /conflict/);
  const second = queue(async () => {
    operations.push(2);
    return "new-version";
  });
  await Promise.resolve();
  assert.deepEqual(operations, []);
  release();
  await rejected;
  assert.equal(await second, "new-version");
  assert.deepEqual(operations, [1, 2]);
});
