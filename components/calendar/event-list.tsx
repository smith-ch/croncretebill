"use client"

import { format, isToday, isTomorrow, isYesterday } from "date-fns"
import { es } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar, Clock, MapPin, User, FileText } from "lucide-react"

interface EventListProps {
  events: any[]
  onEventClick: (event: any) => void
  loading: boolean
}

export function EventList({ events, onEventClick, loading }: EventListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No hay eventos próximos</p>
      </div>
    )
  }

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString)

    if (isToday(date)) {
      return "Hoy"
    } else if (isTomorrow(date)) {
      return "Mañana"
    } else if (isYesterday(date)) {
      return "Ayer"
    } else {
      return format(date, "d MMM", { locale: es })
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-600"
      case "high":
        return "bg-red-500"
      case "medium":
        return "bg-yellow-500"
      case "low":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div
          key={event.id}
          className="p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
          onClick={() => onEventClick(event)}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: event.event_type_color || "#3B82F6" }}
              />
              <h4 className="font-medium text-sm leading-tight">{event.title}</h4>
            </div>
            <Badge variant="secondary" className={`text-xs ${getPriorityColor(event.priority)} text-white`}>
              {event.priority}
            </Badge>
          </div>

          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{formatEventDate(event.start_date)}</span>
            </div>

            {event.start_time && !event.is_all_day && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{event.start_time}</span>
              </div>
            )}

            {event.client_name && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{event.client_name}</span>
              </div>
            )}

            {event.invoice_number && (
              <div className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                <span>Factura: {event.invoice_number}</span>
              </div>
            )}

            {event.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
          </div>

          {event.event_type_name && (
            <div className="mt-2">
              <Badge variant="outline" className="text-xs">
                {event.event_type_name}
              </Badge>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
