import { Post } from '../../models/Post.js';

export const postRepository = {
  async create(data, { session } = {}) {
    if (session) {
      const [post] = await Post.create([data], { session });
      return post;
    }

    return Post.create(data);
  },

  deleteByAuthor(authorId, { session } = {}) {
    const filter = { author: authorId };
    return session ? Post.deleteMany(filter, { session }) : Post.deleteMany(filter);
  },

  deleteManyByIds(ids, { session } = {}) {
    const filter = { _id: { $in: ids } };
    return session ? Post.deleteMany(filter, { session }) : Post.deleteMany(filter);
  },
};
