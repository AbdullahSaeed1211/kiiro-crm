/** The people a task view can be narrowed to, as select options in name order. */
export function assigneeOptions(people: ReadonlyMap<string, string>): { value: string; label: string }[] {
  return [...people].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label))
}
