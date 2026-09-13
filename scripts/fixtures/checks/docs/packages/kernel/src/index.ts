/** Returns one; documented, so it passes. */
export function documented(): number {
  return 1
}

export function undocumented(): number {
  return 2
}

// A line comment is not TSDoc.
export const arrow = (): number => 3

/* A block comment without the TSDoc marker is not TSDoc either. */
export async function plain(): Promise<number> {
  return Promise.resolve(4)
}
