// `.open-next/worker.js` exists only after `opennextjs-cloudflare build`; this declares the part `worker.ts` uses.
// OpenNext reads its own bindings, so the handler accepts any environment.
declare module '*/.open-next/worker.js' {
  const openNext: { fetch: ExportedHandlerFetchHandler }
  export default openNext
}
