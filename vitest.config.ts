import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['packages/**/test/**/*.test.ts', 'scripts/test/**/*.test.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**', 'packages/modules/*/src/**', 'packages/adapters/*/src/**', 'scripts/**/*.ts'],
      exclude: ['packages/ui/src/components/ui/**', 'scripts/test/**', 'scripts/fixtures/**'],
    },
  },
})
