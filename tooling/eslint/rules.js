/** Gated complexity and correctness rules (spec §6.2), shared by eslint.config.js. */
const lengthOptions = (max) => ['error', { max, skipBlankLines: true, skipComments: true }]

export const gatedRules = {
  complexity: ['error', 8],
  'sonarjs/cognitive-complexity': ['error', 10],
  'max-depth': ['error', 3],
  'max-params': ['error', 3],
  'max-lines-per-function': lengthOptions(40),
  'max-lines': lengthOptions(250),
  'max-nested-callbacks': ['error', 3],
  'max-statements': ['error', 15],
  'no-else-return': 'error',
  'no-nested-ternary': 'error',
  eqeqeq: 'error',
  'prefer-const': 'error',
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-non-null-assertion': 'error',
  '@typescript-eslint/switch-exhaustiveness-check': 'error',
  '@typescript-eslint/no-floating-promises': 'error',
  '@typescript-eslint/consistent-type-imports': 'error',
  'sonarjs/no-duplicate-string': ['error', { threshold: 4 }],
  'sonarjs/no-identical-functions': 'error',
}

export const tsxOverrides = {
  'max-params': ['error', 2],
  'max-lines-per-function': lengthOptions(80),
  'max-statements': ['error', 20],
}

export const boundaryElements = [
  { type: 'kernel', pattern: 'packages/kernel' },
  { type: 'platform', pattern: 'packages/platform' },
  { type: 'module', pattern: 'packages/modules/*', capture: ['module'] },
  { type: 'adapter', pattern: 'packages/adapters/*', capture: ['adapter'] },
  { type: 'ui', pattern: 'packages/ui' },
  { type: 'templates', pattern: 'packages/templates' },
  { type: 'app', pattern: 'apps/*' },
]

const allow = (from, to) => ({ from: { type: from }, allow: { to: { type: to } } })

export const boundaryRules = {
  'boundaries/dependencies': [
    'error',
    {
      default: 'disallow',
      rules: [
        allow('platform', 'kernel'),
        allow('module', ['kernel', 'platform']),
        allow('adapter', ['kernel', 'platform', 'module']),
        allow('ui', 'kernel'),
        allow('templates', ['kernel', 'platform']),
        allow('app', ['kernel', 'platform', 'module', 'adapter', 'ui', 'templates']),
      ],
    },
  ],
}
