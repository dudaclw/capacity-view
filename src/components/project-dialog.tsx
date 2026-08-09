import { useId, useState, type ReactNode } from 'react'
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
import type { Project } from '@/lib/types'

/**
 * Click a project to view/edit its PROJETO fields. `children` is a render-prop (not a plain
 * node) so the trigger element stays free to also be a Tooltip target elsewhere (e.g. an
 * allocation bar) — an `onClick` handler composes with a hover trigger, a second `asChild`
 * Dialog trigger on the same node would not.
 */
export function ProjectDialog({
  project,
  onSave,
  children,
}: {
  project: Project
  onSave: (project: Project) => void
  children: (open: () => void) => ReactNode
}) {
  const formId = useId()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(project.name)
  const [color, setColor] = useState(project.color)
  const [status, setStatus] = useState(project.status)
  const [startDate, setStartDate] = useState(project.startDate)
  const [endDate, setEndDate] = useState(project.endDate)

  function handleOpenChange(next: boolean) {
    if (next) {
      setName(project.name)
      setColor(project.color)
      setStatus(project.status)
      setStartDate(project.startDate)
      setEndDate(project.endDate)
    }
    setOpen(next)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !endDate || endDate < startDate) return
    onSave({ ...project, name, color, status, startDate, endDate })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {children(() => handleOpenChange(true))}
      <DialogContent>
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
            <Select value={status} onValueChange={(v) => setStatus(v as Project['status'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
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
