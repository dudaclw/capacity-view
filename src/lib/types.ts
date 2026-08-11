export type ResourceRole = 'Implantação' | 'PO' | 'GP'

export interface Resource {
  id: string
  name: string
  weeklyCapacityHours: number
  // Some people cover more than one role (e.g. a PO who's also the implementation
  // analyst on a project) — a list, not a single value, so the grid can show them
  // under every section they actually work in.
  roles?: ResourceRole[]
}

// RAG status: schedule health, not whether the project is active — "atrasado"/"em risco"
// flag a timeline problem regardless of the project still being worked on.
export type ProjectStatus = 'on-track' | 'at-risk' | 'delayed'

export interface Project {
  id: string
  name: string
  color: string
  status: ProjectStatus
  startDate: string // ISO yyyy-mm-dd
  endDate: string // ISO yyyy-mm-dd
}

export interface Allocation {
  id: string
  resourceId: string
  projectId: string
  startDate: string // ISO yyyy-mm-dd
  endDate: string // ISO yyyy-mm-dd
  weeklyHours: number
}
