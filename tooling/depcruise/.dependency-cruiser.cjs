const infra = 'node_modules/(payload|@payloadcms|next|react|react-dom|@opennextjs|wrangler)'
const escape = (path) => path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/**
 * Route files that still call Payload directly (code-health finding ARCH-02). Move each one behind a
 * `server/` query or action and delete it from this list. Never add to it.
 */
const PAYLOAD_IN_ROUTES_DEBT = [
  'apps/web/src/app/(app)/settings/general/page.tsx',
  'apps/web/src/app/(auth)/layout.tsx',
  'apps/web/src/app/api/v1/auth/change-password/route.ts',
  'apps/web/src/app/api/v1/brand/[asset]/route.ts',
  'apps/web/src/app/api/v1/comments/[commentId]/route.ts',
  'apps/web/src/app/api/v1/comments/route.ts',
  'apps/web/src/app/api/v1/email/[messageId]/read/route.ts',
  'apps/web/src/app/api/v1/email/send/route.ts',
  'apps/web/src/app/api/v1/files/[attachmentId]/route.ts',
  'apps/web/src/app/api/v1/files/route.ts',
  'apps/web/src/app/api/v1/health/route.ts',
  'apps/web/src/app/api/v1/import/template/[recordType]/route.ts',
  'apps/web/src/app/api/v1/intake/[formKey]/route.ts',
  'apps/web/src/app/api/v1/internal/cron/route.ts',
  'apps/web/src/app/api/v1/internal/email/inbound/route.ts',
  'apps/web/src/app/api/v1/internal/provision/email-probe/route.ts',
  'apps/web/src/app/api/v1/internal/provision/helpers.ts',
  'apps/web/src/app/api/v1/internal/provision/route.ts',
  'apps/web/src/app/api/v1/internal/provision/status/route.ts',
  'apps/web/src/app/api/v1/invitations/accept/route.ts',
  'apps/web/src/app/api/v1/notifications/[notificationId]/route.ts',
  'apps/web/src/app/api/v1/notifications/route.ts',
  'apps/web/src/app/api/v1/notifications/unread-count/route.ts',
  'apps/web/src/app/api/v1/search/route.ts',
]

module.exports = {
  forbidden: [
    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
    {
      name: 'kernel-isolated',
      severity: 'error',
      from: { path: '^packages/kernel' },
      to: { path: '^(packages/(platform|modules|adapters|ui|templates)|apps)' },
    },
    {
      name: 'platform-no-upward',
      severity: 'error',
      from: { path: '^packages/platform' },
      to: { path: `^(packages/(modules|adapters|ui|templates)|apps)|${infra}` },
    },
    {
      name: 'modules-no-cross',
      severity: 'error',
      from: { path: '^packages/modules/([^/]+)/' },
      to: { path: '^packages/modules/', pathNot: '^packages/modules/$1/' },
    },
    {
      name: 'modules-no-infra',
      severity: 'error',
      from: { path: '^packages/modules' },
      to: { path: `^(packages/(adapters|ui)|apps)|${infra}` },
    },
    {
      name: 'cf-adapter-no-payload',
      severity: 'error',
      from: { path: '^packages/adapters/cloudflare' },
      to: { path: '^(packages/(adapters/payload|ui)|apps)|node_modules/(payload|@payloadcms)' },
    },
    {
      name: 'ui-no-domain-runtime',
      severity: 'error',
      from: { path: '^packages/ui' },
      to: {
        path: '^packages/(platform|modules|adapters)|node_modules/(payload|@payloadcms)',
        dependencyTypesNot: ['type-only'],
      },
    },
    {
      name: 'routes-no-payload',
      comment:
        'Routes render presenters and call server/ actions and queries; only the Payload admin group touches Payload.',
      severity: 'error',
      from: {
        path: '^apps/web/src/app/',
        pathNot: ['^apps/web/src/app/\\(payload\\)/', ...PAYLOAD_IN_ROUTES_DEBT.map((file) => `^${escape(file)}$`)],
      },
      to: {
        path: '^packages/adapters/payload/|^apps/web/src/payload\\.config|^@payload-config$|node_modules/(payload|@payloadcms)',
      },
    },
    {
      name: 'no-dev-deps-in-runtime',
      severity: 'error',
      from: { path: '^(packages|apps)/.*/src', pathNot: '\\.test\\.ts$' },
      to: { dependencyTypes: ['npm-dev'], dependencyTypesNot: ['npm-peer', 'type-only'] },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '^apps/web/(\\.next|\\.open-next|cloudflare-env\\.d\\.ts)' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
  },
}
