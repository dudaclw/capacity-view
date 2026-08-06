import type { Allocation, Resource } from './types'

const DAY_MS = 86_400_000

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

/** Weeks overlapping [start, end), one entry per column. */
export function buildWeeks(start: Date, count: number): Date[] {
  return Array.from({ length: count }, (_, i) => addWeeks(start, i))
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
  const band = percent > 100 ? 'overallocated' : percent >= 90 ? 'near-limit' : 'available'
  return { band, percent }
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
