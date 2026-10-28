import { defineConfig } from 'vitest/config'

// Unit tests cover the pure forecast logic and the data loaders (against the mock scenarios), so they don't need
// the TanStack Start plugin from vite.config.ts.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/unit/setup.ts'],
  },
})
