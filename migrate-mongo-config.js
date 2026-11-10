import 'dotenv/config';

export default {
  mongodb: {
    url: process.env.MONGODB_URI,
    options: {},
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'migrations',
  migrationFileExtension: '.js',
  useFileHash: false,
  moduleSystem: 'esm',
};
