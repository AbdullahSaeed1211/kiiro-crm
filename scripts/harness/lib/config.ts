import { paths, readText } from './repo.ts'
import { isRecord } from './schema.ts'
import { parseYaml } from './yaml.ts'

/** The parts of `harness/config.yaml` the scripts read. */
export interface HarnessConfig {
  severeClasses: string[]
  ordinaryInMilestone: number
  ordinaryCumulative: number
  gateClassMap: Record<string, string>
}

function section(value: unknown, key: string): Record<string, unknown> {
  const child = isRecord(value) ? value[key] : undefined
  if (!isRecord(child)) throw new Error(`harness/config.yaml: "${key}" must be a map`)
  return child
}

function integer(map: Record<string, unknown>, key: string): number {
  const value = map[key]
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(`harness/config.yaml: "${key}" must be an integer`)
  }
  return value
}

function stringList(map: Record<string, unknown>, key: string): string[] {
  const value = map[key]
  if (!Array.isArray(value) || !value.every((v) => typeof v === 'string')) {
    throw new Error(`harness/config.yaml: "${key}" must be a list of strings`)
  }
  return value
}

/** Parses config text into a typed config; throws on missing or mistyped keys. */
export function parseConfig(text: string): HarnessConfig {
  const doc = parseYaml(text)
  const promotion = section(doc, 'promotion')
  const gateClassMap: Record<string, string> = {}
  for (const [gate, cls] of Object.entries(section(doc, 'gateClassMap'))) {
    if (typeof cls !== 'string') throw new Error(`harness/config.yaml: gateClassMap.${gate} must be a string`)
    gateClassMap[gate] = cls
  }
  return {
    severeClasses: stringList(promotion, 'severeClasses'),
    ordinaryInMilestone: integer(promotion, 'ordinaryInMilestone'),
    ordinaryCumulative: integer(promotion, 'ordinaryCumulative'),
    gateClassMap,
  }
}

export function loadConfig(root: string): HarnessConfig {
  return parseConfig(readText(paths.config(root)))
}
