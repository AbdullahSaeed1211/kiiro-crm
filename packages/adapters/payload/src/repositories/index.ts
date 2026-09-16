/** Payload Local API repositories implementing platform, module and Cloudflare adapter ports. */
export { createCrmRepository, listCrmPage, type CrmPageQuery, type CrmPageResult } from './crm'
export { createDueItemSource } from './due-item-source'
export { createEmailMessageSink } from './email-message-sink'
export { createInboundMailSink } from './mail-inbound'
export { createMailIntakePort } from './mail-intake'
export { createMailStore } from './mail-store'
export { createNotificationStore } from './notification-store'
export { createTaskRepository, listTaskPage, type TaskPageQuery, type TaskPageResult } from './task-repository'
