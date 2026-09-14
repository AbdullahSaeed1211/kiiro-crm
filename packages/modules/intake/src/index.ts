/** Public API of @ops/module-intake. */
export {
  INTAKE_PAYLOAD_MAX_BYTES,
  intakeDedupeKey,
  isAllowedOrigin,
  normalizeOrigin,
  sha256Hex,
  validateIntakePayload,
} from './domain'
export { submitIntake } from './submit'
export type {
  IntakeAccepted,
  IntakeChannel,
  IntakeForm,
  IntakePayload,
  IntakeRateLimiter,
  IntakeResult,
  IntakeStore,
  IntakeSubmission,
  IntakeSubmissionStatus,
  IntakeTurnstileVerifier,
  SubmitIntakeDeps,
} from './contracts'
