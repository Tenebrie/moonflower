import { resolve } from 'path'
import { defineConfig, UserConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    setupFiles: 'src/setupTests.ts',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@src': resolve(__dirname, './src'),
    },
  },
}) 