import { useId, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LOAD_BAND_STYLES } from '@/components/capacity-grid'
import { computeSimulation } from '@/lib/capacity'
import type { LoadUnit } from '@/lib/capacity'
import type { Allocation, Resource } from '@/lib/types'

const UNIT_LABEL: Record<LoadUnit, string> = { percent: '%', hours: 'h/sem' }

/** RF14/RF15: ephemeral what-if (RN06) — reads RECURSO/ALOCACAO, writes nothing. */
export function SimulationDialog({
  resources,
  allocations,
}: {
  resources: Resource[]
  allocations: Allocation[]
}) {
  const formId = useId()
  const [open, setOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [unit, setUnit] = useState<LoadUnit>('percent')
  const [loadValue, setLoadValue] = useState(20)
  const [durationWeeks, setDurationWeeks] = useState(8)

  const results = useMemo(
    () =>
      selectedIds.length
        ? computeSimulation(resources, allocations, selectedIds, { value: loadValue, unit }, durationWeeks)
        : [],
    [resources, allocations, selectedIds, loadValue, unit, durationWeeks],
  )

  const overallocated = results.filter((r) => r.band === 'overallocated')

  function toggleResource(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const insight = results.length
    ? `Com ${loadValue}${UNIT_LABEL[unit]} adicional por ${durationWeeks} ${durationWeeks === 1 ? 'semana' : 'semanas'}, ` +
      `${overallocated.length} de ${results.length} ${results.length === 1 ? 'recurso selecionado ficaria' : 'recursos selecionados ficariam'} sobrealocado${overallocated.length === 1 ? '' : 's'}` +
      (overallocated.length ? `: ${overallocated.map((r) => `${r.resource.name} (${r.resultPercent}%)`).join(', ')}.` : '.')
    : null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Fazer uma simulação</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Simular impacto de um projeto hipotético</DialogTitle>
        </DialogHeader>
        <form id={formId} className="grid gap-4" onSubmit={(e) => e.preventDefault()}>
          <div className="grid gap-2">
            <Label>Recursos candidatos</Label>
            <div className="flex flex-wrap gap-1.5">
              {resources.map((r) => (
                <Button
                  key={r.id}
                  type="button"
                  size="sm"
                  variant={selectedIds.includes(r.id) ? 'default' : 'outline'}
                  onClick={() => toggleResource(r.id)}
                >
                  {r.name}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Carga adicional exigida</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  value={loadValue}
                  onChange={(e) => setLoadValue(Number(e.target.value))}
                />
                <div className="flex gap-1 rounded-md border p-1">
                  {(Object.keys(UNIT_LABEL) as LoadUnit[]).map((u) => (
                    <Button
                      key={u}
                      type="button"
                      size="sm"
                      variant={unit === u ? 'default' : 'ghost'}
                      onClick={() => setUnit(u)}
                    >
                      {UNIT_LABEL[u]}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Duração estimada (semanas)</Label>
              <Input
                type="number"
                min={1}
                max={52}
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(Number(e.target.value))}
              />
            </div>
          </div>

          {selectedIds.length === 0 ? (
            <p className="text-muted-foreground text-sm">Selecione ao menos um recurso para ver o impacto.</p>
          ) : (
            <div className="space-y-3 rounded-md border p-3">
              <p className="text-sm">{insight}</p>
              <div className="space-y-1.5">
                {results.map(({ resource, currentPercent, resultPercent, band }) => (
                  <div key={resource.id} className="flex items-center justify-between text-sm">
                    <span>{resource.name}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">{currentPercent}% →</span>
                      <Badge variant="secondary" className={LOAD_BAND_STYLES[band]}>
                        {resultPercent}%
                      </Badge>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
