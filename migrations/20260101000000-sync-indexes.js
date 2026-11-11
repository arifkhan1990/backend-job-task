import mongoose from 'mongoose';
import { Note } from '../src/models/Note.js';
import { Post } from '../src/models/Post.js';
import { User } from '../src/models/User.js';

const models = [User, Note, Post];

async function withModels(work) {
  await mongoose.connect(process.env.MONGODB_URI);

  try {
    await work();
  } finally {
    await mongoose.disconnect();
  }
}

export async function up() {
  await withModels(async () => {
    // Models remain the single source of truth for index definitions.
    await Promise.all(models.map((model) => model.syncIndexes()));
  });
}

export async function down() {
  await withModels(async () => {
    // Reverting drops the model-defined indexes. The built-in _id index stays.
    await Promise.all(models.map((model) => model.collection.dropIndexes()));
  });
}
