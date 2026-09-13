const infra = 'node_modules/(payload|@payloadcms|next|react|react-dom|@opennextjs|wrangler)'

module.exports = {
  forbidden: [
    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
    { name: 'kernel-isolated', severity: 'error', from: { path: '^packages/kernel' }, to: { path: '^(packages/(platform|modules|adapters|ui|templates)|apps)' } },
    { name: 'platform-no-upward', severity: 'error', from: { path: '^packages/platform' }, to: { path: `^(packages/(modules|adapters|ui|templates)|apps)|${infra}` } },
    { name: 'modules-no-cross', severity: 'error', from: { path: '^packages/modules/([^/]+)/' }, to: { path: '^packages/modules/', pathNot: '^packages/modules/$1/' } },
    { name: 'modules-no-infra', severity: 'error', from: { path: '^packages/modules' }, to: { path: `^(packages/(adapters|ui)|apps)|${infra}` } },
    { name: 'cf-adapter-no-payload', severity: 'error', from: { path: '^packages/adapters/cloudflare' }, to: { path: '^(packages/(adapters/payload|ui)|apps)|node_modules/(payload|@payloadcms)' } },
    { name: 'ui-no-domain-runtime', severity: 'error', from: { path: '^packages/ui' }, to: { path: '^packages/(platform|modules|adapters)|node_modules/(payload|@payloadcms)', dependencyTypesNot: ['type-only'] } },
    { name: 'no-dev-deps-in-runtime', severity: 'error', from: { path: '^(packages|apps)/.*/src', pathNot: '\\.test\\.ts$' }, to: { dependencyTypes: ['npm-dev'] } },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(^apps/web/(\\.next|\\.open-next|cloudflare-env\\.d\\.ts)|/node_modules/)' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tooling/tsconfig/base.json' },
  },
}
