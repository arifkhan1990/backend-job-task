import { afterAll, beforeAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Note } from '../src/models/Note.js';
import { Post } from '../src/models/Post.js';
import { User } from '../src/models/User.js';

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  await Promise.all([User.init(), Note.init(), Post.init()]);
});

beforeEach(async () => {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
});
