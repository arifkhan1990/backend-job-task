import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { create } from './post.controller.js';
import { createPostSchema } from './post.schemas.js';

const router = Router();

router.post('/', authenticate, validate(createPostSchema), create);

export default router;
