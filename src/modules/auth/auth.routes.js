import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requireCsrf } from '../../middleware/csrf.js';
import { authLimiter, sessionLimiter } from '../../middleware/rateLimiter.js';
import { validate } from '../../middleware/validate.js';
import {
  csrf,
  login,
  logout,
  me,
  refresh,
  register,
  updateMe,
} from './auth.controller.js';
import { loginSchema, registerSchema, updateMeSchema } from './auth.schemas.js';

const router = Router();

router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.get('/csrf', sessionLimiter, csrf);
router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh', sessionLimiter, requireCsrf, refresh);
router.post('/logout', sessionLimiter, requireCsrf, logout);
router.get('/me', authenticate, me);
router.patch('/me', authenticate, validate(updateMeSchema), updateMe);

export default router;
