import { postRepository } from './post.repository.js';

export async function createPost(authorId, data) {
  return postRepository.create({ ...data, author: authorId });
}
