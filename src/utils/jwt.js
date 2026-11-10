import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const signOptions = {
  expiresIn: env.jwtExpiresIn,
  issuer: env.jwtIssuer,
  audience: env.jwtAudience,
  algorithm: 'HS256',
};

export function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, env.jwtSecret, signOptions);
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret, {
    issuer: env.jwtIssuer,
    audience: env.jwtAudience,
    algorithms: ['HS256'],
  });
}
