import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { create, getOne, list, remove, update } from './note.controller.js';
import {
  createNoteSchema,
  listNotesQuerySchema,
  noteIdParamSchema,
  updateNoteSchema,
} from './note.schemas.js';

const router = Router();

router.use(authenticate);

router
  .route('/')
  .get(validate(listNotesQuerySchema, 'query'), list)
  .post(validate(createNoteSchema), create);

router.get('/:id', validate(noteIdParamSchema, 'params'), getOne);
router.patch('/:id', validate(noteIdParamSchema, 'params'), validate(updateNoteSchema), update);
router.delete('/:id', validate(noteIdParamSchema, 'params'), remove);

export default router;
