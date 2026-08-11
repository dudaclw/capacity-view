import { useId, useState, type ReactNode } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PROJECT_COLOR_NAMES, PROJECT_PALETTE } from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import type { Allocation, Project, ProjectStatus, Resource } from '@/lib/types'

// RAG: schedule health, set by whoever owns the project — not derived from dates.
const RAG_OPTIONS: { value: ProjectStatus; label: string; dot: string }[] = [
  { value: 'on-track', label: 'No prazo', dot: 'bg-emerald-500' },
  { value: 'at-risk', label: 'Em risco', dot: 'bg-amber-500' },
  { value: 'delayed', label: 'Atrasado', dot: 'bg-red-500' },
]

/**
 * Click a project to view/edit its PROJETO fields, its Cronograma, and the resources
 * allocated to it. `children` is a render-prop (not a plain node) so the trigger element
 * stays free to also be a Tooltip target elsewhere (e.g. an allocation bar) — an `onClick`
 * handler composes with a hover trigger, a second `asChild` Dialog trigger on the same
 * node would not.
 */
export function ProjectDialog({
  project,
  resources,
  allocations,
  onSave,
  onAddAllocation,
  onUpdateAllocation,
  onRemoveAllocation,
  children,
}: {
  project: Project
  resources: Resource[]
  allocations: Allocation[]
  onSave: (project: Project) => void
  onAddAllocation: (allocation: Allocation) => void
  onUpdateAllocation: (allocation: Allocation) => void
  onRemoveAllocation: (id: string) => void
  children: (open: () => void) => ReactNode
}) {
  const formId = useId()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(project.name)
  const [color, setColor] = useState(project.color)
  const [status, setStatus] = useState(project.status)
  const [startDate, setStartDate] = useState(project.startDate)
  const [endDate, setEndDate] = useState(project.endDate)

  const [newResourceId, setNewResourceId] = useState('')
  const [newWeeklyHours, setNewWeeklyHours] = useState(20)
  const [newStartDate, setNewStartDate] = useState(project.startDate)
  const [newEndDate, setNewEndDate] = useState(project.endDate)

  const projectAllocations = allocations.filter((a) => a.projectId === project.id)
  const resourceById = new Map(resources.map((r) => [r.id, r]))

  function handleOpenChange(next: boolean) {
    if (next) {
      setName(project.name)
      setColor(project.color)
      setStatus(project.status)
      setStartDate(project.startDate)
      setEndDate(project.endDate)
      setNewResourceId('')
      setNewWeeklyHours(20)
      setNewStartDate(project.startDate)
      setNewEndDate(project.endDate)
    }
    setOpen(next)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !endDate || endDate < startDate) return
    onSave({ ...project, name, color, status, startDate, endDate })
    setOpen(false)
  }

  function handleAddAllocation() {
    if (!newResourceId || !newEndDate || newEndDate < newStartDate) return
    onAddAllocation({
      id: crypto.randomUUID(),
      resourceId: newResourceId,
      projectId: project.id,
      startDate: newStartDate,
      endDate: newEndDate,
      weeklyHours: newWeeklyHours,
    })
    setNewResourceId('')
    setNewWeeklyHours(20)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {children(() => handleOpenChange(true))}
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Projeto</DialogTitle>
        </DialogHeader>
        <form id={formId} onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-pressed={color === c}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                    color === c ? 'border-foreground' : 'border-transparent hover:border-muted-foreground/40',
                  )}
                >
                  <span className="size-3.5 shrink-0 rounded-full" style={{ backgroundColor: c }} />
                  {PROJECT_COLOR_NAMES[c]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RAG_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className={cn('size-2 rounded-full', opt.dot)} />
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Cronograma</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-muted-foreground text-xs font-normal">Início</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-muted-foreground text-xs font-normal">Fim</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  required
                />
              </div>
            </div>
          </div>
        </form>

        <div className="grid gap-2 border-t pt-4">
          <Label>Recursos alocados</Label>
          <div className="flex flex-col gap-2">
            {projectAllocations.map((alloc) => {
              const resource = resourceById.get(alloc.resourceId)
              return (
                <div key={alloc.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-2">
                  <span className="min-w-24 flex-1 truncate text-sm font-medium">
                    {resource?.name ?? 'Recurso removido'}
                  </span>
                  <Input
                    type="number"
                    min={1}
                    max={168}
                    value={alloc.weeklyHours}
                    onChange={(e) => onUpdateAllocation({ ...alloc, weeklyHours: Number(e.target.value) })}
                    className="w-20"
                  />
                  <span className="text-muted-foreground text-xs">h/sem</span>
                  <Input
                    type="date"
                    value={alloc.startDate}
                    onChange={(e) => onUpdateAllocation({ ...alloc, startDate: e.target.value })}
                    className="w-36"
                  />
                  <Input
                    type="date"
                    value={alloc.endDate}
                    min={alloc.startDate}
                    onChange={(e) => onUpdateAllocation({ ...alloc, endDate: e.target.value })}
                    className="w-36"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remover alocação"
                    onClick={() => onRemoveAllocation(alloc.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              )
            })}
            {projectAllocations.length === 0 && (
              <p className="text-muted-foreground text-sm">Nenhum recurso alocado ainda.</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-2">
            <Select value={newResourceId} onValueChange={setNewResourceId}>
              <SelectTrigger className="min-w-36 flex-1">
                <SelectValue placeholder="Adicionar recurso..." />
              </SelectTrigger>
              <SelectContent>
                {resources.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={1}
              max={168}
              value={newWeeklyHours}
              onChange={(e) => setNewWeeklyHours(Number(e.target.value))}
              className="w-20"
            />
            <span className="text-muted-foreground text-xs">h/sem</span>
            <Input
              type="date"
              value={newStartDate}
              onChange={(e) => setNewStartDate(e.target.value)}
              className="w-36"
            />
            <Input
              type="date"
              value={newEndDate}
              min={newStartDate}
              onChange={(e) => setNewEndDate(e.target.value)}
              className="w-36"
            />
            <Button type="button" size="icon" aria-label="Adicionar recurso" onClick={handleAddAllocation}>
              <Plus className="size-4" />
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button type="submit" form={formId}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
