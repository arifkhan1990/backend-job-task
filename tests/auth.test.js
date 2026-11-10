import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { RefreshToken } from '../src/models/RefreshToken.js';
import { cookieValue, createUser } from './helpers.js';

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

function cookieHeader(...cookies) {
  return cookies.join('; ');
}

describe('auth', () => {
  it('registers a user and sets secure refresh and CSRF cookies', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(validRegistration);

    expect(res.status).toBe(201);
    expect(res.body.data.accessToken).toBeTypeOf('string');
    expect(res.body.data.csrfToken).toBeTypeOf('string');
    expect(res.body.data.user).toMatchObject({
      name: 'Alice',
      email: 'alice@example.com',
      role: 'user',
    });
    expect(res.body.data.user.interests).toEqual(['chess', 'reading']);
    expect(res.body.data.user.password).toBeUndefined();

    const refreshCookie = res.headers['set-cookie'].find((cookie) =>
      cookie.startsWith('refresh_token='),
    );
    const csrfCookie = res.headers['set-cookie'].find((cookie) =>
      cookie.startsWith('csrf_token='),
    );

    expect(refreshCookie).toContain('HttpOnly');
    expect(refreshCookie).toContain('SameSite=Lax');
    expect(csrfCookie).not.toContain('HttpOnly');
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

    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`);

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

  it('issues a CSRF token for the refresh flow', async () => {
    const res = await request(app).get('/api/v1/auth/csrf');

    expect(res.status).toBe(200);
    expect(res.body.data.csrfToken).toBeTypeOf('string');
    expect(cookieValue(res, 'csrf_token')).toBe(res.body.data.csrfToken);
  });

  it('rotates refresh tokens and detects reuse', async () => {
    await createUser(loginPayload);

    const agent = request.agent(app);
    const login = await agent.post('/api/v1/auth/login').send(loginPayload);
    const oldRefresh = cookieValue(login, 'refresh_token');
    const oldCsrf = login.body.data.csrfToken;

    const refreshed = await agent
      .post('/api/v1/auth/refresh')
      .set('X-CSRF-Token', oldCsrf);

    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.accessToken).toBeTypeOf('string');
    expect(cookieValue(refreshed, 'refresh_token')).not.toBe(oldRefresh);

    const reused = await request(app)
      .post('/api/v1/auth/refresh')
      .set(
        'Cookie',
        cookieHeader(
          `refresh_token=${oldRefresh}`,
          `csrf_token=${oldCsrf}`,
        ),
      )
      .set('X-CSRF-Token', oldCsrf);

    expect(reused.status).toBe(401);
    expect(reused.body.error.code).toBe('REFRESH_TOKEN_REUSED');

    const currentRefresh = cookieValue(refreshed, 'refresh_token');
    const currentCsrf = refreshed.body.data.csrfToken;
    const afterReuse = await request(app)
      .post('/api/v1/auth/refresh')
      .set(
        'Cookie',
        cookieHeader(
          `refresh_token=${currentRefresh}`,
          `csrf_token=${currentCsrf}`,
        ),
      )
      .set('X-CSRF-Token', currentCsrf);

    expect(afterReuse.status).toBe(401);
    expect(afterReuse.body.error.code).toBe('REFRESH_TOKEN_REUSED');
  });

  it('requires CSRF for refresh and logout', async () => {
    await createUser(loginPayload);

    const agent = request.agent(app);
    await agent.post('/api/v1/auth/login').send(loginPayload);

    const refresh = await agent.post('/api/v1/auth/refresh');
    expect(refresh.status).toBe(403);
    expect(refresh.body.error.code).toBe('CSRF_ERROR');

    const logout = await agent.post('/api/v1/auth/logout');
    expect(logout.status).toBe(403);
    expect(logout.body.error.code).toBe('CSRF_ERROR');
  });

  it('revokes the session on logout', async () => {
    await createUser(loginPayload);

    const agent = request.agent(app);
    const login = await agent.post('/api/v1/auth/login').send(loginPayload);
    const csrf = login.body.data.csrfToken;

    const logout = await agent
      .post('/api/v1/auth/logout')
      .set('X-CSRF-Token', csrf);
    expect(logout.status).toBe(204);

    const csrfResponse = await agent.get('/api/v1/auth/csrf');
    const refresh = await agent
      .post('/api/v1/auth/refresh')
      .set('X-CSRF-Token', csrfResponse.body.data.csrfToken);
    expect(refresh.status).toBe(401);
    expect(refresh.body.error.code).toBe('REFRESH_TOKEN_REQUIRED');
  });

  it('updates the profile and revokes refresh tokens on password change', async () => {
    const user = await createUser({
      email: 'profile@example.com',
      password: 'Password123!',
    });

    const agent = request.agent(app);
    const login = await agent
      .post('/api/v1/auth/login')
      .send({ email: 'profile@example.com', password: 'Password123!' });

    const updated = await agent
      .patch('/api/v1/auth/me')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`)
      .send({
        name: 'Updated Name',
        interests: ['Reading'],
        password: 'NewPassword123!',
      });

    expect(updated.status).toBe(200);
    expect(updated.body.data.user.name).toBe('Updated Name');
    expect(updated.body.data.user.interests).toEqual(['reading']);
    expect(updated.body.data.sessionInvalidated).toBe(true);
    expect(
      await RefreshToken.countDocuments({ user: user._id, revokedAt: null }),
    ).toBe(0);

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
