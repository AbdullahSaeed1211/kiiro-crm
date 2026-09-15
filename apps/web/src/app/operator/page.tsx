import { OperatorPreviewForm } from './preview-form'

export const dynamic = 'force-dynamic'

export default function OperatorPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-8">
      <header className="border-b pb-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Control surface</p>
        <h1 className="mt-1 text-2xl font-semibold">Tenant provisioning</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Preview and approve isolated tenant runs. Remote execution stays disabled until the operator environment
          explicitly enables it.
        </p>
      </header>
      <OperatorPreviewForm />
    </main>
  )
}
