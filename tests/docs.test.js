import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';

describe('api docs', () => {
  it('serves the OpenAPI document', async () => {
    const res = await request(app).get('/api/openapi.yaml');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('yaml');
    expect(res.text).toContain('openapi: 3.0.3');
    expect(res.text).toContain('/auth/login');
  });

  it('serves Swagger UI', async () => {
    const res = await request(app).get('/api/docs/');

    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger-ui');
  });
});
