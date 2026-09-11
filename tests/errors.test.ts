import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AxiosError, AxiosHeaders } from 'axios';
import { errorMessage } from '../src/utils/errors.ts';

function apiError(status: number, data: unknown) {
  return new AxiosError('Request failed', undefined, undefined, undefined, {
    data, status, statusText: '', headers: {}, config: { headers: new AxiosHeaders() },
  });
}

test('known domain errors and field validation are translated into Spanish', async () => {
  assert.equal(await errorMessage(apiError(400, { detail: 'Specialist is inactive.' })), 'El especialista está inactivo. Selecciona uno activo.');
  assert.equal(await errorMessage(apiError(400, { detail: 'Bovine sex must be Male or Female.' })), 'Selecciona el sexo del bovino: macho o hembra.');
  assert.match(await errorMessage(apiError(400, { detail: 'At least three verified images are required: top back, rear and one lateral side. A fourth image may contain the other lateral side.' })), /al menos tres fotografías verificadas/);
  assert.match(await errorMessage(apiError(400, { errors: { IdentificationCode: ['The IdentificationCode field is required.'] } })), /^Código de identificación:/);
});

test('401, 403, 404, 409, rate limits and network failures have actionable messages', async () => {
  for (const [status, expected] of [[401, /sesión/], [403, /permiso/], [404, /No se encontró/], [409, /Recarga/], [429, /Espera/]] as const) {
    assert.match(await errorMessage(apiError(status, {})), expected);
  }
  assert.match(await errorMessage(new AxiosError('Network Error')), /Revisa tu conexión/);
});

test('CSV failures returned as a Blob preserve the API error meaning', async () => {
  const blob = new Blob([JSON.stringify({ code: 'database_unavailable' })], { type: 'application/problem+json' });
  assert.equal(await errorMessage(apiError(503, blob)), 'La base de datos no está disponible. Inténtalo más tarde.');
});
