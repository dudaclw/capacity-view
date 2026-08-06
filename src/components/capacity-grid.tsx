import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  addDays,
  assignLanes,
  computeLoad,
  rangeToPercent,
  weekHours,
  weekLabel,
  parseISO,
} from '@/lib/capacity'
import { cn } from '@/lib/utils'
import type { Allocation, Project, Resource } from '@/lib/types'

const LABEL_WIDTH = 200
const LANE_HEIGHT = 32
const ROW_PADDING = 16

const LOAD_BAND_STYLES = {
  available: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  'near-limit': 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  overallocated: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
} as const

export function CapacityGrid({
  resources,
  projects,
  allocations,
  weeks,
}: {
  resources: Resource[]
  projects: Project[]
  allocations: Allocation[]
  weeks: Date[]
}) {
  const rangeStart = weeks[0]
  const rangeEnd = addDays(weeks[weeks.length - 1], 7)
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
          {weeks.map((week, i) => (
            <div key={i} className="flex-1 border-l px-2 py-2 text-xs text-muted-foreground">
              {weekLabel(week)}
            </div>
          ))}
        </div>
      </div>

      {resources.map((resource) => {
        const resourceAllocations = allocations.filter((a) => a.resourceId === resource.id)
        const lanes = assignLanes(resourceAllocations)
        const laneCount = Math.max(1, ...Array.from(lanes.values(), (l) => l + 1))
        const load = computeLoad(resource, resourceAllocations, weeks)

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
                {weeks.map((week, i) => {
                  const overallocated = weekHours(resourceAllocations, week) > resource.weeklyCapacityHours
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
