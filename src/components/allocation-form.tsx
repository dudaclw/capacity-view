import { useId, useState } from 'react'
import { Plus } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Allocation, Project, Resource } from '@/lib/types'
import { toISO } from '@/lib/capacity'

export function AllocationForm({
  resources,
  projects,
  onAdd,
}: {
  resources: Resource[]
  projects: Project[]
  onAdd: (allocation: Allocation) => void
}) {
  const formId = useId()
  const [open, setOpen] = useState(false)
  const [resourceId, setResourceId] = useState(resources[0]?.id)
  const [projectId, setProjectId] = useState(projects[0]?.id)
  const [startDate, setStartDate] = useState(toISO(new Date()))
  const [endDate, setEndDate] = useState(toISO(new Date()))
  const [weeklyHours, setWeeklyHours] = useState(20)

  const resource = resources.find((r) => r.id === resourceId)
  const percent = resource ? Math.round((weeklyHours / resource.weeklyCapacityHours) * 100) : 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!resourceId || !projectId || !endDate || endDate < startDate) return
    onAdd({
      id: crypto.randomUUID(),
      resourceId,
      projectId,
      startDate,
      endDate,
      weeklyHours,
    })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full">
          <Plus className="size-4" />
          Nova alocação
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova alocação</DialogTitle>
        </DialogHeader>
        <form id={formId} onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label>Recurso</Label>
            <Select value={resourceId} onValueChange={setResourceId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {resources.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Projeto</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Início</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Fim</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                required
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Horas semanais</Label>
            <Input
              type="number"
              min={1}
              max={168}
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(Number(e.target.value))}
              required
            />
            {resource && (
              <p className="text-muted-foreground text-sm">
                = {percent}% da jornada de {resource.name} ({resource.weeklyCapacityHours}h/semana)
              </p>
            )}
          </div>
        </form>
        <DialogFooter>
          <Button type="submit" form={formId}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
