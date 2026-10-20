/** The people a task view can be narrowed to, as select options in name order. */
export function assigneeOptions(people: ReadonlyMap<string, string>): { value: string; label: string }[] {
  return [...people].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label))
}

/** The assignee from the address when it names someone who can be chosen; anything else is ignored, not filtered on. */
export function validAssignee(value: string | undefined, people: ReadonlyMap<string, string>): string {
  return value !== undefined && people.has(value) ? value : ''
}
