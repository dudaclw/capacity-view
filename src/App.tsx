import { useMemo, useState } from 'react'
import { AllocationForm } from '@/components/allocation-form'
import { CapacityGrid } from '@/components/capacity-grid'
import { ProjectGrid } from '@/components/project-grid'
import { Dashboard } from '@/components/dashboard'
import { Legend } from '@/components/legend'
import { SimulationDialog } from '@/components/simulation-dialog'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { addPeriod, buildPeriods, startOfPeriod, weeksBetween } from '@/lib/capacity'
import type { Granularity } from '@/lib/capacity'
import { initialAllocations, projects, resources } from '@/lib/mock-data'
import type { Allocation } from '@/lib/types'

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
  const [screen, setScreen] = useState<Screen>('view')
  const [granularity, setGranularity] = useState<Granularity>('week')
  const [grouping, setGrouping] = useState<Grouping>('resource')
  const [rangeStart, setRangeStart] = useState(() => addPeriod(startOfPeriod(new Date(), 'week'), 'week', -1))

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

  return (
    <TooltipProvider>
      <div className="mx-auto max-w-6xl space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">Capacity View</h1>
            <div className="flex gap-1 rounded-md border p-1">
              <Button
                type="button"
                variant={screen === 'view' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setScreen('view')}
              >
                Visão detalhada
              </Button>
              <Button
                type="button"
                variant={screen === 'dashboard' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setScreen('dashboard')}
              >
                Dashboard
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SimulationDialog resources={resources} allocations={allocations} />
            {screen === 'view' && (
              <AllocationForm
                resources={resources}
                projects={projects}
                onAdd={(a) => setAllocations((prev) => [...prev, a])}
              />
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Legend projects={projects} />
          <div className="flex flex-wrap items-center gap-2">
            {screen === 'view' && (
              <>
                <div className="flex gap-1 rounded-md border p-1">
                  {(Object.keys(GROUPING_LABEL) as Grouping[]).map((g) => (
                    <Button
                      key={g}
                      type="button"
                      variant={grouping === g ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setGrouping(g)}
                    >
                      {GROUPING_LABEL[g]}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-1 rounded-md border p-1">
                  {(Object.keys(GRANULARITY_CONFIG) as Granularity[]).map((g) => (
                    <Button
                      key={g}
                      type="button"
                      variant={granularity === g ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => changeGranularity(g)}
                    >
                      {GRANULARITY_CONFIG[g].label}
                    </Button>
                  ))}
                </div>
              </>
            )}
            <Button variant="outline" size="sm" onClick={() => setRangeStart((d) => addPeriod(d, granularity, -navStep))}>
              ← Anteriores
            </Button>
            <Button variant="outline" size="sm" onClick={() => setRangeStart((d) => addPeriod(d, granularity, navStep))}>
              Próximas →
            </Button>
          </div>
        </div>

        {screen === 'dashboard' ? (
          <Dashboard resources={resources} projects={projects} allocations={allocations} loadWeeks={loadWeeks} />
        ) : grouping === 'resource' ? (
          <CapacityGrid
            resources={resources}
            projects={projects}
            allocations={allocations}
            columns={columns}
            loadWeeks={loadWeeks}
          />
        ) : (
          <ProjectGrid resources={resources} projects={projects} allocations={allocations} columns={columns} />
        )}
      </div>
    </TooltipProvider>
  )
}

export default App
