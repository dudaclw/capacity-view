import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { CalendarHeader } from '@/components/calendar-header'
import { ProjectDialog } from '@/components/project-dialog'
import {
  addDays,
  assignLanes,
  columnTint,
  isWeekend,
  periodContainsToday,
  periodOverallocated,
  rangeToPercent,
  parseISO,
} from '@/lib/capacity'
import type { Granularity, Period } from '@/lib/capacity'
import { cn } from '@/lib/utils'
import {
  ALLOCATION_CHIP_CLASS,
  LABEL_WIDTH,
  LANE_HEIGHT,
  ROW_PADDING,
  allocationChipStyle,
  chipEdgeClass,
} from '@/components/capacity-grid'
import type { Allocation, Project, Resource } from '@/lib/types'

/**
 * RF19/RF20: same ALOCACAO data as CapacityGrid, grouped by projeto_id instead of
 * recurso_id. Overallocation shading still reads from each resource's full allocation
 * list (all projects) — RN02 is a per-resource rule, not a per-project one, even
 * when the view is sliced by project.
 */
export function ProjectGrid({
  resources,
  projects,
  allocations,
  columns,
  granularity,
  onUpdateProject,
  onAddAllocation,
  onUpdateAllocation,
  onRemoveAllocation,
}: {
  resources: Resource[]
  projects: Project[]
  allocations: Allocation[]
  columns: Period[]
  granularity: Granularity
  onUpdateProject: (project: Project) => void
  onAddAllocation: (allocation: Allocation) => void
  onUpdateAllocation: (allocation: Allocation) => void
  onRemoveAllocation: (id: string) => void
}) {
  const rangeStart = columns[0].start
  const rangeEnd = columns[columns.length - 1].end
  const today = new Date()
  const todayInRange = today >= rangeStart && today < rangeEnd
  const { left: todayLeft } = rangeToPercent(rangeStart, rangeEnd, today, today)
  const resourceById = new Map(resources.map((r) => [r.id, r]))

  return (
    <div className="relative flex flex-col gap-2">
      <CalendarHeader columns={columns} granularity={granularity} labelText="Projeto / Recurso" />

      {projects.map((project, projectIndex) => {
        const projectAllocations = allocations.filter((a) => a.projectId === project.id)
        const resourceIds = [...new Set(projectAllocations.map((a) => a.resourceId))]

        return (
          <div
            key={project.id}
            className={cn(
              'overflow-hidden rounded-xl',
              projectIndex % 2 === 0 ? 'bg-card' : 'bg-card/60',
            )}
          >
            <ProjectDialog
              project={project}
              resources={resources}
              allocations={allocations}
              onSave={onUpdateProject}
              onAddAllocation={onAddAllocation}
              onUpdateAllocation={onUpdateAllocation}
              onRemoveAllocation={onRemoveAllocation}
            >
              {(open) => (
                <button
                  type="button"
                  onClick={open}
                  className="flex w-full items-center gap-2 bg-muted/40 px-3 py-1.5 text-sm font-medium hover:bg-muted/70"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: project.color }} />
                  {project.name}
                  <span className="text-muted-foreground text-xs font-normal">
                    ({resourceIds.length} {resourceIds.length === 1 ? 'recurso' : 'recursos'})
                  </span>
                </button>
              )}
            </ProjectDialog>

            {resourceIds.map((resourceId) => {
              const resource = resourceById.get(resourceId)
              if (!resource) return null
              const allResourceAllocations = allocations.filter((a) => a.resourceId === resourceId)
              const rowAllocations = projectAllocations.filter((a) => a.resourceId === resourceId)
              const lanes = assignLanes(rowAllocations)
              const laneCount = Math.max(1, ...Array.from(lanes.values(), (l) => l + 1))

              return (
                <div key={resourceId} className="flex">
                  <div
                    className="flex shrink-0 flex-col justify-center gap-1 py-2 pl-6 pr-3"
                    style={{ width: LABEL_WIDTH }}
                  >
                    <span className="text-sm">{resource.name}</span>
                    <div className="flex flex-wrap gap-1">
                      {rowAllocations.map((alloc) => (
                        <Badge key={alloc.id} variant="secondary" className="w-fit">
                          {Math.round((alloc.weeklyHours / resource.weeklyCapacityHours) * 100)}%
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div
                    className="relative flex-1"
                    style={{ height: laneCount * LANE_HEIGHT + ROW_PADDING }}
                  >
                    <div className="absolute inset-0 flex">
                      {columns.map((col, i) => {
                        const overallocated = periodOverallocated(allResourceAllocations, resource, col)
                        return (
                          <div
                            key={i}
                            className={cn(
                              'flex-1',
                              columnTint(overallocated, periodContainsToday(col), isWeekend(col.start)),
                            )}
                          />
                        )
                      })}
                    </div>
                    {rowAllocations.map((alloc) => {
                      const allocStart = parseISO(alloc.startDate)
                      const allocEndExclusive = addDays(parseISO(alloc.endDate), 1)
                      const { left, width } = rangeToPercent(rangeStart, rangeEnd, allocStart, allocEndExclusive)
                      if (width <= 0) return null
                      const percent = Math.round((alloc.weeklyHours / resource.weeklyCapacityHours) * 100)
                      const clippedLeft = allocStart < rangeStart
                      const clippedRight = allocEndExclusive > rangeEnd
                      return (
                        <div
                          key={alloc.id}
                          className="absolute z-10"
                          style={{
                            left: `${left}%`,
                            width: `${width}%`,
                            top: (lanes.get(alloc.id) ?? 0) * LANE_HEIGHT + ROW_PADDING / 2,
                            height: LANE_HEIGHT - 4,
                          }}
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(ALLOCATION_CHIP_CLASS, chipEdgeClass(clippedLeft, clippedRight))}
                                style={allocationChipStyle(project.color)}
                              >
                                {resource.name}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {resource.name} · {alloc.weeklyHours}h/sem ({percent}% da jornada)
                              <br />
                              {alloc.startDate} → {alloc.endDate}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
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
