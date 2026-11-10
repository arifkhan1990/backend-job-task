import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { app } from '../src/app.js';
import { Note } from '../src/models/Note.js';
import { Post } from '../src/models/Post.js';
import { User } from '../src/models/User.js';
import { authHeader, createAdmin, createUser } from './helpers.js';

describe('admin user management', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists users with pagination for admins only', async () => {
    const admin = await createAdmin({ email: 'admin@example.com' });
    const first = await createUser({ name: 'First', email: 'first@example.com' });
    await createUser({ name: 'Second', email: 'second@example.com' });
    await createUser({ name: 'Third', email: 'third@example.com' });

    const forbidden = await request(app)
      .get('/api/v1/users')
      .set('Authorization', authHeader(first));
    expect(forbidden.status).toBe(403);

    const res = await request(app)
      .get('/api/v1/users?page=1&limit=2')
      .set('Authorization', authHeader(admin));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 2, total: 4, pages: 2 });

    const page2 = await request(app)
      .get('/api/v1/users?page=2&limit=2')
      .set('Authorization', authHeader(admin));

    expect(page2.body.data).toHaveLength(2);

    const ids = [...res.body.data, ...page2.body.data].map((user) => user._id);
    expect(new Set(ids).size).toBe(4);
    expect(ids).toContain(first.id);
  });

  it('creates, updates and deletes a user', async () => {
    const admin = await createAdmin();

    const created = await request(app)
      .post('/api/v1/users')
      .set('Authorization', authHeader(admin))
      .send({
        name: 'Managed',
        email: 'managed@example.com',
        password: 'Password123!',
        role: 'admin',
        interests: ['Chess'],
      });

    expect(created.status).toBe(201);
    expect(created.body.data.role).toBe('admin');

    const id = created.body.data._id;

    const updated = await request(app)
      .patch(`/api/v1/users/${id}`)
      .set('Authorization', authHeader(admin))
      .send({ name: 'Managed Updated', role: 'user', interests: ['Reading', 'chess'] });

    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({ name: 'Managed Updated', role: 'user' });
    expect(updated.body.data.interests).toEqual(['reading', 'chess']);

    const removed = await request(app)
      .delete(`/api/v1/users/${id}`)
      .set('Authorization', authHeader(admin));

    expect(removed.status).toBe(204);
    expect(await User.findById(id)).toBeNull();
  });

  it('cascades notes and posts when deleting a user', async () => {
    const admin = await createAdmin();
    const user = await createUser();

    await Note.create({ title: 'Note', content: 'Body', owner: user._id });
    await Post.create({ title: 'Post', content: 'Body', author: user._id });

    const res = await request(app)
      .delete(`/api/v1/users/${user.id}`)
      .set('Authorization', authHeader(admin));

    expect(res.status).toBe(204);
    expect(await Note.countDocuments({ owner: user._id })).toBe(0);
    expect(await Post.countDocuments({ author: user._id })).toBe(0);
  });

  it('prevents self-delete and self-role changes', async () => {
    const admin = await createAdmin();

    const deleteSelf = await request(app)
      .delete(`/api/v1/users/${admin.id}`)
      .set('Authorization', authHeader(admin));
    expect(deleteSelf.status).toBe(400);

    const demoteSelf = await request(app)
      .patch(`/api/v1/users/${admin.id}`)
      .set('Authorization', authHeader(admin))
      .send({ role: 'user' });
    expect(demoteSelf.status).toBe(400);
  });

  it('groups users by interests with a single aggregate call', async () => {
    const admin = await createAdmin();
    await createUser({ name: 'A', interests: ['chess', 'reading'] });
    await createUser({ name: 'B', interests: ['chess'] });
    await createUser({ name: 'C', interests: ['running'] });

    const spy = vi.spyOn(User, 'aggregate');

    const res = await request(app)
      .get('/api/v1/users/grouped-by-interests?page=1&limit=2')
      .set('Authorization', authHeader(admin));

    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledTimes(1);

    const pipeline = spy.mock.calls[0][0];
    expect(pipeline.some((stage) => '$group' in stage)).toBe(true);
    expect(pipeline.some((stage) => '$unwind' in stage)).toBe(true);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 2, total: 3, pages: 2 });
    expect(res.body.data).toHaveLength(2);

    const chess = res.body.data.find((group) => group.interest === 'chess');
    expect(chess).toMatchObject({ userCount: 2 });
    expect(chess.users.map((user) => user.name).sort()).toEqual(['A', 'B']);
  });

  it('filters grouped interests and rejects non-admins', async () => {
    const admin = await createAdmin();
    const user = await createUser({ interests: ['chess'] });
    await createUser({ interests: ['running'] });

    const forbidden = await request(app)
      .get('/api/v1/users/grouped-by-interests')
      .set('Authorization', authHeader(user));
    expect(forbidden.status).toBe(403);

    const res = await request(app)
      .get('/api/v1/users/grouped-by-interests?interest=chess')
      .set('Authorization', authHeader(admin));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].interest).toBe('chess');
  });

  it('validates ids and returns 404 for unknown users', async () => {
    const admin = await createAdmin();

    const invalid = await request(app)
      .get('/api/v1/users/not-an-id')
      .set('Authorization', authHeader(admin));
    expect(invalid.status).toBe(400);

    const missing = await request(app)
      .get('/api/v1/users/64b7f9c2f1a2b3c4d5e6f7a8')
      .set('Authorization', authHeader(admin));
    expect(missing.status).toBe(404);
  });
});
