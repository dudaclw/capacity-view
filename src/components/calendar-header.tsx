import { LABEL_WIDTH } from '@/components/capacity-grid'
import { dayOfMonth, periodContainsToday, weekdayShort, type Granularity, type Period } from '@/lib/capacity'
import { cn } from '@/lib/utils'

/** Google Calendar-style column headers: weekday + circled day number for day view, today emphasized elsewhere. */
export function CalendarHeader({
  columns,
  granularity,
  labelText,
}: {
  columns: Period[]
  granularity: Granularity
  labelText: string
}) {
  return (
    <div className="flex rounded-xl border bg-muted/40">
      <div className="shrink-0 px-3 py-2 text-sm font-medium" style={{ width: LABEL_WIDTH }}>
        {labelText}
      </div>
      <div className="flex flex-1">
        {columns.map((col, i) => {
          const isToday = periodContainsToday(col)
          return (
            <div key={i} className="flex-1 px-2 py-2 text-xs">
              {granularity === 'day' ? (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-muted-foreground">{weekdayShort(col.start)}</span>
                  <span
                    className={cn(
                      'flex size-6 items-center justify-center rounded-full font-medium',
                      isToday ? 'bg-primary text-primary-foreground' : 'text-foreground',
                    )}
                  >
                    {dayOfMonth(col.start)}
                  </span>
                </div>
              ) : (
                <span className={cn('text-muted-foreground', isToday && 'text-primary font-semibold')}>
                  {col.label}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
