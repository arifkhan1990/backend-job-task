import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { app } from '../src/app.js';
import { User } from '../src/models/User.js';
import { authHeader, createUser } from './helpers.js';

const createPost = (token, overrides = {}) =>
  request(app)
    .post('/api/v1/posts')
    .set('Authorization', token)
    .send({ title: 'Post', content: 'Body', ...overrides });

describe('posts', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates posts for the authenticated user', async () => {
    const user = await createUser();

    const res = await createPost(authHeader(user), {
      title: 'My post',
      content: 'Hello world',
    });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ title: 'My post', content: 'Hello world' });
    expect(res.body.data.author).toBe(user.id);
  });

  it('returns a public paginated list of a user posts with one $lookup', async () => {
    const alice = await createUser({ name: 'Alice' });
    const bob = await createUser({ name: 'Bob' });

    await createPost(authHeader(alice), { title: 'First' });
    await createPost(authHeader(alice), { title: 'Second' });
    await createPost(authHeader(bob), { title: 'Bob post' });

    const spy = vi.spyOn(User, 'aggregate');

    const res = await request(app).get(
      `/api/v1/users/${alice.id}/posts?page=1&limit=1`,
    );

    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledTimes(1);

    const pipeline = spy.mock.calls[0][0];
    expect(pipeline.filter((stage) => '$lookup' in stage)).toHaveLength(1);
    expect(res.body.data.user).toMatchObject({ _id: alice.id, name: 'Alice' });
    expect(res.body.data.posts).toHaveLength(1);
    expect(res.body.data.posts[0].title).toBe('Second');
    expect(res.body.meta).toMatchObject({ page: 1, limit: 1, total: 2, pages: 2 });
  });

  it('returns 404 for an unknown user and 400 for bad ids', async () => {
    const notFound = await request(app).get(
      '/api/v1/users/64b7f9c2f1a2b3c4d5e6f7a8/posts',
    );
    expect(notFound.status).toBe(404);

    const bad = await request(app).get('/api/v1/users/nope/posts');
    expect(bad.status).toBe(400);
  });

  it('requires auth to create a post but not to read posts', async () => {
    const user = await createUser();

    const unauthorized = await request(app)
      .post('/api/v1/posts')
      .send({ title: 'No', content: 'Auth' });
    expect(unauthorized.status).toBe(401);

    await createPost(authHeader(user));

    const publicRead = await request(app).get(`/api/v1/users/${user.id}/posts`);
    expect(publicRead.status).toBe(200);
    expect(publicRead.body.data.posts).toHaveLength(1);
  });
});
