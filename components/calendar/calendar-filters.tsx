"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Filter, X } from "lucide-react"

interface CalendarFiltersProps {
  selectedFilters: string[]
  onFiltersChange: (filters: string[]) => void
}

export function CalendarFilters({ selectedFilters, onFiltersChange }: CalendarFiltersProps) {
  const [open, setOpen] = useState(false)

  const eventTypes = [
    { name: "Vencimiento de Factura", color: "#EF4444" },
    { name: "Gasto Recurrente", color: "#F59E0B" },
    { name: "Reunión con Cliente", color: "#10B981" },
    { name: "Cierre Contable", color: "#8B5CF6" },
    { name: "Recordatorio", color: "#6B7280" },
  ]

  const handleFilterToggle = (filterName: string) => {
    const newFilters = selectedFilters.includes(filterName)
      ? selectedFilters.filter((f) => f !== filterName)
      : [...selectedFilters, filterName]

    onFiltersChange(newFilters)
  }

  const clearFilters = () => {
    onFiltersChange([])
  }

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="relative bg-transparent">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
            {selectedFilters.length > 0 && (
              <Badge className="ml-2 px-1 py-0 text-xs min-w-[1.25rem] h-5">{selectedFilters.length}</Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filtrar por tipo de evento</h4>
              {selectedFilters.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-auto p-1 text-xs">
                  Limpiar
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {eventTypes.map((type) => (
                <div key={type.name} className="flex items-center space-x-2">
                  <Checkbox
                    id={type.name}
                    checked={selectedFilters.includes(type.name)}
                    onCheckedChange={() => handleFilterToggle(type.name)}
                  />
                  <label
                    htmlFor={type.name}
                    className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                    {type.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filters */}
      {selectedFilters.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {selectedFilters.map((filter) => {
            const eventType = eventTypes.find((t) => t.name === filter)
            return (
              <Badge key={filter} variant="secondary" className="text-xs flex items-center gap-1">
                {eventType && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: eventType.color }} />}
                {filter}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-destructive"
                  onClick={() => handleFilterToggle(filter)}
                />
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}
