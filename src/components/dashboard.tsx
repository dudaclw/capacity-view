import { Clock, Gauge, TriangleAlert } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { LOAD_BAND_STYLES } from '@/components/capacity-grid'
import { computeProjectHours, computeTeamKpis, computeUtilizationTrend } from '@/lib/capacity'
import type { TrendPoint } from '@/lib/capacity'
import { cn } from '@/lib/utils'
import type { Allocation, Project, Resource } from '@/lib/types'

const TREND_WEEKS = 10

const BAND_TEXT = {
  available: 'text-emerald-700 dark:text-emerald-400',
  'near-limit': 'text-amber-700 dark:text-amber-400',
  overallocated: 'text-red-700 dark:text-red-400',
} as const

const BAND_FILL = {
  available: 'fill-emerald-500 dark:fill-emerald-400',
  'near-limit': 'fill-amber-500 dark:fill-amber-400',
  overallocated: 'fill-red-500 dark:fill-red-400',
} as const

/**
 * RF16/RF17/RF18: aggregated read of the same ALOCACAO data the detailed grid uses —
 * no new entity, just RN02 rolled up instead of broken out by resource.
 */
export function Dashboard({
  resources,
  projects,
  allocations,
  loadWeeks,
}: {
  resources: Resource[]
  projects: Project[]
  allocations: Allocation[]
  loadWeeks: Date[]
}) {
  const kpis = computeTeamKpis(resources, allocations, loadWeeks)
  const projectHours = computeProjectHours(projects, allocations, loadWeeks)
  const trend = computeUtilizationTrend(resources, allocations, TREND_WEEKS)

  const teamCapacity = resources.reduce((sum, r) => sum + r.weeklyCapacityHours, 0)
  const maxProjectHours = Math.max(teamCapacity, ...projectHours.map((p) => p.avgWeeklyHours), 1)

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3">
            <Gauge className={cn('size-6 shrink-0', BAND_TEXT[kpis.avgUtilization.band])} />
            <div>
              <div className={cn('text-2xl font-semibold', BAND_TEXT[kpis.avgUtilization.band])}>
                {kpis.avgUtilization.percent}%
              </div>
              <div className="text-muted-foreground text-xs">Utilização média da equipe</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <TriangleAlert
              className={cn(
                'size-6 shrink-0',
                kpis.overallocatedCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground',
              )}
            />
            <div>
              <div
                className={cn(
                  'text-2xl font-semibold',
                  kpis.overallocatedCount > 0 && 'text-red-600 dark:text-red-400',
                )}
              >
                {kpis.overallocatedCount} de {resources.length}
              </div>
              <div className="text-muted-foreground text-xs">Recursos sobrealocados</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <Clock className="text-muted-foreground size-6 shrink-0" />
            <div>
              <div className="text-2xl font-semibold">{kpis.freeCapacityHours}h</div>
              <div className="text-muted-foreground text-xs">Capacidade livre / semana</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Capacidade por projeto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {projectHours.map(({ project, avgWeeklyHours }) => (
            <div key={project.id} className="flex items-center gap-3">
              <span className="w-32 shrink-0 truncate text-sm">{project.name}</span>
              <div className="relative h-5 flex-1 overflow-hidden rounded-sm bg-muted">
                <div
                  className="h-full rounded-r-sm"
                  style={{
                    width: `${Math.min(100, (avgWeeklyHours / maxProjectHours) * 100)}%`,
                    backgroundColor: project.color,
                  }}
                />
              </div>
              <span className="text-muted-foreground w-16 shrink-0 text-right text-xs">{avgWeeklyHours}h/sem</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tendência de utilização — próximas {TREND_WEEKS} semanas</CardTitle>
        </CardHeader>
        <CardContent>
          <UtilizationTrendChart trend={trend} />
          <div className="mt-2 flex items-center gap-4 text-xs">
            {(Object.keys(LOAD_BAND_STYLES) as Array<keyof typeof LOAD_BAND_STYLES>).map((band) => (
              <span key={band} className="flex items-center gap-1.5">
                <span className={cn('size-2 rounded-full', BAND_FILL[band].split(' ')[0].replace('fill-', 'bg-'))} />
                <span className="text-muted-foreground">
                  {band === 'available' ? 'Disponível' : band === 'near-limit' ? 'Próximo do limite' : 'Sobrealocado'}
                </span>
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function UtilizationTrendChart({ trend }: { trend: TrendPoint[] }) {
  const width = 640
  const height = 140
  const padX = 10
  const padTop = 12
  const padBottom = 10
  const yMax = Math.max(110, ...trend.map((t) => t.percent + 10))
  const plotHeight = height - padTop - padBottom

  const xFor = (i: number) => padX + (trend.length > 1 ? (i / (trend.length - 1)) * (width - padX * 2) : 0)
  const yFor = (percent: number) => padTop + (1 - percent / yMax) * plotHeight

  const linePath = trend.map((t, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(t.percent)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Tendência de utilização">
      <line
        x1={padX}
        x2={width - padX}
        y1={yFor(100)}
        y2={yFor(100)}
        className="stroke-red-400/60 dark:stroke-red-500/50"
        strokeWidth={1}
        strokeDasharray="4 3"
      />
      <line
        x1={padX}
        x2={width - padX}
        y1={yFor(90)}
        y2={yFor(90)}
        className="stroke-amber-400/60 dark:stroke-amber-500/50"
        strokeWidth={1}
        strokeDasharray="4 3"
      />
      <path d={linePath} fill="none" className="stroke-muted-foreground" strokeWidth={2} />
      {trend.map((t, i) => (
        <Tooltip key={t.start.toISOString()}>
          <TooltipTrigger asChild>
            <circle cx={xFor(i)} cy={yFor(t.percent)} r={5} className={cn(BAND_FILL[t.band], 'cursor-default')} />
          </TooltipTrigger>
          <TooltipContent>
            Semana de {t.label} · {t.percent}%
          </TooltipContent>
        </Tooltip>
      ))}
    </svg>
  )
}
