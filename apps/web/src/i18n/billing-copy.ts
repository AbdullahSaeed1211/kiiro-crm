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
  readonly edit: string
  readonly print: string
  readonly back: string
  readonly fromQuote: string
  readonly saveFailed: string
  readonly actions: Readonly<Record<string, string>>
  readonly makeInvoice: string
  readonly lineTotal: string
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
  },
}
