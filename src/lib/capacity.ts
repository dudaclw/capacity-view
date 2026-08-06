import type { Allocation, Project, Resource } from './types'

const DAY_MS = 86_400_000

/** RF08: display granularity is independent of how allocations are stored. */
export type Granularity = 'day' | 'week' | 'month'

export interface Period {
  start: Date
  end: Date // exclusive
  label: string
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = (d.getDay() + 6) % 7 // Monday = 0
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - day)
  return d
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7)
}

export function startOfMonth(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(1)
  return d
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setDate(1) // avoid day-of-month overflow rolling into the wrong month
  d.setMonth(d.getMonth() + months)
  return d
}

/** Advances `date` by `amount` units of `granularity` (RF08). */
export function addPeriod(date: Date, granularity: Granularity, amount: number): Date {
  switch (granularity) {
    case 'day':
      return addDays(date, amount)
    case 'week':
      return addWeeks(date, amount)
    case 'month':
      return addMonths(date, amount)
  }
}

/** Anchors `date` to the start of its granularity bucket (day is already a bucket). */
export function startOfPeriod(date: Date, granularity: Granularity): Date {
  switch (granularity) {
    case 'day': {
      const d = new Date(date)
      d.setHours(0, 0, 0, 0)
      return d
    }
    case 'week':
      return startOfWeek(date)
    case 'month':
      return startOfMonth(date)
  }
}

function dayOffset(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS)
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toISO(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function weekLabel(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function dayLabel(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', weekday: 'short' })
}

export function monthLabel(date: Date): string {
  return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}

/** Weeks overlapping [start, end), one entry per column. */
export function buildWeeks(start: Date, count: number): Date[] {
  return Array.from({ length: count }, (_, i) => addWeeks(start, i))
}

/** Every Monday-start week touching [rangeStart, rangeEnd) — the buckets RN02 sums over. */
export function weeksBetween(rangeStart: Date, rangeEnd: Date): Date[] {
  const weeks: Date[] = []
  for (let w = startOfWeek(rangeStart); w < rangeEnd; w = addWeeks(w, 1)) {
    weeks.push(w)
  }
  return weeks
}

/** RF08: builds `count` display columns at the given granularity, starting at `start`. */
export function buildPeriods(granularity: Granularity, start: Date, count: number): Period[] {
  const anchor = startOfPeriod(start, granularity)
  const label = granularity === 'day' ? dayLabel : granularity === 'week' ? weekLabel : monthLabel
  return Array.from({ length: count }, (_, i) => {
    const periodStart = addPeriod(anchor, granularity, i)
    return {
      start: periodStart,
      end: addPeriod(periodStart, granularity, 1),
      label: label(periodStart),
    }
  })
}

/** Left/width as % of the visible range, clipped to [0, 100]. */
export function rangeToPercent(
  rangeStart: Date,
  rangeEnd: Date,
  itemStart: Date,
  itemEnd: Date,
) {
  const totalDays = dayOffset(rangeStart, rangeEnd)
  const startOffset = Math.max(0, dayOffset(rangeStart, itemStart))
  const endOffset = Math.min(totalDays, dayOffset(rangeStart, itemEnd))
  const left = (startOffset / totalDays) * 100
  const width = Math.max(0, ((endOffset - startOffset) / totalDays) * 100)
  return { left, width }
}

/** Assigns each allocation a lane index so overlapping ranges never share a lane (RF04). */
export function assignLanes(allocations: Allocation[]): Map<string, number> {
  const sorted = [...allocations].sort((a, b) => a.startDate.localeCompare(b.startDate))
  const laneEnds: string[] = []
  const lanes = new Map<string, number>()
  for (const alloc of sorted) {
    let lane = laneEnds.findIndex((end) => end < alloc.startDate)
    if (lane === -1) {
      lane = laneEnds.length
    }
    laneEnds[lane] = alloc.endDate
    lanes.set(alloc.id, lane)
  }
  return lanes
}

export interface LoadBand {
  band: 'available' | 'near-limit' | 'overallocated'
  percent: number
}

/** RF13/RN05: the one place the 90%/100% thresholds live — reused by every band. */
export function bandFor(percent: number): LoadBand['band'] {
  return percent > 100 ? 'overallocated' : percent >= 90 ? 'near-limit' : 'available'
}

/**
 * RF12/RF13: peak weekly load % across the visible weeks and its color band.
 * Uses the busiest week (RN02's own comparison), not an average, so the red
 * band starts at exactly the same threshold as the RF05 overallocation check (RN05).
 */
export function computeLoad(
  resource: Resource,
  allocations: Allocation[],
  weeks: Date[],
): LoadBand {
  const percent = weeks.length
    ? Math.round(
        Math.max(...weeks.map((w) => (weekHours(allocations, w) / resource.weeklyCapacityHours) * 100)),
      )
    : 0
  return { band: bandFor(percent), percent }
}

// ponytail: RN02's scan (RNF01 wants it indexed on resource_id/data_inicio/data_fim) is an
// in-memory filter today since there's no DB yet — add the index when allocations move to one.
/** Sum of weekly hours for allocations overlapping the week starting at `weekStart` (RF05, RN02). */
export function weekHours(allocations: Allocation[], weekStart: Date): number {
  const weekEnd = addDays(weekStart, 7)
  return allocations.reduce((sum, alloc) => {
    const overlaps = parseISO(alloc.startDate) < weekEnd && parseISO(alloc.endDate) >= weekStart
    return overlaps ? sum + alloc.weeklyHours : sum
  }, 0)
}

/**
 * RF05/RF08: is any week touching this display period overallocated? RN02 is defined per
 * week, so a day or month column just reports on the week(s) it falls inside — the rule
 * itself doesn't change with the display granularity.
 */
export function periodOverallocated(
  allocations: Allocation[],
  resource: Resource,
  period: Pick<Period, 'start' | 'end'>,
): boolean {
  for (const w of weeksBetween(period.start, period.end)) {
    if (weekHours(allocations, w) > resource.weeklyCapacityHours) return true
  }
  return false
}

export interface TeamKpis {
  avgUtilization: LoadBand
  overallocatedCount: number
  freeCapacityHours: number
}

/**
 * RF16: team-wide reading of the visible period — same RN02 per-resource sums,
 * just rolled up. Free capacity is summed per resource (clamped at 0 each) rather
 * than at the team total, so one overallocated resource can't hide behind another
 * resource's slack.
 */
export function computeTeamKpis(resources: Resource[], allocations: Allocation[], weeks: Date[]): TeamKpis {
  const byResource = resources.map((resource) => {
    const resourceAllocations = allocations.filter((a) => a.resourceId === resource.id)
    return { resource, load: computeLoad(resource, resourceAllocations, weeks) }
  })

  const overallocatedCount = byResource.filter(({ load }) => load.band === 'overallocated').length

  const avgPercent = weeks.length
    ? Math.round(
        weeks
          .map((w) => {
            const allocated = resources.reduce(
              (sum, r) => sum + weekHours(allocations.filter((a) => a.resourceId === r.id), w),
              0,
            )
            const capacity = resources.reduce((sum, r) => sum + r.weeklyCapacityHours, 0)
            return capacity ? (allocated / capacity) * 100 : 0
          })
          .reduce((sum, p) => sum + p, 0) / weeks.length,
      )
    : 0

  const freeCapacityHours = weeks.length
    ? Math.round(
        weeks
          .map((w) =>
            resources.reduce((sum, r) => {
              const hours = weekHours(allocations.filter((a) => a.resourceId === r.id), w)
              return sum + Math.max(0, r.weeklyCapacityHours - hours)
            }, 0),
          )
          .reduce((sum, h) => sum + h, 0) / weeks.length,
      )
    : 0

  return { avgUtilization: { band: bandFor(avgPercent), percent: avgPercent }, overallocatedCount, freeCapacityHours }
}

export interface ProjectHours {
  project: Project
  avgWeeklyHours: number
}

/** RF17: average horas/semana each project draws from the team over the visible period. */
export function computeProjectHours(projects: Project[], allocations: Allocation[], weeks: Date[]): ProjectHours[] {
  return projects
    .map((project) => {
      const projectAllocations = allocations.filter((a) => a.projectId === project.id)
      const avgWeeklyHours = weeks.length
        ? Math.round(weeks.reduce((sum, w) => sum + weekHours(projectAllocations, w), 0) / weeks.length)
        : 0
      return { project, avgWeeklyHours }
    })
    .sort((a, b) => b.avgWeeklyHours - a.avgWeeklyHours)
}

export interface TrendPoint extends Period {
  percent: number
  band: LoadBand['band']
}

/**
 * RF18/RN07: utilization for the next `count` weeks, from confirmed allocations only.
 * There's no proposta/confirmada status in the MVP (RF11 is cut) — every allocation on
 * record is already "confirmed" — so this is RN02's team sum applied forward from today,
 * not the simulator's hypothetical load (RN06).
 */
export function computeUtilizationTrend(resources: Resource[], allocations: Allocation[], count: number): TrendPoint[] {
  const capacity = resources.reduce((sum, r) => sum + r.weeklyCapacityHours, 0)
  const weeks = buildWeeks(startOfWeek(new Date()), count)
  return weeks.map((weekStart) => {
    const allocated = resources.reduce(
      (sum, r) => sum + weekHours(allocations.filter((a) => a.resourceId === r.id), weekStart),
      0,
    )
    const percent = capacity ? Math.round((allocated / capacity) * 100) : 0
    return { start: weekStart, end: addWeeks(weekStart, 1), label: weekLabel(weekStart), percent, band: bandFor(percent) }
  })
}

export type LoadUnit = 'percent' | 'hours'

export interface SimulationResult {
  resource: Resource
  currentPercent: number
  resultPercent: number
  band: LoadBand['band']
}

/**
 * RF14/RF15, RN06: hypothetical load check. Builds one synthetic allocation per selected
 * resource covering the next `durationWeeks` and reruns RF12's own peak-week formula
 * (computeLoad, i.e. RN02) with it appended — never written to `allocations`, so nothing
 * here touches ALOCACAO. `currentPercent` uses the same forward-looking window so it's a
 * fair before/after against `resultPercent`.
 */
export function computeSimulation(
  resources: Resource[],
  allocations: Allocation[],
  selectedResourceIds: string[],
  additionalLoad: { value: number; unit: LoadUnit },
  durationWeeks: number,
): SimulationResult[] {
  const weeks = buildWeeks(startOfWeek(new Date()), Math.max(1, durationWeeks))
  const rangeEnd = addWeeks(weeks[weeks.length - 1], 1)

  return selectedResourceIds
    .map((id) => resources.find((r) => r.id === id))
    .filter((r): r is Resource => !!r)
    .map((resource) => {
      const resourceAllocations = allocations.filter((a) => a.resourceId === resource.id)
      const currentPercent = computeLoad(resource, resourceAllocations, weeks).percent

      const extraHours =
        additionalLoad.unit === 'percent'
          ? (resource.weeklyCapacityHours * additionalLoad.value) / 100
          : additionalLoad.value

      const hypothetical: Allocation = {
        id: `sim-${resource.id}`,
        resourceId: resource.id,
        projectId: '__simulation__',
        startDate: toISO(weeks[0]),
        endDate: toISO(addDays(rangeEnd, -1)),
        weeklyHours: extraHours,
      }

      const { percent: resultPercent, band } = computeLoad(resource, [...resourceAllocations, hypothetical], weeks)
      return { resource, currentPercent, resultPercent, band }
    })
}
