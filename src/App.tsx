import { useMemo, useState } from 'react'
import { BarChart3, CalendarDays, CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react'
import { AllocationForm } from '@/components/allocation-form'
import { CapacityGrid } from '@/components/capacity-grid'
import { ProjectGrid } from '@/components/project-grid'
import { Dashboard } from '@/components/dashboard'
import { SimulationDialog } from '@/components/simulation-dialog'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { addPeriod, buildPeriods, periodRangeLabel, startOfPeriod, weeksBetween } from '@/lib/capacity'
import type { Granularity } from '@/lib/capacity'
import { initialAllocations, projects as initialProjects, resources } from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import type { Allocation, Project } from '@/lib/types'

// RF08: how many columns to show and how far "Anteriores/Próximas" jumps, per granularity.
const GRANULARITY_CONFIG: Record<Granularity, { count: number; navStep: number; label: string }> = {
  day: { count: 21, navStep: 7, label: 'Dia' },
  week: { count: 10, navStep: 4, label: 'Semana' },
  month: { count: 6, navStep: 3, label: 'Mês' },
}

// RF19: which entity groups the rows — same ALOCACAO query, different GROUP BY.
type Grouping = 'resource' | 'project'
const GROUPING_LABEL: Record<Grouping, string> = {
  resource: 'Por recurso',
  project: 'Por projeto',
}

// Section 11: the dashboard is a different audience (gestão) than the detailed grid
// (quem registra alocação) — a separate screen, same underlying ALOCACAO data/state.
type Screen = 'view' | 'dashboard'

function App() {
  const [allocations, setAllocations] = useState<Allocation[]>(initialAllocations)
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [screen, setScreen] = useState<Screen>('view')
  const [granularity, setGranularity] = useState<Granularity>('week')
  const [grouping, setGrouping] = useState<Grouping>('resource')
  const [rangeStart, setRangeStart] = useState(() => addPeriod(startOfPeriod(new Date(), 'week'), 'week', -1))
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  const { count, navStep } = GRANULARITY_CONFIG[granularity]
  const columns = useMemo(() => buildPeriods(granularity, rangeStart, count), [granularity, rangeStart, count])
  const loadWeeks = useMemo(
    () => weeksBetween(columns[0].start, columns[columns.length - 1].end),
    [columns],
  )

  function changeGranularity(next: Granularity) {
    setGranularity(next)
    setRangeStart(addPeriod(startOfPeriod(new Date(), next), next, -1))
  }

  function goToToday() {
    setSelectedDate(new Date())
    setRangeStart(addPeriod(startOfPeriod(new Date(), granularity), granularity, -1))
  }

  // Mini calendar (sidebar): jump the visible range to whatever day the user picks.
  function selectDate(date: Date | undefined) {
    if (!date) return
    setSelectedDate(date)
    setRangeStart(addPeriod(startOfPeriod(date, granularity), granularity, -1))
  }

  function updateProject(updated: Project) {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }

  const NAV_ITEMS: Array<{ screen: Screen; label: string; icon: typeof CalendarRange }> = [
    { screen: 'view', label: 'Visão detalhada', icon: CalendarRange },
    { screen: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  ]

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-muted/30 p-4">
        <div className="mx-auto flex h-[calc(100vh-2rem)] max-w-[1500px] flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
          <header className="flex flex-wrap items-center gap-6 border-b px-6 py-3">
            <div className="flex shrink-0 items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <CalendarDays className="size-4" />
              </div>
              <span className="font-semibold">Capacity View</span>
            </div>

            <nav className="flex items-center gap-1">
              {NAV_ITEMS.map(({ screen: s, label, icon: Icon }) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScreen(s)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
                    screen === s
                      ? 'bg-muted font-medium text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              ))}
            </nav>
          </header>

          <div className="flex flex-wrap items-center gap-3 border-b px-6 py-3">
            <Button variant="outline" size="sm" className="rounded-full" onClick={goToToday}>
              Hoje
            </Button>
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Período anterior"
                onClick={() => setRangeStart((d) => addPeriod(d, granularity, -navStep))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Próximo período"
                onClick={() => setRangeStart((d) => addPeriod(d, granularity, navStep))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <span className="text-xl font-medium">
              {periodRangeLabel(columns[0].start, columns[columns.length - 1].end)}
            </span>
            <span className="rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs text-muted-foreground">
              {GRANULARITY_CONFIG[granularity].label}
            </span>

            {screen === 'view' && (
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <div className="flex gap-1 rounded-full border p-1">
                  {(Object.keys(GROUPING_LABEL) as Grouping[]).map((g) => (
                    <Button
                      key={g}
                      type="button"
                      variant={grouping === g ? 'default' : 'ghost'}
                      size="sm"
                      className="rounded-full"
                      onClick={() => setGrouping(g)}
                    >
                      {GROUPING_LABEL[g]}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-1 rounded-full border p-1">
                  {(Object.keys(GRANULARITY_CONFIG) as Granularity[]).map((g) => (
                    <Button
                      key={g}
                      type="button"
                      variant={granularity === g ? 'default' : 'ghost'}
                      size="sm"
                      className="rounded-full"
                      onClick={() => changeGranularity(g)}
                    >
                      {GRANULARITY_CONFIG[g].label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
            <aside className="flex w-full shrink-0 flex-col gap-4 overflow-y-auto border-b p-4 lg:w-64 lg:border-r lg:border-b-0">
              <div className="flex flex-col gap-2 [&>button]:w-full [&>button]:justify-center">
                <AllocationForm
                  resources={resources}
                  projects={projects}
                  onAdd={(a) => setAllocations((prev) => [...prev, a])}
                />
                <SimulationDialog resources={resources} allocations={allocations} />
              </div>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={selectDate}
                className="hidden w-full rounded-xl border lg:block"
              />
            </aside>

            <main className="flex-1 overflow-y-auto p-4">
              {screen === 'dashboard' ? (
                <Dashboard resources={resources} projects={projects} allocations={allocations} loadWeeks={loadWeeks} />
              ) : grouping === 'resource' ? (
                <CapacityGrid
                  resources={resources}
                  projects={projects}
                  allocations={allocations}
                  columns={columns}
                  loadWeeks={loadWeeks}
                  granularity={granularity}
                  onUpdateProject={updateProject}
                />
              ) : (
                <ProjectGrid
                  resources={resources}
                  projects={projects}
                  allocations={allocations}
                  columns={columns}
                  granularity={granularity}
                  onUpdateProject={updateProject}
                />
              )}
            </main>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default App
