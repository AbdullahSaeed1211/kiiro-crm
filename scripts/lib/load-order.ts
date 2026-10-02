const byName = (a: string, b: string): number => a.localeCompare(b)

/** Every table reachable from `start` by following foreign keys. */
function reachable(graph: ReadonlyMap<string, ReadonlySet<string>>, start: string): Set<string> {
  const seen = new Set<string>()
  const pending = [...(graph.get(start) ?? [])]
  for (let next = pending.pop(); next !== undefined; next = pending.pop()) {
    if (seen.has(next)) continue
    seen.add(next)
    pending.push(...(graph.get(next) ?? []))
  }
  return seen
}

/** Tables that point at each other, directly or through others, form one group. */
function cycleGroups(graph: ReadonlyMap<string, ReadonlySet<string>>): string[][] {
  const reach = new Map([...graph.keys()].map((table) => [table, reachable(graph, table)]))
  const placed = new Set<string>()
  const groups: string[][] = []
  for (const table of [...graph.keys()].toSorted(byName)) {
    if (placed.has(table)) continue
    const group = [...graph.keys()]
      .filter(
        (other) => other === table || (reach.get(table)?.has(other) === true && reach.get(other)?.has(table) === true),
      )
      .toSorted(byName)
    for (const member of group) placed.add(member)
    groups.push(group)
  }
  return groups
}

/** Groups of tables in load order: a table comes after the tables it points at; tables that point at each other share a group. */
export function loadGroups(graph: ReadonlyMap<string, ReadonlySet<string>>): string[][] {
  const pending = cycleGroups(graph)
  const loaded = new Set<string>()
  const ordered: string[][] = []
  while (pending.length > 0) {
    const ready = pending.findIndex((group) =>
      group.every((table) => [...(graph.get(table) ?? [])].every((dep) => group.includes(dep) || loaded.has(dep))),
    )
    const [group] = pending.splice(Math.max(ready, 0), 1)
    if (group === undefined) break
    for (const table of group) loaded.add(table)
    ordered.push(group)
  }
  return ordered
}
