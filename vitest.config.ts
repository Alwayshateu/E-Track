import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';

// Offline tests finish in milliseconds; the wider timeout ceiling exists for
// the RUN_LIVE_SUPABASE_TESTS suites, where each case is several sequential Supabase
// round trips and the default 5s is too tight under real network latency. Deliberately
// no env loading here — live suites read NEXT_PUBLIC_* from the ambient environment so
// the offline run keeps its clean, flag-free defaults.
export default defineConfig({
  // Mirror tsconfig's "@/*" -> "./src/*" so value imports/re-exports through the alias
  // resolve at test runtime the same way they do under tsc and Next.
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // Keep product tests discoverable while avoiding generated reports and browser profiles.
    exclude: [
      ...configDefaults.exclude,
      'paper_rewriting_output/**',
      'public/reports/**',
      'raw/**',
      'playwright-report/**',
      'test-results/**',
      '.playwright/**',
      '.cache/**',
      'edge-profile/**',
      'edge-*-profile/**',
      'playwright-profile*/**',
      'browser-profile*/**',
    ],
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
