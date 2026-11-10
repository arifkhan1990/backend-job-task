import { describe, expect, it } from 'vitest';
import { Note } from '../src/models/Note.js';
import { Post } from '../src/models/Post.js';
import { RefreshToken } from '../src/models/RefreshToken.js';
import { User } from '../src/models/User.js';

async function customIndexKeys(model) {
  const indexes = await model.collection.indexes();
  return indexes
    .filter((index) => index.name !== '_id_')
    .map((index) => index.key);
}

describe('index strategy', () => {
  it('defines exactly the indexes required by the queries', async () => {
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

    const refreshTokenIndexes = await customIndexKeys(RefreshToken);
    expect(refreshTokenIndexes).toHaveLength(3);
    expect(refreshTokenIndexes).toEqual(
      expect.arrayContaining([
        { tokenHash: 1 },
        { user: 1, createdAt: -1 },
        { expiresAt: 1 },
      ]),
    );

    const ttlIndex = (await RefreshToken.collection.indexes()).find(
      (index) => index.key.expiresAt === 1,
    );
    expect(ttlIndex.expireAfterSeconds).toBe(0);
  });
});
