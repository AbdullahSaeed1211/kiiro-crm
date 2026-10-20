import type { Locale } from './locale'

export interface CrmListControlsCopy {
  readonly searchLeads: string
  readonly owner: string
  readonly anyOwner: string
  readonly myLeads: string
  readonly unassigned: string
  readonly source: string
  readonly anySource: string
  readonly searchDeals: string
  readonly dealStage: string
  readonly allStages: string
  readonly openDeals: string
  readonly searchProjects: string
  readonly projectStage: string
  readonly projectName: string
  readonly stage: string
  readonly targetEnd: string
  readonly projectNameAsc: string
  readonly projectNameDesc: string
  readonly targetEndSoonest: string
  readonly progress: string
  readonly members: string
  readonly done: string
  readonly teammate: string
}

export const CRM_LIST_CONTROLS_COPY: Readonly<Record<Locale, CrmListControlsCopy>> = {
  en: {
    searchLeads: 'Search leads',
    owner: 'Owner',
    anyOwner: 'Any owner',
    myLeads: 'My leads',
    unassigned: 'Unassigned',
    source: 'Source',
    anySource: 'Any source',
    searchDeals: 'Search deals',
    dealStage: 'Filter by stage',
    allStages: 'All stages',
    openDeals: 'Open deals',
    searchProjects: 'Search projects',
    projectStage: 'Filter by stage',
    projectName: 'Name',
    stage: 'Stage',
    targetEnd: 'Target end',
    projectNameAsc: 'Name: A to Z',
    projectNameDesc: 'Name: Z to A',
    targetEndSoonest: 'Target end: soonest',
    progress: 'Progress',
    members: 'Members',
    done: 'done',
    teammate: 'Teammate',
  },
  es: {
    searchLeads: 'Buscar prospectos',
    owner: 'Responsable',
    anyOwner: 'Cualquier responsable',
    myLeads: 'Mis prospectos',
    unassigned: 'Sin asignar',
    source: 'Origen',
    anySource: 'Cualquier origen',
    searchDeals: 'Buscar oportunidades',
    dealStage: 'Filtrar por etapa',
    allStages: 'Todas las etapas',
    openDeals: 'Oportunidades abiertas',
    searchProjects: 'Buscar proyectos',
    projectStage: 'Filtrar por etapa',
    projectName: 'Nombre',
    stage: 'Etapa',
    targetEnd: 'Fecha objetivo',
    projectNameAsc: 'Nombre: de A a Z',
    projectNameDesc: 'Nombre: de Z a A',
    targetEndSoonest: 'Fecha objetivo: más próxima',
    progress: 'Progreso',
    members: 'Miembros',
    done: 'completadas',
    teammate: 'Compañero',
  },
}
