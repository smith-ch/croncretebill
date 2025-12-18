import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

export interface Service {
  id: string
  name: string
  service_code: string
  description: string | null
  base_price: number
  user_id: string
  created_at: string
  updated_at: string
}

export interface CreateServiceData {
  name: string
  description?: string
  base_price: number
}

export interface UpdateServiceData extends CreateServiceData {
  id: string
}

export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: async (): Promise<Service[]> => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      
      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', user.id)
        .order('service_code', { ascending: true })
      
      if (error) {
        throw new Error(error.message)
      }
      
      return data || []
    }
  })
}

export function useService(id: string) {
  return useQuery({
    queryKey: ['services', id],
    queryFn: async (): Promise<Service | null> => {
      if (!id) {
        return null
      }
      
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      
      if (!user) {
        throw new Error('Usuario no autenticado')
      }
      
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()
      
      if (error) {
        throw new Error(error.message)
      }
      
      return data
    },
    enabled: !!id
  })
}

export function useCreateService() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async (data: CreateServiceData): Promise<Service> => {
      const { data: service, error } = await supabase
        .from('services')
        .insert(data)
        .select()
        .single()
      
      if (error) {
        throw new Error(error.message)
      }
      
      return service
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      toast({
        title: "Servicio creado",
        description: "El servicio se ha creado exitosamente"
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error al crear servicio",
        description: error.message,
        variant: "destructive"
      })
    }
  })
}

export function useUpdateService() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async (data: UpdateServiceData): Promise<Service> => {
      const { id, ...updateData } = data
      const { data: service, error } = await supabase
        .from('services')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new Error(error.message)
      }
      
      return service
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      queryClient.invalidateQueries({ queryKey: ['services', variables.id] })
      toast({
        title: "Servicio actualizado",
        description: "El servicio se ha actualizado exitosamente"
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar servicio",
        description: error.message,
        variant: "destructive"
      })
    }
  })
}

export function useDeleteService() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id)
      
      if (error) {
        throw new Error(error.message)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      toast({
        title: "Servicio eliminado",
        description: "El servicio se ha eliminado exitosamente"
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error al eliminar servicio",
        description: error.message,
        variant: "destructive"
      })
    }
  })
}

export function useSearchServices(searchTerm: string) {
  return useQuery({
    queryKey: ['services', 'search', searchTerm],
    queryFn: async (): Promise<Service[]> => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      
      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      if (!searchTerm) {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('user_id', user.id)
          .order('service_code', { ascending: true })
        
        if (error) {
          throw new Error(error.message)
        }
        
        return data || []
      }
      
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', user.id)
        .or(`name.ilike.%${searchTerm}%,service_code.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('service_code', { ascending: true })
      
      if (error) {
        throw new Error(error.message)
      }
      
      return data || []
    }
  })
}