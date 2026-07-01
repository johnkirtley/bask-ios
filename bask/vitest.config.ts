import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Green gate = pure-logic only. Integration tests (persistence, notifications,
    // session loop, _setup) need the jsdom + Capacitor-mock setup loaded by
    // vitest.all.config.ts — run them via `npm run test:all` / `test:coverage`.
    exclude: [
      'node_modules',
      '.next',
      'ios',
      'android',
      'extension',
      'tests/triage/**',
      'tests/_setup/**',
      'tests/persistence/**',
      'tests/notifications/**',
      'tests/session/**',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
});
