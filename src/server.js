import { app } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { env } from './config/env.js';

async function start() {
  await connectDB(env.mongoUri);

  const server = app.listen(env.port, () => {
    console.log(`API listening on port ${env.port}`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);

    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
