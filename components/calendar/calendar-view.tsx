"use client"
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns"
import { es } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface CalendarEvent {
  id: string
  title: string
  start_date: string
  start_time?: string
  is_all_day: boolean
  event_type_name?: string
  event_type_color?: string
  priority: string
  status: string
  invoice_number?: string
}

interface CalendarViewProps {
  view: "month" | "week" | "day"
  currentDate: Date
  events: CalendarEvent[]
  loading: boolean
  onEventClick: (event: CalendarEvent) => void
  onDateClick: (date: Date) => void
}

export function CalendarView({ view, currentDate, events, loading, onEventClick, onDateClick }: CalendarViewProps) {
  if (loading) {
    return <CalendarSkeleton view={view} />
  }

  switch (view) {
    case "month":
      return (
        <MonthView currentDate={currentDate} events={events} onEventClick={onEventClick} onDateClick={onDateClick} />
      )
    case "week":
      return (
        <WeekView currentDate={currentDate} events={events} onEventClick={onEventClick} onDateClick={onDateClick} />
      )
    case "day":
      return <DayView currentDate={currentDate} events={events} onEventClick={onEventClick} onDateClick={onDateClick} />
    default:
      return null
  }
}

function MonthView({ currentDate, events, onEventClick, onDateClick }: any) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const dateFormat = "d"
  const rows = []
  let days = []
  let day = startDate

  // Header with day names
  const dayNames = []
  for (let i = 0; i < 7; i++) {
    dayNames.push(
      <div key={i} className="p-3 text-center font-medium text-muted-foreground bg-muted">
        {format(addDays(startDate, i), "EEE", { locale: es })}
      </div>,
    )
  }

  // Generate calendar grid
  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      const dayEvents = events.filter((event: CalendarEvent) => isSameDay(new Date(event.start_date), day))

      days.push(
        <CalendarCell
          key={day.toString()}
          date={new Date(day)}
          events={dayEvents}
          isCurrentMonth={isSameMonth(day, monthStart)}
          isToday={isToday(day)}
          onEventClick={onEventClick}
          onDateClick={onDateClick}
        />,
      )
      day = addDays(day, 1)
    }
    rows.push(
      <div key={day.toString()} className="calendar-grid">
        {days}
      </div>,
    )
    days = []
  }

  return (
    <div className="w-full">
      <div className="calendar-grid">{dayNames}</div>
      {rows}
    </div>
  )
}

function WeekView({ currentDate, events, onEventClick, onDateClick }: any) {
  const startDate = startOfWeek(currentDate, { weekStartsOn: 0 })
  const days = []

  for (let i = 0; i < 7; i++) {
    const day = addDays(startDate, i)
    const dayEvents = events.filter((event: CalendarEvent) => isSameDay(new Date(event.start_date), day))

    days.push(
      <CalendarCell
        key={day.toString()}
        date={day}
        events={dayEvents}
        isCurrentMonth={true}
        isToday={isToday(day)}
        onEventClick={onEventClick}
        onDateClick={onDateClick}
        className="min-h-[200px]"
      />,
    )
  }

  return (
    <div className="w-full">
      <div className="calendar-grid">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="p-3 text-center font-medium text-muted-foreground bg-muted">
            {format(addDays(startDate, i), "EEE d", { locale: es })}
          </div>
        ))}
      </div>
      <div className="calendar-grid">{days}</div>
    </div>
  )
}

function DayView({ currentDate, events, onEventClick, onDateClick }: any) {
  const dayEvents = events.filter((event: CalendarEvent) => isSameDay(new Date(event.start_date), currentDate))

  return (
    <div className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}</h3>
      </div>

      <div className="space-y-2">
        {dayEvents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No hay eventos programados para este día</div>
        ) : (
          dayEvents.map((event: CalendarEvent) => (
            <EventCard key={event.id} event={event} onClick={() => onEventClick(event)} />
          ))
        )}
      </div>
    </div>
  )
}

function CalendarCell({ date, events, isCurrentMonth, isToday, onEventClick, onDateClick, className }: any) {
  return (
    <div
      className={cn(
        "calendar-cell",
        {
          "calendar-cell-today": isToday,
          "calendar-cell-other-month": !isCurrentMonth,
        },
        className,
      )}
      onClick={() => onDateClick(date)}
    >
      <div className="flex justify-between items-start mb-2">
        <span className={cn("text-sm font-medium", isToday && "text-primary font-bold")}>{format(date, "d")}</span>
        {events.length > 3 && (
          <Badge variant="secondary" className="text-xs">
            +{events.length - 3}
          </Badge>
        )}
      </div>

      <div className="space-y-1">
        {events.slice(0, 3).map((event: CalendarEvent) => (
          <div
            key={event.id}
            className="text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity"
            style={{ backgroundColor: event.event_type_color || "#3B82F6" }}
            onClick={(e) => {
              e.stopPropagation()
              onEventClick(event)
            }}
          >
            <div className="text-white font-medium truncate">{event.title}</div>
            {event.start_time && !event.is_all_day && <div className="text-white/80">{event.start_time}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

function EventCard({ event, onClick }: any) {
  return (
    <div
      className="p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow"
      style={{ borderLeftColor: event.event_type_color || "#3B82F6", borderLeftWidth: "4px" }}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium">{event.title}</h4>
          {event.start_time && !event.is_all_day && <p className="text-sm text-muted-foreground">{event.start_time}</p>}
          {event.invoice_number && <p className="text-xs text-blue-600 font-medium">Factura: {event.invoice_number}</p>}
        </div>
        <Badge variant={event.priority === "high" ? "destructive" : "secondary"}>{event.priority}</Badge>
      </div>
    </div>
  )
}

function CalendarSkeleton({ view }: { view: string }) {
  if (view === "month") {
    return (
      <div className="w-full">
        <div className="calendar-grid">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
        {Array.from({ length: 5 }, (_, weekIndex) => (
          <div key={weekIndex} className="calendar-grid">
            {Array.from({ length: 7 }, (_, dayIndex) => (
              <Skeleton key={dayIndex} className="min-h-[120px]" />
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  )
}
