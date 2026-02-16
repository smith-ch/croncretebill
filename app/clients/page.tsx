"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { ClientForm } from "@/components/forms/client-form"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Plus, Search, Users, Edit, Trash2, Mail, Phone, AlertCircle } from "lucide-react"
import { useUserPermissions } from "@/hooks/use-user-permissions-simple"
import { useDataUserId } from "@/hooks/use-data-user-id"
import { useToast } from "@/hooks/use-toast"
import { useSubscriptionLimits } from "@/hooks/use-subscription-limits"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [editingClient, setEditingClient] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean, id: string | null}>({show: false, id: null})
  const [isDeleting, setIsDeleting] = useState(false)
  const { canDelete, canEdit } = useUserPermissions()
  const { dataUserId, loading: userIdLoading } = useDataUserId()
  const { toast } = useToast()
  const { limits, usage, canAddClients, remainingClients, refreshUsage } = useSubscriptionLimits()

  useEffect(() => {
    if (!userIdLoading && dataUserId) {
      fetchClients()
    }
  }, [dataUserId, userIdLoading])

  const fetchClients = async () => {
    try {
      if (!dataUserId) {
        return
      }

      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", dataUserId)
        .order("created_at", { ascending: false })

      if (error) { throw error }
      setClients(data || [])
      refreshUsage()
    } catch (error) {
      console.error("Error fetching clients:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!canDelete('clients')) {
      toast({
        title: "Permiso denegado",
        description: "No tienes permisos para eliminar clientes",
        variant: "destructive"
      })
      return
    }
    
    setDeleteConfirm({show: true, id})
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return

    setIsDeleting(true)
    try {
      const { error } = await supabase.from("clients").delete().eq("id", deleteConfirm.id)
      if (error) throw error
      
      toast({
        title: "Cliente eliminado",
        description: "El cliente ha sido eliminado exitosamente"
      })
      fetchClients()
    } catch (error) {
      console.error("Error deleting client:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el cliente",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
      setDeleteConfirm({show: false, id: null})
    }
  }

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 lg:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header skeleton */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-gray-200 rounded-xl skeleton"></div>
                <div>
                  <div className="h-8 w-48 bg-gray-200 rounded skeleton mb-2"></div>
                  <div className="h-4 w-64 bg-gray-200 rounded skeleton"></div>
                </div>
              </div>
            </div>
            <div className="h-10 w-full sm:w-40 bg-gray-200 rounded-lg skeleton"></div>
          </div>
          
          {/* Search skeleton */}
          <Card className="border-0 shadow-lg skeleton">
            <CardContent className="p-6">
              <div className="h-10 w-full bg-gray-200 rounded"></div>
            </CardContent>
          </Card>

          {/* Client cards skeleton */}
          <div className="grid gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="border-0 shadow-lg skeleton animate-slide-up" style={{animationDelay: `${i * 0.1}s`}}>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="h-6 w-48 bg-gray-200 rounded"></div>
                      <div className="flex gap-2">
                        <div className="h-9 w-9 bg-gray-200 rounded"></div>
                        <div className="h-9 w-9 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 w-full bg-gray-200 rounded"></div>
                      <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-3 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-4 lg:space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col space-y-4 lg:flex-row lg:justify-between lg:items-center lg:space-y-0 gap-4 lg:gap-6"
        >
          <div className="space-y-2 lg:space-y-3">
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="p-2 lg:p-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl lg:rounded-2xl shadow-lg">
                <Users className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-4xl xl:text-5xl font-bold text-slate-200">
                  Clientes
                </h1>
                <p className="text-sm lg:text-lg text-slate-400 font-medium">Gestiona tu cartera de clientes</p>
              </div>
            </div>
          </div>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button 
                onClick={(e) => {
                  if (!canAddClients()) {
                    e.preventDefault()
                    toast({
                      title: "Límite alcanzado",
                      description: `Has alcanzado el límite de ${limits.maxClients} clientes de tu ${limits.planDisplayName}. Actualiza tu plan para continuar.`,
                      variant: "destructive",
                    })
                  }
                }}
                className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-white border-0"
              >
                <Plus className="h-4 w-4 mr-2" />
                {canAddClients() ? "Nuevo Cliente" : "Límite Alcanzado"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
              <div className="p-6 [&_.card]:border-0 [&_.card]:shadow-none [&_.card]:bg-transparent">
                <ClientForm
                  client={editingClient}
                  onSuccess={() => {
                    setShowForm(false)
                    setEditingClient(null)
                    fetchClients()
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        {!limits.isLoading && remainingClients <= 2 && (
          <Alert className={remainingClients === 0 ? "border-red-500 bg-red-900/30" : "border-amber-500 bg-amber-900/30"}>
            <AlertCircle className={remainingClients === 0 ? "h-4 w-4 text-red-600" : "h-4 w-4 text-amber-600"} />
            <AlertDescription className={remainingClients === 0 ? "text-red-300" : "text-amber-300"}>
              {remainingClients === 0 ? (
                <span>
                  <strong>Límite alcanzado:</strong> Has usado todos los {limits.maxClients} clientes de tu {limits.planDisplayName}. 
                  <Link href="/subscriptions/my-subscription" className="underline font-semibold ml-1">Actualiza tu plan</Link>
                </span>
              ) : (
                <span>
                  <strong>Atención:</strong> Te quedan solo {remainingClients} cliente(s) de {limits.maxClients} en tu {limits.planDisplayName}. 
                  <Link href="/subscriptions/my-subscription" className="underline font-semibold ml-1">Ver planes</Link>
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Card variant="elevated" className="border-0 shadow-2xl bg-slate-900/80 backdrop-blur-sm border-slate-700">
          <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar clientes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-purple-800 focus:border-purple-400 focus:ring-purple-400"
                  variant="modern"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {filteredClients.length === 0 ? (
              <div className="text-center py-16">
                <div className="mb-6 mx-auto w-24 h-24 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center">
                  <Users className="h-12 w-12 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-200 mb-3">No hay clientes registrados</h3>
                <p className="text-slate-400 mb-6 max-w-md mx-auto">Comienza a construir tu cartera de clientes agregando tu primer cliente</p>
                <Button 
                  onClick={() => {
                    if (canAddClients()) {
                      setShowForm(true)
                    } else {
                      toast({
                        title: "Límite alcanzado",
                        description: `Has alcanzado el límite de ${limits.maxClients} clientes de tu ${limits.planDisplayName}. Actualiza tu plan para continuar.`,
                        variant: "destructive",
                      })
                    }
                  }}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {canAddClients() ? "Agregar Primer Cliente" : "Límite Alcanzado"}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClients.map((client, index) => (
                  <motion.div
                    key={client.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="card-hover border-0 shadow-lg bg-gradient-to-br from-slate-900 to-purple-50/30 overflow-hidden group animate-slide-up" style={{animationDelay: `${index * 0.05}s`}}>
                    <CardContent className="p-4 lg:p-6">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-lg text-slate-200 dark:text-white group-hover:text-purple-400 transition-colors truncate">{client.name}</h3>
                        <div className="flex gap-1">
                          {canEdit('clients') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingClient(client)
                                setShowForm(true)
                              }}
                              className="hover:bg-slate-800 hover:text-blue-400 transition-all duration-200 hover:scale-110 active:scale-95 tap-target"
                              title="Editar cliente"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete('clients') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(client.id)}
                              className="text-red-600 hover:bg-red-900/30 hover:text-red-400 transition-all duration-200 hover:scale-110 active:scale-95 tap-target"
                              title="Eliminar cliente"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        {client.rnc && (
                          <p className="text-slate-400 dark:text-gray-400">
                            <span className="font-medium">RNC:</span> {client.rnc}
                          </p>
                        )}
                        {client.cedula && (
                          <p className="text-slate-400 dark:text-gray-400">
                            <span className="font-medium">Cédula:</span> {client.cedula}
                          </p>
                        )}
                        {client.contact_person && (
                          <p className="text-slate-400 dark:text-gray-400">
                            <span className="font-medium">Contacto:</span> {client.contact_person}
                          </p>
                        )}
                        {client.email && (
                          <div className="flex items-center gap-2 text-slate-400 dark:text-gray-400">
                            <Mail className="h-4 w-4" />
                            <span>{client.email}</span>
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-2 text-slate-400 dark:text-gray-400">
                            <Phone className="h-4 w-4" />
                            <span>{client.phone}</span>
                          </div>
                        )}
                        {client.address && <p className="text-slate-400 dark:text-gray-400 text-xs">{client.address}</p>}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      <ConfirmDialog
        open={deleteConfirm.show}
        onOpenChange={(isOpen) => setDeleteConfirm({show: isOpen, id: null})}
        title="Eliminar Cliente"
        description="¿Estás seguro de que quieres eliminar este cliente? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  )
}
