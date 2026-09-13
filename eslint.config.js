import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'
import sonarjs from 'eslint-plugin-sonarjs'
import boundaries from 'eslint-plugin-boundaries'
import { gatedRules, tsxOverrides, boundaryElements, boundaryRules } from './tooling/eslint/rules.js'

export default defineConfig(
  {
    ignores: [
      '**/node_modules/**',
      '.claude/**',
      'scripts/fixtures/**',
      'harness/selftest/**',
      '**/.open-next/**',
      '**/.wrangler/**',
      '**/.next/**',
      '**/dist/**',
      '**/coverage/**',
      'apps/web/cloudflare-env.d.ts',
      'apps/web/postcss.config.mjs',
      'packages/ui/src/hooks/use-mobile.ts',
      'apps/web/src/payload-types.ts',
      'apps/web/src/migrations/**',
      'apps/web/src/app/(payload)/**',
      'packages/ui/src/components/ui/**',
      'tooling/**',
      'eslint.config.js',
    ],
  },
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  sonarjs.configs.recommended,
  { languageOptions: { parserOptions: { projectService: true } } },
  {
    plugins: { boundaries },
    settings: { 'boundaries/elements': boundaryElements },
    rules: { ...gatedRules, ...boundaryRules },
  },
  { files: ['**/*.tsx'], rules: tsxOverrides },
  {
    files: ['packages/adapters/payload/src/collections/**'],
    rules: { 'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }] },
  },
)
