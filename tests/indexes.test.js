import { describe, expect, it } from 'vitest';
import { Note } from '../src/models/Note.js';
import { Post } from '../src/models/Post.js';
import { User } from '../src/models/User.js';

async function customIndexKeys(model) {
  const indexes = await model.collection.indexes();
  return indexes
    .filter((index) => index.name !== '_id_')
    .map((index) => index.key);
}

describe('index strategy', () => {
  it('defines exactly the six indexes required by the task queries', async () => {
    const userIndexes = await customIndexKeys(User);
    expect(userIndexes).toHaveLength(3);
    expect(userIndexes).toEqual(
      expect.arrayContaining([
        { email: 1 },
        { createdAt: -1, _id: -1 },
        { interests: 1 },
      ]),
    );

    const noteIndexes = await customIndexKeys(Note);
    expect(noteIndexes).toHaveLength(2);
    expect(noteIndexes).toEqual(
      expect.arrayContaining([
        { owner: 1, createdAt: -1, _id: -1 },
        { createdAt: -1, _id: -1 },
      ]),
    );

    const postIndexes = await customIndexKeys(Post);
    expect(postIndexes).toHaveLength(1);
    expect(postIndexes).toEqual([{ author: 1, createdAt: -1, _id: -1 }]);

    expect(userIndexes.length + noteIndexes.length + postIndexes.length).toBe(6);
  });
});
