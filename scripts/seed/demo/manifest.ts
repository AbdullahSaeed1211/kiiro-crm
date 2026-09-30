import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { WEB_DIR } from '../local-env'

/** A document the demo created, so the purge can remove exactly those. */
export interface ManifestEntry {
  readonly collection: string
  readonly id: string
}

const PATH = join(WEB_DIR, '.wrangler', 'demo-seed-manifest.json')

export function readManifest(): ManifestEntry[] {
  try {
    const parsed: unknown = JSON.parse(readFileSync(PATH, 'utf8'))
    return Array.isArray(parsed) ? (parsed as ManifestEntry[]) : []
  } catch {
    return []
  }
}

export function writeManifest(entries: readonly ManifestEntry[]): void {
  mkdirSync(dirname(PATH), { recursive: true })
  writeFileSync(PATH, JSON.stringify(entries))
}

export function removeManifest(): void {
  rmSync(PATH, { force: true })
}
