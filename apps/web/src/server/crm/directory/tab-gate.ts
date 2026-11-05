/**
 * Record pages show one tab at a time. `gate(open)` returns a function that runs a tab's reads only when that tab is
 * the open one; every other tab gets its `empty` value and costs no query.
 */
export const gate =
  <Tab extends string>(open: Tab) =>
  <T>(tab: Tab, empty: T, load: () => Promise<T>): Promise<T> =>
    open === tab ? load() : Promise.resolve(empty)
