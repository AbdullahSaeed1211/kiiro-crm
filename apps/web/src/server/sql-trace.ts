/**
 * Development aid: with `OPS_LOG_SQL=1`, every statement the database receives is printed as `SQL <text>`, in order, so
 * a page's queries (and the ones it repeats) can be read straight from the server log. Without the flag the binding is
 * returned untouched, so production pays nothing.
 */
export function traceSql<T extends object>(binding: T): T {
  if (process.env.OPS_LOG_SQL !== '1') return binding
  return new Proxy(binding, {
    get(target, prop) {
      const value: unknown = Reflect.get(target, prop)
      if (typeof value !== 'function') return value
      if (prop !== 'prepare') return value.bind(target) as unknown
      return (sql: string): unknown => {
        console.log(`SQL ${String(Date.now() % 100000)} ${sql.slice(0, 160).replace(/\s+/g, ' ')}`)
        return value.call(target, sql)
      }
    },
  })
}
