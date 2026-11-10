import { Post } from '../../models/Post.js';

export async function createPost(authorId, data) {
  return Post.create({ ...data, author: authorId });
}
