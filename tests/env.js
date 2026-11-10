process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters';
process.env.JWT_ISSUER = 'notes-api';
process.env.JWT_AUDIENCE = 'notes-client';
process.env.MONGODB_URI =
  process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/notes_api_test';
process.env.BCRYPT_ROUNDS = '4';
