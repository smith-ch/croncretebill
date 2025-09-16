"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { ProjectForm } from "@/components/forms/project-form"
import { useCurrency } from "@/hooks/use-currency"
import { useUserPermissions } from "@/hooks/use-user-permissions-simple"
import {
  Plus,
  Search,
  FolderOpen,
  Edit,
  Trash2,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  CheckCircle,
  AlertCircle,
  PauseCircle,
  XCircle,
  Filter,
  Grid,
  List,
  TrendingUp,
  Target,
  Briefcase,
} from "lucide-react"

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [clientFilter, setClientFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [editingProject, setEditingProject] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const { formatCurrency } = useCurrency()
  const { canDelete } = useUserPermissions()

  useEffect(() => {
    fetchProjects()
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      const { data, error } = await supabase.from("clients").select("id, name").eq("user_id", user.id).order("name")

      if (error) { throw error }
      setClients(data || [])
    } catch (error) {
      console.error("Error fetching clients:", error)
    }
  }

  const fetchProjects = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          clients(name),
          invoices(total)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {throw error}

      const projectsWithMetrics = (data || []).map((project) => {
        const totalInvoiced = project.invoices?.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0) || 0
        const totalExpenses = 0 // Will be 0 until expenses are properly linked to projects
        const profit = totalInvoiced - totalExpenses

        // Calculate progress based on dates
        let progress = 0
        if (project.start_date && project.end_date) {
          const start = new Date(project.start_date).getTime()
          const end = new Date(project.end_date).getTime()
          const now = Date.now()

          if (now >= end) {
            progress = 100
          } else if (now >= start) {
            progress = Math.round(((now - start) / (end - start)) * 100)
          }
        }

        return {
          ...project,
          totalInvoiced,
          totalExpenses,
          profit,
          progress: project.status === "completado" ? 100 : progress,
        }
      })

      setProjects(projectsWithMetrics)
    } catch (error) {
      console.error("Error fetching projects:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!canDelete('projects')) {
      alert("No tienes permisos para eliminar proyectos")
      return
    }
    
    if (!confirm("¿Estás seguro de que quieres eliminar este proyecto?")) {
      return
    }

    try {
      const { error } = await supabase.from("projects").delete().eq("id", id)
      if (error) { throw error }
      fetchProjects()
    } catch (error) {
      console.error("Error deleting project:", error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "activo":
        return "bg-green-100 text-green-800 border-green-200"
      case "pausado":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "completado":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "cancelado":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "activo":
        return <CheckCircle className="h-4 w-4" />
      case "pausado":
        return <PauseCircle className="h-4 w-4" />
      case "completado":
        return <Target className="h-4 w-4" />
      case "cancelado":
        return <XCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "alta":
        return "bg-red-500"
      case "media":
        return "bg-yellow-500"
      case "baja":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.clients?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || project.status === statusFilter
    const matchesClient = clientFilter === "all" || project.client_id === clientFilter

    let matchesDate = true
    if (dateFilter !== "all") {
      const now = new Date()
      const projectDate = new Date(project.start_date || project.created_at)

      switch (dateFilter) {
        case "this_month":
          matchesDate = projectDate.getMonth() === now.getMonth() && projectDate.getFullYear() === now.getFullYear()
          break
        case "last_month": {
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1)
          matchesDate =
            projectDate.getMonth() === lastMonth.getMonth() && projectDate.getFullYear() === lastMonth.getFullYear()
          break
        }
        case "this_year":
          matchesDate = projectDate.getFullYear() === now.getFullYear()
          break
      }
    }

    return matchesSearch && matchesStatus && matchesClient && matchesDate
  })

  const activeProjects = projects.filter((p) => p.status === "activo").length
  const completedThisMonth = projects.filter((p) => {
    if (p.status !== "completado") {return false}
    const completedDate = new Date(p.end_date || p.updated_at)
    const now = new Date()
    return completedDate.getMonth() === now.getMonth() && completedDate.getFullYear() === now.getFullYear()
  }).length
  const totalInvoiced = projects.reduce((sum, p) => sum + (p.totalInvoiced || 0), 0)
  const totalProfit = projects.reduce((sum, p) => sum + (p.profit || 0), 0)

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6"
      >
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-slate-800 bg-clip-text text-transparent">
            Gestión de Proyectos
          </h1>
          <p className="text-slate-600 mt-2">Administra todos tus proyectos con seguimiento completo</p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Proyecto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <ProjectForm
              project={editingProject}
              onSuccess={() => {
                setShowForm(false)
                setEditingProject(null)
                fetchProjects()
              }}
            />
          </DialogContent>
        </Dialog>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Proyectos Activos</p>
                <p className="text-3xl font-bold text-blue-800">{activeProjects}</p>
              </div>
              <div className="p-3 bg-blue-500 rounded-full">
                <Briefcase className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Completados Este Mes</p>
                <p className="text-3xl font-bold text-green-800">{completedThisMonth}</p>
              </div>
              <div className="p-3 bg-green-500 rounded-full">
                <Target className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">Total Facturado</p>
                <p className="text-3xl font-bold text-purple-800">{formatCurrency(totalInvoiced)}</p>
              </div>
              <div className="p-3 bg-purple-500 rounded-full">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-600 text-sm font-medium">Ganancia Total</p>
                <p className="text-3xl font-bold text-amber-800">{formatCurrency(totalProfit)}</p>
              </div>
              <div className="p-3 bg-amber-500 rounded-full">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-t-lg">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros Avanzados
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar proyectos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="pausado">Pausado</SelectItem>
                <SelectItem value="completado">Completado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los clientes</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los períodos</SelectItem>
                <SelectItem value="this_month">Este mes</SelectItem>
                <SelectItem value="last_month">Mes pasado</SelectItem>
                <SelectItem value="this_year">Este año</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("")
                setStatusFilter("all")
                setClientFilter("all")
                setDateFilter("all")
              }}
            >
              Limpiar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          {filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {projects.length === 0 ? "No hay proyectos" : "No se encontraron proyectos"}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {projects.length === 0
                  ? "Comienza creando tu primer proyecto"
                  : "Intenta ajustar los filtros de búsqueda"}
              </p>
              {projects.length === 0 && (
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Proyecto
                </Button>
              )}
            </div>
          ) : (
            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
              {filteredProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {viewMode === "grid" ? (
                    <Card className="hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-bold text-slate-900 text-lg">{project.name}</h3>
                              <div
                                className={`w-3 h-3 rounded-full ${getPriorityColor(project.priority || "media")}`}
                              />
                            </div>
                            <Badge className={`${getStatusColor(project.status)} flex items-center gap-1`}>
                              {getStatusIcon(project.status)}
                              {project.status}
                            </Badge>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingProject(project)
                                setShowForm(true)
                              }}
                              className="hover:bg-blue-50"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {canDelete('projects') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(project.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="space-y-3 text-sm">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Users className="h-4 w-4" />
                            <span className="font-medium">Cliente:</span> {project.clients?.name}
                          </div>

                          {project.description && (
                            <p className="text-slate-600 text-xs line-clamp-2 bg-slate-50 p-2 rounded">
                              {project.description}
                            </p>
                          )}

                          {project.address && (
                            <div className="flex items-start gap-2 text-slate-600">
                              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span className="text-xs">{project.address}</span>
                            </div>
                          )}

                          {project.start_date && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <Calendar className="h-4 w-4" />
                              <span className="text-xs">
                                Inicio: {new Date(project.start_date).toLocaleDateString()}
                                {project.end_date && ` - Fin: ${new Date(project.end_date).toLocaleDateString()}`}
                              </span>
                            </div>
                          )}

                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-medium text-slate-600">Progreso</span>
                              <span className="text-xs font-bold text-slate-800">{project.progress}%</span>
                            </div>
                            <Progress value={project.progress} className="h-2" />
                          </div>

                          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200">
                            <div className="text-center">
                              <p className="text-xs text-slate-500">Facturado</p>
                              <p className="font-bold text-green-600">{formatCurrency(project.totalInvoiced || 0)}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-slate-500">Ganancia</p>
                              <p className={`font-bold ${project.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {formatCurrency(project.profit || 0)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="hover:shadow-md transition-shadow border-0 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-3 h-3 rounded-full ${getPriorityColor(project.priority || "media")}`}
                              />
                              <h3 className="font-semibold text-slate-900">{project.name}</h3>
                            </div>
                            <Badge className={`${getStatusColor(project.status)} flex items-center gap-1`}>
                              {getStatusIcon(project.status)}
                              {project.status}
                            </Badge>
                            <span className="text-sm text-slate-600">{project.clients?.name}</span>
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                              <span>Progreso: {project.progress}%</span>
                              <span>Facturado: {formatCurrency(project.totalInvoiced || 0)}</span>
                              <span className={project.profit >= 0 ? "text-green-600" : "text-red-600"}>
                                Ganancia: {formatCurrency(project.profit || 0)}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingProject(project)
                                setShowForm(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {canDelete('projects') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(project.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
