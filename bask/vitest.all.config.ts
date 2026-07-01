import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    // .test.ts = pure-logic (node), .test.tsx = jsdom via per-file annotation
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'ios', 'android', 'extension'],
    setupFiles: ['./tests/_setup/capacitorMocks.ts', './tests/_setup/jsdomSetup.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'lib/database/**',
        'lib/services/notificationService.ts',
        'lib/sessionPersistence.ts',
        'hooks/useBaskSession.ts',
        'hooks/useDWindowNotifications.ts',
        'components/NotificationBootstrap.tsx',
      ],
      // Excluded by design: the SQLite connection is mocked away in tests;
      // devSeed/schema/localStorageMigration are web-preview seed data, DDL,
      // and a migration stub — not runtime logic the flows depend on.
      exclude: [
        'lib/database/connection.ts',
        'lib/database/devSeed.ts',
        'lib/database/schema.ts',
        'lib/database/localStorageMigration.ts',
      ],
      thresholds: {
        statements: 55,
        branches: 45,
        functions: 55,
        lines: 58,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
});
