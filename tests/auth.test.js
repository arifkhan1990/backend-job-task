import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { createUser } from './helpers.js';

const validRegistration = {
  name: 'Alice',
  email: 'alice@example.com',
  password: 'Password123!',
  interests: ['Chess', 'reading', 'chess'],
};

const loginPayload = {
  email: 'login@example.com',
  password: 'Password123!',
};

describe('auth', () => {
  it('registers a user and returns a JWT', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(validRegistration);

    expect(res.status).toBe(201);
    expect(res.body.data.token).toBeTypeOf('string');
    expect(res.body.data.user).toMatchObject({
      name: 'Alice',
      email: 'alice@example.com',
      role: 'user',
    });
    expect(res.body.data.user.interests).toEqual(['chess', 'reading']);
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('does not allow role escalation during registration', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validRegistration, email: 'bob@example.com', role: 'admin' });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('user');
  });

  it('rejects a duplicate email', async () => {
    await createUser({ email: 'dupe@example.com' });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validRegistration, email: 'dupe@example.com' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('rejects invalid registration input', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'A', email: 'not-an-email', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  it('logs in and returns the current profile', async () => {
    await createUser(loginPayload);

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send(loginPayload);

    expect(login.status).toBe(200);
    expect(login.body.data.token).toBeTypeOf('string');

    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${login.body.data.token}`);

    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(loginPayload.email);
    expect(me.body.data.user.password).toBeUndefined();
  });

  it('rejects a bad password', async () => {
    await createUser({ email: 'badpass@example.com' });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'badpass@example.com', password: 'WrongPassword1!' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects missing and invalid access tokens', async () => {
    const missing = await request(app).get('/api/v1/auth/me');
    expect(missing.status).toBe(401);
    expect(missing.body.error.code).toBe('UNAUTHORIZED');

    const invalid = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer not-a-token');
    expect(invalid.status).toBe(401);
    expect(invalid.body.error.code).toBe('INVALID_TOKEN');
  });

  it('updates the profile and password', async () => {
    const user = await createUser({
      email: 'profile@example.com',
      password: 'Password123!',
    });

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'profile@example.com', password: 'Password123!' });

    const updated = await request(app)
      .patch('/api/v1/auth/me')
      .set('Authorization', `Bearer ${login.body.data.token}`)
      .send({
        name: 'Updated Name',
        interests: ['Reading'],
        password: 'NewPassword123!',
      });

    expect(updated.status).toBe(200);
    expect(updated.body.data.user.name).toBe('Updated Name');
    expect(updated.body.data.user.interests).toEqual(['reading']);

    const oldLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'Password123!' });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'NewPassword123!' });
    expect(newLogin.status).toBe(200);
  });
});
