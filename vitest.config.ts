import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'test/**/*.test.{ts,tsx}'],
    environment: 'node',
    setupFiles: ['test/setup.ts'],
    restoreMocks: true,
    // Ink styles text through chalk, which emits no ANSI codes without a color level.
    env: { FORCE_COLOR: '1' },
  },
});
