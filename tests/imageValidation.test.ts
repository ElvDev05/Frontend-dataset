import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateImage, MAX_IMAGE_BYTES } from '../src/utils/imageValidation.ts';

test('unsupported, empty and oversized photographs are rejected before upload', async () => {
  await assert.rejects(validateImage(new File(['photo'], 'photo.heic', { type: 'image/heic' })), /JPEG o PNG/);
  await assert.rejects(validateImage(new File([], 'photo.jpg', { type: 'image/jpeg' })), /15 MiB/);
  await assert.rejects(validateImage(new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], 'photo.png', { type: 'image/png' })), /15 MiB/);
});

test('a forged JPEG and PNG are rejected based on their actual signatures', async () => {
  for (const type of ['image/jpeg', 'image/png']) await assert.rejects(validateImage(new File(['not an image'], 'photo', { type })), /no corresponde/);
});

test('oversized PNG dimensions and animated PNG are rejected before decoding', async () => {
  const bytes = new Uint8Array(33);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13);
  bytes.set(new TextEncoder().encode('IHDR'), 12);
  view.setUint32(16, 10000); view.setUint32(20, 10000);
  await assert.rejects(validateImage(new File([bytes], 'large.png', { type: 'image/png' })), /40 megapíxeles/);
  bytes.set(new TextEncoder().encode('acTL'), 12);
  await assert.rejects(validateImage(new File([bytes], 'animated.png', { type: 'image/png' })), /animadas/);
});
