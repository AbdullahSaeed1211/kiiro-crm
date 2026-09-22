export type ActionResult =
  { readonly ok: true; readonly data?: unknown } | { readonly ok: false; readonly error: string }
