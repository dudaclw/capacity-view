import type { Allocation, Project, Resource } from './types'
import { addDays, startOfWeek, toISO } from './capacity'

export const resources: Resource[] = [
  { id: 'r1', name: 'Ana Souza', weeklyCapacityHours: 40 },
  { id: 'r2', name: 'Bruno Lima', weeklyCapacityHours: 40 },
  { id: 'r3', name: 'Carla Nunes', weeklyCapacityHours: 30 },
  { id: 'r4', name: 'Diego Alves', weeklyCapacityHours: 40 },
]

// RF03: one color per project, reused across the app.
export const PROJECT_PALETTE = ['#2274A5', '#816C61', '#B98F2B', '#4C8C6B', '#A5527A']

const today = startOfWeek(new Date())
const iso = (offsetDays: number) => toISO(addDays(today, offsetDays))

export const projects: Project[] = [
  { id: 'p1', name: 'Portal Cliente', color: PROJECT_PALETTE[0], status: 'ativo', startDate: iso(-30), endDate: iso(60) },
  { id: 'p2', name: 'Migração ERP', color: PROJECT_PALETTE[1], status: 'ativo', startDate: iso(-14), endDate: iso(30) },
  { id: 'p3', name: 'App Mobile', color: PROJECT_PALETTE[2], status: 'ativo', startDate: iso(-20), endDate: iso(90) },
  { id: 'p4', name: 'Suporte N2', color: PROJECT_PALETTE[3], status: 'ativo', startDate: iso(-40), endDate: iso(120) },
]

export const initialAllocations: Allocation[] = [
  { id: 'a1', resourceId: 'r1', projectId: 'p1', startDate: iso(-7), endDate: iso(20), weeklyHours: 20 },
  { id: 'a2', resourceId: 'r1', projectId: 'p2', startDate: iso(0), endDate: iso(14), weeklyHours: 24 },
  { id: 'a3', resourceId: 'r2', projectId: 'p3', startDate: iso(-14), endDate: iso(35), weeklyHours: 40 },
  { id: 'a4', resourceId: 'r3', projectId: 'p1', startDate: iso(3), endDate: iso(24), weeklyHours: 16 },
  { id: 'a5', resourceId: 'r3', projectId: 'p4', startDate: iso(10), endDate: iso(17), weeklyHours: 20 },
  { id: 'a6', resourceId: 'r4', projectId: 'p2', startDate: iso(-3), endDate: iso(10), weeklyHours: 20 },
  { id: 'a7', resourceId: 'r4', projectId: 'p4', startDate: iso(0), endDate: iso(28), weeklyHours: 24 },
]
