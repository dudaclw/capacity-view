import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  addDays,
  assignLanes,
  computeLoad,
  periodOverallocated,
  rangeToPercent,
  parseISO,
} from '@/lib/capacity'
import type { Period } from '@/lib/capacity'
import { cn } from '@/lib/utils'
import type { Allocation, Project, Resource } from '@/lib/types'

// Shared with project-grid.tsx so the two grouping modes line up visually.
export const LABEL_WIDTH = 200
export const LANE_HEIGHT = 32
export const ROW_PADDING = 16

// Shared with dashboard.tsx — the one status palette for available/near-limit/overallocated (RN05).
export const LOAD_BAND_STYLES = {
  available: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  'near-limit': 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  overallocated: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
} as const

export function CapacityGrid({
  resources,
  projects,
  allocations,
  columns,
  loadWeeks,
}: {
  resources: Resource[]
  projects: Project[]
  allocations: Allocation[]
  columns: Period[]
  loadWeeks: Date[]
}) {
  const rangeStart = columns[0].start
  const rangeEnd = columns[columns.length - 1].end
  const today = new Date()
  const todayInRange = today >= rangeStart && today < rangeEnd
  const { left: todayLeft } = rangeToPercent(rangeStart, rangeEnd, today, today)
  const projectById = new Map(projects.map((p) => [p.id, p]))

  return (
    <div className="relative rounded-md border">
      <div className="flex border-b bg-muted/40">
        <div className="shrink-0 px-3 py-2 text-sm font-medium" style={{ width: LABEL_WIDTH }}>
          Recurso
        </div>
        <div className="flex flex-1">
          {columns.map((col, i) => (
            <div key={i} className="flex-1 border-l px-2 py-2 text-xs text-muted-foreground">
              {col.label}
            </div>
          ))}
        </div>
      </div>

      {resources.map((resource) => {
        const resourceAllocations = allocations.filter((a) => a.resourceId === resource.id)
        const lanes = assignLanes(resourceAllocations)
        const laneCount = Math.max(1, ...Array.from(lanes.values(), (l) => l + 1))
        const load = computeLoad(resource, resourceAllocations, loadWeeks)

        return (
          <div key={resource.id} className="flex border-b last:border-b-0">
            <div
              className="flex shrink-0 flex-col justify-center gap-1 px-3 py-2"
              style={{ width: LABEL_WIDTH }}
            >
              <span className="text-sm font-medium">{resource.name}</span>
              <Badge variant="secondary" className={cn('w-fit', LOAD_BAND_STYLES[load.band])}>
                {load.percent}%
              </Badge>
            </div>
            <div
              className="relative flex-1"
              style={{ height: laneCount * LANE_HEIGHT + ROW_PADDING }}
            >
              <div className="absolute inset-0 flex">
                {columns.map((col, i) => {
                  const overallocated = periodOverallocated(resourceAllocations, resource, col)
                  return (
                    <div
                      key={i}
                      className={cn('flex-1 border-l', overallocated && 'bg-red-500/15')}
                    />
                  )
                })}
              </div>
              {resourceAllocations.map((alloc) => {
                const project = projectById.get(alloc.projectId)
                if (!project) return null
                const { left, width } = rangeToPercent(
                  rangeStart,
                  rangeEnd,
                  parseISO(alloc.startDate),
                  addDays(parseISO(alloc.endDate), 1),
                )
                const percent = Math.round((alloc.weeklyHours / resource.weeklyCapacityHours) * 100)
                return (
                  <Tooltip key={alloc.id}>
                    <TooltipTrigger asChild>
                      <div
                        className="absolute rounded-sm px-1.5 py-1 text-xs font-medium text-white overflow-hidden text-ellipsis whitespace-nowrap"
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          top: (lanes.get(alloc.id) ?? 0) * LANE_HEIGHT + ROW_PADDING / 2,
                          height: LANE_HEIGHT - 4,
                          backgroundColor: project.color,
                        }}
                      >
                        {project.name}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {project.name} · {alloc.weeklyHours}h/sem ({percent}% da jornada)
                      <br />
                      {alloc.startDate} → {alloc.endDate}
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </div>
        )
      })}

      {todayInRange && (
        <div
          className="pointer-events-none absolute inset-y-0 border-l-2 border-primary"
          style={{ left: `calc(${LABEL_WIDTH}px + (100% - ${LABEL_WIDTH}px) * ${todayLeft / 100})` }}
        />
      )}
    </div>
  )
}
