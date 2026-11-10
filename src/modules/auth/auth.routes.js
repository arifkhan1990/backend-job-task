import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authLimiter } from '../../middleware/rateLimiter.js';
import { validate } from '../../middleware/validate.js';
import { login, me, register, updateMe } from './auth.controller.js';
import { loginSchema, registerSchema, updateMeSchema } from './auth.schemas.js';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.get('/me', authenticate, me);
router.patch('/me', authenticate, validate(updateMeSchema), updateMe);

export default router;
