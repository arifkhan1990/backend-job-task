import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { autoIndex: env.autoIndex });
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
