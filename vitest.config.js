import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    setupFiles: ['./tests/env.js', './tests/setup.js'],
    hookTimeout: 30000,
    testTimeout: 30000,
  },
});
