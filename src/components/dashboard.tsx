import { useState } from 'react'
import { BatteryLow, CalendarClock, Clock, Gauge, TriangleAlert, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { LOAD_BAND_STYLES } from '@/components/capacity-grid'
import {
  computeBench,
  computeBusFactor,
  computeProjectHealth,
  computeProjectHours,
  computeTeamKpis,
  computeUpcomingOverallocations,
  computeUtilizationTrend,
  startOfWeek,
} from '@/lib/capacity'
import type { TrendPoint } from '@/lib/capacity'
import { cn } from '@/lib/utils'
import type { Allocation, Project, Resource, ResourceRole } from '@/lib/types'

const TREND_WEEKS = 5
const OVERALLOCATION_HORIZON_WEEKS = 8

const dateLabel = (date: Date) => date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })

type RoleFilter = 'all' | ResourceRole
const ROLE_FILTER_LABEL: Record<RoleFilter, string> = {
  all: 'Todos os papéis',
  Implantação: 'Implantador',
  PO: 'PO',
  GP: 'GP',
}

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
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')

  // Filtering resources first and deriving allocations/projects from that selection keeps
  // every downstream metric (KPIs, saúde, bus factor, tendência...) consistent with each
  // other — a project shows up only if someone in the selected role actually works on it.
  const filteredResources =
    roleFilter === 'all' ? resources : resources.filter((r) => r.roles?.includes(roleFilter))
  const filteredResourceIds = new Set(filteredResources.map((r) => r.id))
  const filteredAllocations =
    roleFilter === 'all' ? allocations : allocations.filter((a) => filteredResourceIds.has(a.resourceId))
  const touchedProjectIds = new Set(filteredAllocations.map((a) => a.projectId))
  const filteredProjects = roleFilter === 'all' ? projects : projects.filter((p) => touchedProjectIds.has(p.id))

  const kpis = computeTeamKpis(filteredResources, filteredAllocations, loadWeeks)
  const projectHours = computeProjectHours(filteredProjects, filteredAllocations, loadWeeks)
  const trend = computeUtilizationTrend(filteredResources, filteredAllocations, TREND_WEEKS)
  const busFactorProjects = computeBusFactor(filteredProjects, filteredAllocations, loadWeeks)
  const upcomingOverallocations = computeUpcomingOverallocations(
    filteredResources,
    filteredAllocations,
    OVERALLOCATION_HORIZON_WEEKS,
  )
  const bench = computeBench(filteredResources, filteredAllocations, startOfWeek(new Date()))
  const projectHealth = computeProjectHealth(filteredProjects, filteredResources, filteredAllocations)

  const teamCapacity = filteredResources.reduce((sum, r) => sum + r.weeklyCapacityHours, 0)
  const maxProjectHours = Math.max(teamCapacity, ...projectHours.map((p) => p.avgWeeklyHours), 1)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
          <SelectTrigger className="rounded-full" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(ROLE_FILTER_LABEL) as RoleFilter[]).map((role) => (
              <SelectItem key={role} value={role}>
                {ROLE_FILTER_LABEL[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                {kpis.overallocatedCount} de {filteredResources.length}
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
        <Card>
          <CardContent className="flex items-center gap-3">
            <Users
              className={cn(
                'size-6 shrink-0',
                busFactorProjects.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
              )}
            />
            <div>
              <div
                className={cn(
                  'text-2xl font-semibold',
                  busFactorProjects.length > 0 && 'text-amber-600 dark:text-amber-400',
                )}
              >
                {busFactorProjects.length} {busFactorProjects.length === 1 ? 'projeto' : 'projetos'}
              </div>
              <div className="text-muted-foreground text-xs">Bus factor — dependem de 1 única pessoa</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saúde dos projetos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {projectHealth.map(({ project, band, reasons }) => (
            <div key={project.id} className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
              <span className="flex-1 truncate text-sm">{project.name}</span>
              {reasons.length ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className={LOAD_BAND_STYLES[band]}>
                      {band === 'available' ? 'Saudável' : band === 'near-limit' ? 'Atenção' : 'Crítico'}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>{reasons.join(' · ')}</TooltipContent>
                </Tooltip>
              ) : (
                <Badge variant="secondary" className={LOAD_BAND_STYLES[band]}>
                  Saudável
                </Badge>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Próximos estouros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingOverallocations.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nenhuma sobrealocação prevista nas próximas {OVERALLOCATION_HORIZON_WEEKS} semanas.
              </p>
            ) : (
              upcomingOverallocations.map(({ resource, weekStart, percent }) => (
                <div key={resource.id} className="flex items-center gap-3 text-sm">
                  <CalendarClock className="size-4 shrink-0 text-red-600 dark:text-red-400" />
                  <span className="flex-1">
                    <span className="font-medium">{resource.name}</span> estoura {percent}% em{' '}
                    {dateLabel(weekStart)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Banco de horas — capacidade ociosa esta semana</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {bench.length === 0 ? (
              <p className="text-muted-foreground text-sm">Ninguém com capacidade livre esta semana.</p>
            ) : (
              bench.map(({ resource, freeHours, percent }) => (
                <div key={resource.id} className="flex items-center gap-3 text-sm">
                  <BatteryLow className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span className="flex-1">
                    <span className="font-medium">{resource.name}</span> — {freeHours}h livres ({percent}% ocupado)
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

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
