import { asyncHandler } from '../../utils/asyncHandler.js';
import * as userService from './user.service.js';

export const list = asyncHandler(async (req, res) => {
  const { users, meta } = await userService.listUsers(req.query);

  res.json({ data: users, meta });
});

export const create = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body, req.user.id);

  res.status(201).json({ data: user.toJSON() });
});

export const getOne = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);

  res.json({ data: user.toJSON() });
});

export const update = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body, req.user.id);

  res.json({ data: user.toJSON() });
});

export const remove = asyncHandler(async (req, res) => {
  await userService.deleteUser(req.params.id, req.user.id);

  res.status(204).send();
});

export const groupedByInterests = asyncHandler(async (req, res) => {
  const { groups, meta } = await userService.groupUsersByInterests(req.query);

  res.json({ data: groups, meta });
});

export const getUserPosts = asyncHandler(async (req, res) => {
  const { user, posts, meta } = await userService.getUserPosts(req.params.id, req.query);

  res.json({ data: { user, posts }, meta });
});
