/**
 * Single import point for the internal route handlers, so switching the routes to the tested handlers in
 * `@ops/adapter-cloudflare` is a one-line change once its barrel exports them.
 */
export { createLoggingInboundSink, handleCronRequest, handleInboundEmailRequest } from './unwired'
