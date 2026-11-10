import { connectDB, disconnectDB } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { User } from '../src/models/User.js';

async function seed() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Administrator';

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required');
  }

  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters');
  }

  await connectDB(env.mongoUri);

  const existing = await User.findOne({ email });

  if (existing) {
    existing.role = 'admin';

    if (process.env.ADMIN_RESET_PASSWORD === 'true') {
      existing.password = password;
    }

    await existing.save();
    console.log(`Admin user updated: ${email}`);
  } else {
    await User.create({ name, email, password, role: 'admin', interests: [] });
    console.log(`Admin user created: ${email}`);
  }
}

seed()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDB();
  });
