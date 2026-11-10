import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { authHeader, createAdmin, createUser } from './helpers.js';

const createNote = (token, overrides = {}) =>
  request(app)
    .post('/api/v1/notes')
    .set('Authorization', token)
    .send({ title: 'Note', content: 'Body', ...overrides });

describe('notes', () => {
  it('creates a note owned by the authenticated user', async () => {
    const user = await createUser();

    const res = await createNote(authHeader(user), {
      title: 'First',
      content: 'Hello',
    });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ title: 'First', content: 'Hello' });
    expect(res.body.data.owner).toBe(user.id);
  });

  it('lists only the current user notes and paginates', async () => {
    const alice = await createUser();
    const bob = await createUser();

    await createNote(authHeader(alice), { title: 'A1' });
    await createNote(authHeader(alice), { title: 'A2' });
    await createNote(authHeader(bob), { title: 'B1' });

    const res = await request(app)
      .get('/api/v1/notes?page=1&limit=1')
      .set('Authorization', authHeader(alice));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('A2');
    expect(res.body.meta).toMatchObject({ page: 1, limit: 1, total: 2, pages: 2 });
    expect(res.body.data[0].owner.name).toBe(alice.name);
  });

  it('lets an admin see every note and filter by owner', async () => {
    const admin = await createAdmin();
    const alice = await createUser();
    const bob = await createUser();

    await createNote(authHeader(alice), { title: 'Alice note' });
    await createNote(authHeader(bob), { title: 'Bob note' });

    const all = await request(app)
      .get('/api/v1/notes')
      .set('Authorization', authHeader(admin));

    expect(all.status).toBe(200);
    expect(all.body.meta.total).toBe(2);

    const filtered = await request(app)
      .get(`/api/v1/notes?ownerId=${bob.id}`)
      .set('Authorization', authHeader(admin));

    expect(filtered.body.data).toHaveLength(1);
    expect(filtered.body.data[0].title).toBe('Bob note');
  });

  it('hides other users notes from regular users', async () => {
    const alice = await createUser();
    const bob = await createUser();
    const note = await createNote(authHeader(bob), { title: 'Private' });
    const noteId = note.body.data._id;

    const get = await request(app)
      .get(`/api/v1/notes/${noteId}`)
      .set('Authorization', authHeader(alice));
    expect(get.status).toBe(404);

    const update = await request(app)
      .patch(`/api/v1/notes/${noteId}`)
      .set('Authorization', authHeader(alice))
      .send({ title: 'Hacked' });
    expect(update.status).toBe(404);

    const remove = await request(app)
      .delete(`/api/v1/notes/${noteId}`)
      .set('Authorization', authHeader(alice));
    expect(remove.status).toBe(404);
  });

  it('lets an admin read but not edit another users note', async () => {
    const admin = await createAdmin();
    const user = await createUser();
    const note = await createNote(authHeader(user));
    const noteId = note.body.data._id;

    const get = await request(app)
      .get(`/api/v1/notes/${noteId}`)
      .set('Authorization', authHeader(admin));
    expect(get.status).toBe(200);

    const update = await request(app)
      .patch(`/api/v1/notes/${noteId}`)
      .set('Authorization', authHeader(admin))
      .send({ title: 'Changed' });
    expect(update.status).toBe(404);
  });

  it('updates and deletes the owner note', async () => {
    const user = await createUser();
    const created = await createNote(authHeader(user));
    const noteId = created.body.data._id;

    const updated = await request(app)
      .patch(`/api/v1/notes/${noteId}`)
      .set('Authorization', authHeader(user))
      .send({ title: 'Updated', content: 'New body' });

    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({
      title: 'Updated',
      content: 'New body',
    });

    const removed = await request(app)
      .delete(`/api/v1/notes/${noteId}`)
      .set('Authorization', authHeader(user));
    expect(removed.status).toBe(204);

    const missing = await request(app)
      .get(`/api/v1/notes/${noteId}`)
      .set('Authorization', authHeader(user));
    expect(missing.status).toBe(404);
  });

  it('validates note payloads and ids', async () => {
    const user = await createUser();

    const empty = await createNote(authHeader(user), { title: '', content: '' });
    expect(empty.status).toBe(400);

    const badId = await request(app)
      .get('/api/v1/notes/nope')
      .set('Authorization', authHeader(user));
    expect(badId.status).toBe(400);
  });
});
