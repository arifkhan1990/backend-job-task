import { asyncHandler } from '../../utils/asyncHandler.js';
import * as postService from './post.service.js';

export const create = asyncHandler(async (req, res) => {
  const post = await postService.createPost(req.user.id, req.body);

  res.status(201).json({ data: post.toJSON() });
});
