import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';

describe('health and readiness', () => {
  it('returns liveness metadata and a request id', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', service: 'notes-api' });
    expect(res.body.version).toBeTypeOf('string');
    expect(res.headers['x-request-id']).toBeTypeOf('string');
  });

  it('returns readiness when MongoDB is connected', async () => {
    const res = await request(app).get('/ready');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ready',
      database: 'connected',
    });
  });
});
