import type { CommandRunner } from './commands'

export interface ProvisionState {
  d1: boolean
  r2: boolean
  wrangler: boolean
  secrets: boolean
  migration: boolean
  deployment: boolean
  seed: boolean
  senderStatus: boolean
  routerSecrets: boolean
  smoke: boolean
}

export interface ProvisionStep {
  readonly key: keyof ProvisionState | 'validate' | 'checklist'
  readonly label: string
  readonly command?: string
}

export interface ProvisionHttpClient {
  post: (url: string, body: unknown, secret: string) => Promise<{ ok: boolean; status: number }>
  get: (url: string, secret: string) => Promise<{ ok: boolean; status: number; body?: unknown }>
}

export interface ProvisionDependencies {
  readonly run: CommandRunner
  readonly state?: Partial<ProvisionState>
  readonly check?: (step: keyof ProvisionState) => Promise<boolean>
  readonly root?: string
  readonly turnstileSecret?: string
  readonly writeD1Id?: (id: string) => void
  readonly print?: (line: string) => void
  readonly http?: ProvisionHttpClient
  readonly internalSecret?: string
}
