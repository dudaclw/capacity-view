import { useMemo, useState } from 'react'
import { AllocationForm } from '@/components/allocation-form'
import { CapacityGrid } from '@/components/capacity-grid'
import { Legend } from '@/components/legend'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { addWeeks, buildWeeks, startOfWeek } from '@/lib/capacity'
import { initialAllocations, projects, resources } from '@/lib/mock-data'
import type { Allocation } from '@/lib/types'

const WEEKS_VISIBLE = 10

function App() {
  const [allocations, setAllocations] = useState<Allocation[]>(initialAllocations)
  const [rangeStart, setRangeStart] = useState(() => addWeeks(startOfWeek(new Date()), -1))
  const weeks = useMemo(() => buildWeeks(rangeStart, WEEKS_VISIBLE), [rangeStart])

  return (
    <TooltipProvider>
      <div className="mx-auto max-w-6xl space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Capacity View</h1>
          <AllocationForm
            resources={resources}
            projects={projects}
            onAdd={(a) => setAllocations((prev) => [...prev, a])}
          />
        </div>

        <div className="flex items-center justify-between">
          <Legend projects={projects} />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setRangeStart((d) => addWeeks(d, -4))}>
              ← Anteriores
            </Button>
            <Button variant="outline" size="sm" onClick={() => setRangeStart((d) => addWeeks(d, 4))}>
              Próximas →
            </Button>
          </div>
        </div>

        <CapacityGrid resources={resources} projects={projects} allocations={allocations} weeks={weeks} />
      </div>
    </TooltipProvider>
  )
}

export default App
