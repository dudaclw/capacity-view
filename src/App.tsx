import { useMemo, useState } from 'react'
import {
  BarChart3,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Menu,
  Search,
  Settings,
} from 'lucide-react'
import { AllocationForm } from '@/components/allocation-form'
import { CapacityGrid } from '@/components/capacity-grid'
import { ProjectGrid } from '@/components/project-grid'
import { Dashboard } from '@/components/dashboard'
import { SimulationDialog } from '@/components/simulation-dialog'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TooltipProvider } from '@/components/ui/tooltip'
import { addPeriod, buildPeriods, periodRangeLabel, rangeAnchor, startOfPeriod, weeksBetween } from '@/lib/capacity'
import type { Granularity } from '@/lib/capacity'
import { initialAllocations, projects as initialProjects, resources } from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import type { Allocation, Project } from '@/lib/types'

// RF08: how many columns to show and how far "Anteriores/Próximas" jumps, per granularity.
const GRANULARITY_CONFIG: Record<Granularity, { count: number; navStep: number; label: string }> = {
  day: { count: 7, navStep: 7, label: 'Dia' },
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
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const { count, navStep } = GRANULARITY_CONFIG[granularity]
  const columns = useMemo(() => buildPeriods(granularity, rangeStart, count), [granularity, rangeStart, count])
  const loadWeeks = useMemo(
    () => weeksBetween(columns[0].start, columns[columns.length - 1].end),
    [columns],
  )

  function changeGranularity(next: Granularity) {
    setGranularity(next)
    setRangeStart(rangeAnchor(new Date(), next))
  }

  function goToToday() {
    setSelectedDate(new Date())
    setRangeStart(rangeAnchor(new Date(), granularity))
  }

  // Mini calendar (sidebar): jump the visible range to whatever day the user picks.
  function selectDate(date: Date | undefined) {
    if (!date) return
    setSelectedDate(date)
    setRangeStart(rangeAnchor(date, granularity))
  }

  function updateProject(updated: Project) {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }

  const SCREEN_ICON: Record<Screen, typeof CalendarRange> = { view: CalendarRange, dashboard: BarChart3 }
  const SCREEN_TITLE: Record<Screen, string> = { view: 'Visão detalhada', dashboard: 'Dashboard' }

  return (
    <TooltipProvider>
      <div className="h-screen bg-card">
        <div className="flex h-full flex-col overflow-hidden">
          <header className="flex flex-wrap items-center gap-2 border-b px-6 py-4">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Alternar menu lateral"
              onClick={() => setSidebarOpen((v) => !v)}
            >
              <Menu className="size-4" />
            </Button>
            <div className="flex shrink-0 items-center gap-2 pr-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <CalendarDays className="size-4" />
              </div>
              <span className="font-semibold">Capacity View</span>
            </div>

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

            <div className="ml-auto flex flex-wrap items-center gap-1">
              {screen === 'view' && (
                <>
                  <Select value={grouping} onValueChange={(v) => setGrouping(v as Grouping)}>
                    <SelectTrigger className="rounded-full" size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(GROUPING_LABEL) as Grouping[]).map((g) => (
                        <SelectItem key={g} value={g}>
                          {GROUPING_LABEL[g]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={granularity} onValueChange={(v) => changeGranularity(v as Granularity)}>
                    <SelectTrigger className="rounded-full" size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(GRANULARITY_CONFIG) as Granularity[]).map((g) => (
                        <SelectItem key={g} value={g}>
                          {GRANULARITY_CONFIG[g].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}

              <Button variant="ghost" size="icon" aria-label="Buscar">
                <Search className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Ajuda">
                <CircleHelp className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Configurações">
                <Settings className="size-4" />
              </Button>

              <div className="ml-1 flex items-center overflow-hidden rounded-full border">
                {(Object.keys(SCREEN_ICON) as Screen[]).map((s, i) => {
                  const Icon = SCREEN_ICON[s]
                  return (
                    <Button
                      key={s}
                      type="button"
                      variant={screen === s ? 'default' : 'ghost'}
                      size="icon"
                      aria-label={SCREEN_TITLE[s]}
                      onClick={() => setScreen(s)}
                      className={cn('rounded-none', i > 0 && 'border-l')}
                    >
                      <Icon className="size-4" />
                    </Button>
                  )
                })}
              </div>
            </div>
          </header>

          <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
            {sidebarOpen && (
            <aside className="flex w-full shrink-0 flex-col gap-4 overflow-y-auto border-b p-4 lg:w-64 lg:border-r lg:border-b-0">
              <div className="flex flex-col gap-2 [&>button]:w-full [&>button]:justify-center">
                <AllocationForm
                  resources={resources}
                  projects={projects}
                  onAdd={(a) => setAllocations((prev) => [...prev, a])}
                />
                <SimulationDialog resources={resources} allocations={allocations} />
              </div>
              <Collapsible defaultOpen={false} className="hidden lg:block">
                <CollapsibleTrigger className="flex w-full items-center gap-2 px-1 py-1 text-sm text-muted-foreground data-[state=open]:[&>svg]:rotate-180">
                  <ChevronDown className="size-4 transition-transform" />
                  Calendário
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={selectDate}
                    className="mt-2 w-full rounded-xl border"
                  />
                </CollapsibleContent>
              </Collapsible>
            </aside>
            )}

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
