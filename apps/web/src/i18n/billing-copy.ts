export interface BillingCopy {
  readonly title: string
  readonly description: string
  readonly all: string
  readonly quotes: string
  readonly invoices: string
  readonly newQuote: string
  readonly newInvoice: string
  readonly number: string
  readonly company: string
  readonly status: string
  readonly total: string
  readonly dueInvoice: string
  readonly dueQuote: string
  readonly nothing: string
  readonly previous: string
  readonly next: string
  readonly states: Readonly<Record<string, string>>
  readonly chooseCompany: string
  readonly currency: string
  readonly lines: string
  readonly itemDescription: string
  readonly quantity: string
  readonly unitPrice: string
  readonly taxPercent: string
  readonly addLine: string
  readonly removeLine: string
  readonly note: string
  readonly save: string
  readonly saving: string
  readonly subtotal: string
  readonly tax: string
  /** Why Save is unavailable until a company is chosen. */
  readonly needCompany: string
  readonly newQuoteHint: string
  readonly newInvoiceHint: string
  readonly edit: string
  readonly print: string
  readonly back: string
  readonly fromQuote: string
  readonly saveFailed: string
  readonly actions: Readonly<Record<string, string>>
  readonly makeInvoice: string
  readonly lineTotal: string
  readonly emailButton: string
  readonly emailTo: string
  readonly emailSubject: string
  readonly emailMessage: string
  readonly emailSend: string
  readonly emailSending: string
  readonly emailCancel: string
  readonly emailSent: string
  readonly emailBadAddress: string
  readonly emailNeedAll: string
  readonly emailSendFailed: string
  readonly emailStatusFailed: string
  readonly emailSubjectQuote: string
  readonly emailSubjectInvoice: string
  readonly emailIntroQuote: string
  readonly emailIntroInvoice: string
  readonly emailGreeting: string
  readonly emailLine: string
  readonly emailClosing: string
}

export const BILLING_COPY: Readonly<Record<'en' | 'es', BillingCopy>> = {
  en: {
    title: 'Quotes and invoices',
    description:
      'Make a quote, send it, and turn an accepted quote into an invoice. Only owners and managers see this page.',
    all: 'All',
    quotes: 'Quotes',
    invoices: 'Invoices',
    newQuote: 'New quote',
    newInvoice: 'New invoice',
    number: 'Number',
    company: 'Company',
    status: 'Status',
    total: 'Total',
    dueInvoice: 'Due date',
    dueQuote: 'Valid until',
    nothing: 'Nothing here yet.',
    previous: 'Previous',
    next: 'Next',
    states: {
      draft: 'Draft',
      sent: 'Sent',
      accepted: 'Accepted',
      declined: 'Declined',
      paid: 'Paid',
      void: 'Void',
      overdue: 'Overdue',
      expired: 'Expired',
    },
    chooseCompany: 'Choose a company',
    currency: 'Currency',
    lines: 'Items',
    itemDescription: 'Item',
    quantity: 'Quantity',
    unitPrice: 'Price',
    taxPercent: 'Tax %',
    addLine: 'Add an item',
    removeLine: 'Remove item',
    note: 'Note',
    save: 'Save',
    saving: 'Saving…',
    subtotal: 'Subtotal',
    tax: 'Tax',
    needCompany: 'Choose a company to save this draft.',
    newQuoteHint: 'Choose a company and list what you are charging for. It saves as a draft you can review and send.',
    newInvoiceHint: 'Choose a company and list what you are billing. It saves as a draft you can review and send.',
    edit: 'Edit',
    print: 'Print or save as PDF',
    back: 'Back to the list',
    fromQuote: 'Made from {number}',
    saveFailed: 'The document was not saved. Check the items and try again.',
    actions: {
      sent: 'Mark as sent',
      accepted: 'Mark as accepted',
      declined: 'Mark as declined',
      paid: 'Mark as paid',
      void: 'Void',
    },
    makeInvoice: 'Make an invoice',
    lineTotal: 'Amount',
    emailButton: 'Email to client',
    emailTo: 'To',
    emailSubject: 'Subject',
    emailMessage: 'Message',
    emailSend: 'Send',
    emailSending: 'Sending…',
    emailCancel: 'Cancel',
    emailSent: 'Sent.',
    emailBadAddress: 'Enter one or more email addresses, such as name@example.com.',
    emailNeedAll: 'Add an address, a subject and a message.',
    emailSendFailed: 'The email could not be sent. Try again.',
    emailStatusFailed: 'The email was sent, but the status was not changed.',
    emailSubjectQuote: 'Quote {number}',
    emailSubjectInvoice: 'Invoice {number}',
    emailIntroQuote: 'Here is quote {number}.',
    emailIntroInvoice: 'Here is invoice {number}.',
    emailGreeting: 'Hello,',
    emailLine: '{description}: {quantity} x {price} = {amount}',
    emailClosing: 'Thank you.',
  },
  es: {
    title: 'Cotizaciones y facturas',
    description:
      'Haga una cotización, envíela y convierta una cotización aceptada en factura. Solo los propietarios y gerentes ven esta página.',
    all: 'Todo',
    quotes: 'Cotizaciones',
    invoices: 'Facturas',
    newQuote: 'Nueva cotización',
    newInvoice: 'Nueva factura',
    number: 'Número',
    company: 'Empresa',
    status: 'Estado',
    total: 'Total',
    dueInvoice: 'Fecha de pago',
    dueQuote: 'Válida hasta',
    nothing: 'Todavía no hay nada.',
    previous: 'Anterior',
    next: 'Siguiente',
    states: {
      draft: 'Borrador',
      sent: 'Enviada',
      accepted: 'Aceptada',
      declined: 'Rechazada',
      paid: 'Pagada',
      void: 'Anulada',
      overdue: 'Vencida',
      expired: 'Caducada',
    },
    chooseCompany: 'Elija una empresa',
    currency: 'Moneda',
    lines: 'Conceptos',
    itemDescription: 'Concepto',
    quantity: 'Cantidad',
    unitPrice: 'Precio',
    taxPercent: 'Impuesto %',
    addLine: 'Añadir un concepto',
    removeLine: 'Quitar concepto',
    note: 'Nota',
    save: 'Guardar',
    saving: 'Guardando…',
    subtotal: 'Subtotal',
    tax: 'Impuesto',
    needCompany: 'Elija una empresa para guardar este borrador.',
    newQuoteHint: 'Elija una empresa y detalle lo que cobra. Se guarda como borrador que puede revisar y enviar.',
    newInvoiceHint: 'Elija una empresa y detalle lo que factura. Se guarda como borrador que puede revisar y enviar.',
    edit: 'Editar',
    print: 'Imprimir o guardar como PDF',
    back: 'Volver a la lista',
    fromQuote: 'Creada desde {number}',
    saveFailed: 'No se guardó el documento. Revise los conceptos e inténtelo de nuevo.',
    actions: {
      sent: 'Marcar como enviada',
      accepted: 'Marcar como aceptada',
      declined: 'Marcar como rechazada',
      paid: 'Marcar como pagada',
      void: 'Anular',
    },
    makeInvoice: 'Crear una factura',
    lineTotal: 'Importe',
    emailButton: 'Enviar por correo al cliente',
    emailTo: 'Para',
    emailSubject: 'Asunto',
    emailMessage: 'Mensaje',
    emailSend: 'Enviar',
    emailSending: 'Enviando…',
    emailCancel: 'Cancelar',
    emailSent: 'Enviado.',
    emailBadAddress: 'Escriba una o más direcciones de correo, como nombre@ejemplo.com.',
    emailNeedAll: 'Añada una dirección, un asunto y un mensaje.',
    emailSendFailed: 'No se pudo enviar el correo. Inténtelo de nuevo.',
    emailStatusFailed: 'El correo se envió, pero no se cambió el estado.',
    emailSubjectQuote: 'Cotización {number}',
    emailSubjectInvoice: 'Factura {number}',
    emailIntroQuote: 'Le envío la cotización {number}.',
    emailIntroInvoice: 'Le envío la factura {number}.',
    emailGreeting: 'Hola,',
    emailLine: '{description}: {quantity} x {price} = {amount}',
    emailClosing: 'Gracias.',
  },
}
