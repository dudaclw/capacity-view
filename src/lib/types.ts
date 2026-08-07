export interface Resource {
  id: string
  name: string
  weeklyCapacityHours: number
}

export interface Project {
  id: string
  name: string
  color: string
  status: 'ativo' | 'inativo'
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
