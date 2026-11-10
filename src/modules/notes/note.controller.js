import { asyncHandler } from '../../utils/asyncHandler.js';
import * as noteService from './note.service.js';

export const create = asyncHandler(async (req, res) => {
  const note = await noteService.createNote(req.user.id, req.body);

  res.status(201).json({ data: note.toJSON() });
});

export const list = asyncHandler(async (req, res) => {
  const { notes, meta } = await noteService.listNotes({
    user: req.user,
    ...req.query,
  });

  res.json({ data: notes, meta });
});

export const getOne = asyncHandler(async (req, res) => {
  const note = await noteService.getNote(req.params.id, {
    id: req.user.id,
    role: req.user.role,
  });

  res.json({ data: note });
});

export const update = asyncHandler(async (req, res) => {
  const note = await noteService.updateNote(req.params.id, req.user.id, req.body);

  res.json({ data: note });
});

export const remove = asyncHandler(async (req, res) => {
  await noteService.deleteNote(req.params.id, req.user.id);

  res.status(204).send();
});
