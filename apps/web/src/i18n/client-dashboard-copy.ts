export interface ClientDashboardCopy {
  readonly tab: string
  readonly open: string
  readonly overdue: string
  readonly dueSoon: string
  readonly done: string
  readonly area: string
  readonly nextDue: string
  readonly nothingOpen: string
  readonly billing: string
  readonly noOrganization: string
  readonly invoicesOpen: string
  readonly invoicesOverdue: string
  readonly invoicesPaid: string
  readonly quotesOut: string
  readonly openBilling: string
  readonly areas: Readonly<Record<string, string>>
}

export const CLIENT_DASHBOARD_COPY: Readonly<Record<'en' | 'es', ClientDashboardCopy>> = {
  en: {
    tab: 'Dashboard',
    open: 'Open tasks',
    overdue: 'Overdue',
    dueSoon: 'Due in 7 days',
    done: 'Done',
    area: 'Area',
    nextDue: 'Next due',
    nothingOpen: 'No open tasks.',
    billing: 'Billing',
    noOrganization: 'Link this project to a company to see its billing here.',
    invoicesOpen: 'Invoices sent',
    invoicesOverdue: 'Invoices overdue',
    invoicesPaid: 'Invoices paid',
    quotesOut: 'Quotes sent',
    openBilling: 'Open billing',
    areas: {
      seo: 'SEO',
      gbp: 'Google Business Profile',
      socialMedia: 'Social media',
      instagram: 'Instagram',
      facebook: 'Facebook',
      youtube: 'YouTube',
      pinterest: 'Pinterest',
      tiktok: 'TikTok',
      blog: 'Blog',
      reports: 'Reports',
      collections: 'Collections',
      other: 'Other agency work',
    },
  },
  es: {
    tab: 'Panel',
    open: 'Tareas abiertas',
    overdue: 'Vencidas',
    dueSoon: 'Vencen en 7 días',
    done: 'Hechas',
    area: 'Área',
    nextDue: 'Próximo vencimiento',
    nothingOpen: 'No hay tareas abiertas.',
    billing: 'Facturación',
    noOrganization: 'Vincule este proyecto a una empresa para ver aquí su facturación.',
    invoicesOpen: 'Facturas enviadas',
    invoicesOverdue: 'Facturas vencidas',
    invoicesPaid: 'Facturas pagadas',
    quotesOut: 'Cotizaciones enviadas',
    openBilling: 'Abrir facturación',
    areas: {
      seo: 'SEO',
      gbp: 'Perfil de Empresa de Google',
      socialMedia: 'Redes sociales',
      instagram: 'Instagram',
      facebook: 'Facebook',
      youtube: 'YouTube',
      pinterest: 'Pinterest',
      tiktok: 'TikTok',
      blog: 'Blog',
      reports: 'Informes',
      collections: 'Cobros',
      other: 'Otro trabajo de agencia',
    },
  },
}
