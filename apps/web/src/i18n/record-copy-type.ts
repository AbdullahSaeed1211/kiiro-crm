/** Words and sentences shared by the record pages: contacts, organizations, leads and deals. */
export interface RecordCopy {
  // Tabs and the activity feed
  readonly tabNotes: string
  readonly tabActivity: string
  readonly tabTasks: string
  readonly tabFiles: string
  readonly tabEmail: string
  readonly tabOverview: string
  readonly noActivity: string
  readonly loadMore: string
  readonly systemActor: string
  // Details and meta
  readonly created: string
  readonly lastUpdated: string
  readonly owner: string
  readonly organization: string
  readonly organizationAndOwner: string
  readonly meta: string
  readonly record: string
  // Related records
  readonly projects: string
  readonly contacts: string
  readonly deals: string
  readonly leads: string
  readonly noProjectsLinked: string
  readonly noContactsLinked: string
  readonly noDealsLinked: string
  readonly noLeadsLinked: string
  readonly addProject: string
  readonly addContact: string
  // Page chrome
  readonly organizationsCrumb: string
  readonly contactsCrumb: string
  readonly contactLabel: string
  readonly organizationLabel: string
  readonly saveName: string
  readonly cancel: string
  // Linked tasks and files
  readonly linkedWork: string
  readonly noTasksYet: string
  readonly complete: string
  /** `{date}` is the due date. */
  readonly dueOn: string
  readonly privateFiles: string
  readonly uploadFile: string
  readonly uploading: string
  readonly noFilesYet: string
  readonly fileUploaded: string
  readonly uploadFailed: string
  readonly serverUnreachable: string
  // Email thread and composer
  readonly failed: string
  readonly queued: string
  readonly quarantined: string
  readonly from: string
  readonly to: string
  readonly unknownRecipient: string
  /** `{count}` is how many messages the thread holds. */
  readonly messageCount: string
  readonly received: string
  readonly sent: string
  readonly emailThreadHelp: string
  readonly noEmailYet: string
  readonly noEmailYetStart: string
  readonly noBody: string
  readonly markRead: string
  readonly attachments: string
  readonly sendingUnavailable: string
  readonly sendingUnavailableBody: string
  readonly newMessage: string
  readonly subject: string
  readonly writeMessage: string
  readonly attachFile: string
  readonly attachFailed: string
  readonly attachNoId: string
  readonly messageFieldsRequired: string
  /** `{recipient}` is the address the message goes to. */
  readonly confirmSend: string
  readonly messageLabel: string
  /** `{name}` is the file picked. */
  readonly attached: string
  readonly sendHint: string
  readonly send: string
  readonly sending: string
  readonly messageSent: string
  readonly sendFailed: string
  // Lead page
  /** `{date}` is the conversion date. */
  readonly convertedOn: string
  readonly openDeal: string
  readonly lost: string
  /** `{note}` is why it was lost. */
  readonly lostWithNote: string
  readonly responseOverdue: string
  readonly source: string
  readonly sourceAndNextAction: string
  readonly nextAction: string
  readonly updated: string
  readonly stageEntered: string
  readonly convert: string
  readonly markLost: string
  readonly breadcrumb: string
  readonly saveTitle: string
  readonly cancelTitle: string
  readonly stage: string
  readonly closedGroup: string
  readonly selectStage: string
  // Comments
  readonly addComment: string
  readonly writeUpdate: string
  readonly mentionHint: string
  readonly postComment: string
  readonly posting: string
  readonly commentAdded: string
  readonly commentFailed: string
  // Actions
  readonly email: string
  readonly call: string
  readonly newTask: string
  readonly edit: string
  /** `{name}` is the record. */
  readonly followUpWith: string
  readonly archive: string
  readonly archiving: string
  /** `{name}` is the record. */
  readonly archiveTitle: string
  readonly archiveBody: string
  readonly archiveFailed: string
}
