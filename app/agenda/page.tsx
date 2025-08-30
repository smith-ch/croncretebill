"use client"

import { useState, useEffect } from "react"
import { Calendar, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarView } from "@/components/calendar/calendar-view"
import { EventDialog } from "@/components/calendar/event-dialog"
import { EventList } from "@/components/calendar/event-list"
import { CalendarFilters } from "@/components/calendar/calendar-filters"
import { useNotifications } from "@/hooks/use-notifications"
import { createClient } from "@/lib/supabase/client"

interface CalendarEvent {
  id: string
  title: string
  description?: string
  start_date: string
  end_date?: string
  start_time?: string
  end_time?: string
  is_all_day: boolean
  event_type_name?: string
  event_type_color?: string
  event_type_icon?: string
  priority: string
  status: string
  client_name?: string
  project_name?: string
  invoice_number?: string
}

export default function AgendaPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<"month" | "week" | "day">("month")
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [showEventDialog, setShowEventDialog] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const { notifySuccess, notifyError } = useNotifications()
  const supabase = createClient()

  useEffect(() => {
    fetchEvents()
  }, [currentDate, view])

  useEffect(() => {
    filterEvents()
  }, [events, searchTerm, selectedFilters])

  const fetchEvents = async () => {
    try {
      setLoading(true)

      // Calculate date range based on current view
      const startDate = getViewStartDate()
      const endDate = getViewEndDate()

      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return

      const { data, error } = await supabase.rpc("get_events_in_range", {
        p_user_id: user.user.id,
        p_start_date: startDate.toISOString().split("T")[0],
        p_end_date: endDate.toISOString().split("T")[0],
      })

      if (error) throw error

      setEvents(data || [])
    } catch (error) {
      console.error("Error fetching events:", error)
      notifyError("Error al cargar los eventos")
    } finally {
      setLoading(false)
    }
  }

  const getViewStartDate = () => {
    const date = new Date(currentDate)
    switch (view) {
      case "month":
        date.setDate(1)
        date.setDate(date.getDate() - date.getDay())
        return date
      case "week":
        date.setDate(date.getDate() - date.getDay())
        return date
      case "day":
        return date
      default:
        return date
    }
  }

  const getViewEndDate = () => {
    const date = new Date(currentDate)
    switch (view) {
      case "month":
        date.setMonth(date.getMonth() + 1, 0)
        date.setDate(date.getDate() + (6 - date.getDay()))
        return date
      case "week":
        date.setDate(date.getDate() - date.getDay() + 6)
        return date
      case "day":
        return date
      default:
        return date
    }
  }

  const filterEvents = () => {
    let filtered = events

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (event) =>
          event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.project_name?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Filter by event types
    if (selectedFilters.length > 0) {
      filtered = filtered.filter((event) => selectedFilters.includes(event.event_type_name || ""))
    }

    setFilteredEvents(filtered)
  }

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate)
    switch (view) {
      case "month":
        newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1))
        break
      case "week":
        newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7))
        break
      case "day":
        newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1))
        break
    }
    setCurrentDate(newDate)
  }

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setShowEventDialog(true)
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setSelectedEvent(null)
    setShowEventDialog(true)
  }

  const handleEventSave = async (eventData: any) => {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return

      if (selectedEvent) {
        // Update existing event
        const { error } = await supabase
          .from("calendar_events")
          .update({
            ...eventData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedEvent.id)

        if (error) throw error
        notifySuccess("Evento actualizado correctamente")
      } else {
        // Create new event
        const { error } = await supabase.from("calendar_events").insert({
          ...eventData,
          user_id: user.user.id,
        })

        if (error) throw error
        notifySuccess("Evento creado correctamente")
      }

      setShowEventDialog(false)
      setSelectedEvent(null)
      setSelectedDate(null)
      fetchEvents()
    } catch (error) {
      console.error("Error saving event:", error)
      notifyError("Error al guardar el evento")
    }
  }

  const handleEventDelete = async (eventId: string) => {
    try {
      const { error } = await supabase.from("calendar_events").delete().eq("id", eventId)

      if (error) throw error

      notifySuccess("Evento eliminado correctamente")
      setShowEventDialog(false)
      setSelectedEvent(null)
      fetchEvents()
    } catch (error) {
      console.error("Error deleting event:", error)
      notifyError("Error al eliminar el evento")
    }
  }

  const formatDateRange = () => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
    }

    switch (view) {
      case "month":
        return currentDate.toLocaleDateString("es-ES", options)
      case "week":
        const startOfWeek = new Date(currentDate)
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        return `${startOfWeek.toLocaleDateString("es-ES", { day: "numeric", month: "short" })} - ${endOfWeek.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}`
      case "day":
        return currentDate.toLocaleDateString("es-ES", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      default:
        return ""
    }
  }

  return (
    <div className="container-responsive py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="heading-responsive font-bold gradient-brand-text">Agenda</h1>
          <p className="text-muted-foreground">Gestiona tus eventos, vencimientos y recordatorios</p>
        </div>
        <Button
          onClick={() => {
            setSelectedEvent(null)
            setSelectedDate(new Date())
            setShowEventDialog(true)
          }}
          className="gradient-brand hover-brand"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Evento
        </Button>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Date Navigation */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateDate("prev")}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="min-w-[200px] text-center">
                <h2 className="font-semibold text-lg">{formatDateRange()}</h2>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigateDate("next")}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                Hoy
              </Button>
            </div>

            {/* View Tabs */}
            <Tabs value={view} onValueChange={(value) => setView(value as any)}>
              <TabsList>
                <TabsTrigger value="month">Mes</TabsTrigger>
                <TabsTrigger value="week">Semana</TabsTrigger>
                <TabsTrigger value="day">Día</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Search and Filters */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar eventos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
              <CalendarFilters selectedFilters={selectedFilters} onFiltersChange={setSelectedFilters} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Content */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Main Calendar View */}
        <div className="xl:col-span-3">
          <Card>
            <CardContent className="p-0">
              <CalendarView
                view={view}
                currentDate={currentDate}
                events={filteredEvents}
                loading={loading}
                onEventClick={handleEventClick}
                onDateClick={handleDateClick}
              />
            </CardContent>
          </Card>
        </div>

        {/* Event List Sidebar */}
        <div className="xl:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Próximos Eventos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EventList
                events={filteredEvents.filter((event) => new Date(event.start_date) >= new Date()).slice(0, 10)}
                onEventClick={handleEventClick}
                loading={loading}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Event Dialog */}
      <EventDialog
        open={showEventDialog}
        onOpenChange={setShowEventDialog}
        event={selectedEvent}
        selectedDate={selectedDate}
        onSave={handleEventSave}
        onDelete={handleEventDelete}
      />
    </div>
  )
}
