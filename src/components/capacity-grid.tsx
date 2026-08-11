import { ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { CalendarHeader } from '@/components/calendar-header'
import { ProjectDialog } from '@/components/project-dialog'
import {
  addDays,
  assignLanes,
  columnTint,
  computeLoad,
  isWeekend,
  periodContainsToday,
  periodOverallocated,
  rangeToPercent,
  parseISO,
} from '@/lib/capacity'
import type { Granularity, Period } from '@/lib/capacity'
import { cn } from '@/lib/utils'
import type { Allocation, Project, Resource, ResourceRole } from '@/lib/types'

// Shared with project-grid.tsx so the two grouping modes line up visually.
export const LABEL_WIDTH = 200
export const LANE_HEIGHT = 40
export const ROW_PADDING = 28

// Fixed section order for the "Por recurso" view. A resource with more than one role
// (e.g. a PO who's also the implementation analyst) appears once per section it's in.
const ROLE_ORDER: ResourceRole[] = ['Implantação', 'PO', 'GP']
const UNASSIGNED_LABEL = 'Sem papel definido'

// Shared with dashboard.tsx — the one status palette for available/near-limit/overallocated (RN05).
export const LOAD_BAND_STYLES = {
  available: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  'near-limit': 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  overallocated: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
} as const

// Shared with project-grid.tsx — Google Calendar-style event chip: tinted fill, solid left
// accent border, instead of a flat filled block.
export const ALLOCATION_CHIP_CLASS =
  'h-full w-full rounded-md border-l-4 px-1.5 py-1 text-xs font-medium text-white shadow-sm overflow-hidden text-ellipsis whitespace-nowrap'

export function allocationChipStyle(color: string) {
  return { backgroundColor: `${color}26`, borderLeftColor: color }
}

/** RF04: rounds off the edge(s) that actually end within the visible range — a chip
 *  clipped by the window keeps a square edge, so "continues off-screen" reads at a glance. */
export function chipEdgeClass(clippedLeft: boolean, clippedRight: boolean) {
  return cn(clippedLeft && 'rounded-l-none', clippedRight && 'rounded-r-none')
}

export function CapacityGrid({
  resources,
  projects,
  allocations,
  columns,
  loadWeeks,
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
  loadWeeks: Date[]
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
  const projectById = new Map(projects.map((p) => [p.id, p]))

  const groups = [
    ...ROLE_ORDER.map((role) => ({
      label: role,
      resources: resources.filter((r) => r.roles?.includes(role)),
    })),
    { label: UNASSIGNED_LABEL, resources: resources.filter((r) => !r.roles?.length) },
  ].filter((group) => group.resources.length > 0)

  let rowIndex = 0

  return (
    <div className="relative flex flex-col gap-2">
      <CalendarHeader columns={columns} granularity={granularity} labelText="Recurso" />

      {groups.map((group) => (
        <Collapsible key={group.label} defaultOpen className="flex flex-col gap-2">
          <CollapsibleTrigger className="flex items-center gap-1.5 rounded-lg bg-muted/40 px-3 py-1.5 text-left text-sm font-medium hover:bg-muted/70 data-[state=open]:[&>svg]:rotate-180">
            <ChevronDown className="size-4 shrink-0 transition-transform" />
            {group.label}{' '}
            <span className="text-muted-foreground text-xs font-normal">({group.resources.length})</span>
          </CollapsibleTrigger>

          <CollapsibleContent className="flex flex-col gap-2">
          {group.resources.map((resource) => {
            const resourceAllocations = allocations.filter((a) => a.resourceId === resource.id)
            const lanes = assignLanes(resourceAllocations)
            const laneCount = Math.max(1, ...Array.from(lanes.values(), (l) => l + 1))
            const load = computeLoad(resource, resourceAllocations, loadWeeks)
            const zebra = rowIndex++ % 2 === 0

            return (
              <div
                key={`${group.label}-${resource.id}`}
                className={cn('flex overflow-hidden rounded-xl', zebra ? 'bg-card' : 'bg-card/60')}
              >
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
                          className={cn(
                            'flex-1',
                            columnTint(overallocated, periodContainsToday(col), isWeekend(col.start)),
                          )}
                        />
                      )
                    })}
                  </div>
                  {resourceAllocations.map((alloc) => {
                    const project = projectById.get(alloc.projectId)
                    if (!project) return null
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
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  onClick={open}
                                  className={cn(
                                    'cursor-pointer',
                                    ALLOCATION_CHIP_CLASS,
                                    chipEdgeClass(clippedLeft, clippedRight),
                                  )}
                                  style={allocationChipStyle(project.color)}
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
                          )}
                        </ProjectDialog>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
          </CollapsibleContent>
        </Collapsible>
      ))}

      {todayInRange && (
        <div
          className="pointer-events-none absolute inset-y-0 border-l-2 border-primary"
          style={{ left: `calc(${LABEL_WIDTH}px + (100% - ${LABEL_WIDTH}px) * ${todayLeft / 100})` }}
        />
      )}
    </div>
  )
}
