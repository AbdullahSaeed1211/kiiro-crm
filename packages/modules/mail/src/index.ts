/** Public API of @ops/module-mail. */
export { recordAddressLocal, receiveInboundEmail, releaseQuarantined, sendSystemEmail } from './domain'
export { parseEmail } from './parser'
export { createRecordAddressing, resolveInboundDestination } from './addressing'
export { escapeHtml, renderTemplate } from './templates'
export type {
  EmailMessage,
  InboundDestination,
  InboundIntakePort,
  MailRecordRef,
  MailStore,
  ParsedAttachment,
  ParsedEmail,
  ReceiveInboundDeps,
  ReceiveInboundResult,
  RecordAddressing,
  RecordAddressingOptions,
  RenderedEmail,
  SystemEmailInput,
  TemplateName,
  MailTransport,
  MailTransportMessage,
} from './contracts'
