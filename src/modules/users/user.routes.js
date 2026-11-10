import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import {
  bulkRemove,
  create,
  getOne,
  getUserPosts,
  groupedByInterests,
  list,
  remove,
  update,
} from './user.controller.js';
import {
  bulkDeleteUsersSchema,
  createUserSchema,
  groupedInterestsQuerySchema,
  listUsersQuerySchema,
  updateUserSchema,
  userIdParamSchema,
  userPostsQuerySchema,
} from './user.schemas.js';

const router = Router();

// Public: posts are visible to everyone.
router.get(
  '/:id/posts',
  validate(userIdParamSchema, 'params'),
  validate(userPostsQuerySchema, 'query'),
  getUserPosts,
);

// Must be declared before /:id so the literal path is not treated as an id.
router.get(
  '/grouped-by-interests',
  authenticate,
  authorize('admin'),
  validate(groupedInterestsQuerySchema, 'query'),
  groupedByInterests,
);

router.get('/', authenticate, authorize('admin'), validate(listUsersQuerySchema, 'query'), list);
router.post('/', authenticate, authorize('admin'), validate(createUserSchema), create);
router.post(
  '/bulk-delete',
  authenticate,
  authorize('admin'),
  validate(bulkDeleteUsersSchema),
  bulkRemove,
);

router.get('/:id', authenticate, authorize('admin'), validate(userIdParamSchema, 'params'), getOne);
router.patch(
  '/:id',
  authenticate,
  authorize('admin'),
  validate(userIdParamSchema, 'params'),
  validate(updateUserSchema),
  update,
);
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  validate(userIdParamSchema, 'params'),
  remove,
);

export default router;
