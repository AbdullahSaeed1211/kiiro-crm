// Strings are matched first so comment markers and commas inside them (for example `https://`) survive.
const STRING = String.raw`("(?:[^"\\]|\\.)*")`
const COMMENTS = new RegExp(String.raw`${STRING}|\/\/[^\n]*|\/\*[\s\S]*?\*\/`, 'g')
const TRAILING_COMMAS = new RegExp(String.raw`${STRING}|,(?=\s*[}\]])`, 'g')

const keepStrings = (_match: string, quoted?: string): string => quoted ?? ''

/** Parses JSON that may contain `//` and block comments and trailing commas, as Prettier formats `.jsonc` files. */
export function parseJsonc(text: string): unknown {
  return JSON.parse(text.replace(COMMENTS, keepStrings).replace(TRAILING_COMMAS, keepStrings))
}
