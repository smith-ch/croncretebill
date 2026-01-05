import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

/**
 * Hook to check if user's subscription plan has access to specific features
 * Free plan is restricted from accessing certain pages
 */
export function usePlanAccess() {
  const [planName, setPlanName] = useState<string>('free')
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadPlanName()
  }, [])

  async function loadPlanName() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setIsLoading(false)
        return
      }

      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select(`
          subscription_plans (
            name
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (subscription) {
        const sub = subscription as any
        setPlanName(sub.subscription_plans?.name || 'free')
      } else {
        setPlanName('free')
      }
    } catch (error) {
      console.error('Error loading plan:', error)
      setPlanName('free')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Check if current plan has access to advanced features
   * Free plan is restricted from: DGII reports, monthly reports, agenda, projects, expenses, vehicles, drivers, delivery notes
   */
  function hasAccessToAdvancedFeatures(): boolean {
    return planName !== 'free'
  }

  /**
   * Check if current plan has access to DGII reports
   */
  function hasAccessToDGIIReports(): boolean {
    return planName !== 'free'
  }

  /**
   * Check if current plan has access to monthly reports
   */
  function hasAccessToMonthlyReports(): boolean {
    return planName !== 'free'
  }

  /**
   * Check if current plan has access to agenda/calendar
   */
  function hasAccessToAgenda(): boolean {
    return planName !== 'free'
  }

  /**
   * Check if current plan has access to projects module
   */
  function hasAccessToProjects(): boolean {
    return planName !== 'free'
  }

  /**
   * Check if current plan has access to expenses module
   */
  function hasAccessToExpenses(): boolean {
    return planName !== 'free'
  }

  /**
   * Check if current plan has access to vehicles module
   */
  function hasAccessToVehicles(): boolean {
    return planName !== 'free'
  }

  /**
   * Check if current plan has access to drivers module
   */
  function hasAccessToDrivers(): boolean {
    return planName !== 'free'
  }

  /**
   * Check if current plan has access to delivery notes module
   */
  function hasAccessToDeliveryNotes(): boolean {
    return planName !== 'free'
  }

  /**
   * Redirect to upgrade page if user doesn't have access
   * Shows a toast message explaining the restriction
   */
  function requireAccess(featureName: string, hasAccess: boolean) {
    if (!hasAccess && !isLoading) {
      toast.error(`Acceso Restringido`, {
        description: `El ${featureName} no está disponible en el Plan Gratuito. Actualiza tu plan para acceder.`,
        action: {
          label: 'Ver Planes',
          onClick: () => router.push('/subscriptions/my-subscription'),
        },
        duration: 5000,
      })
      router.push('/dashboard')
      return false
    }
    return true
  }

  return {
    planName,
    isLoading,
    hasAccessToAdvancedFeatures,
    hasAccessToDGIIReports,
    hasAccessToMonthlyReports,
    hasAccessToAgenda,
    hasAccessToProjects,
    hasAccessToExpenses,
    hasAccessToVehicles,
    hasAccessToDrivers,
    hasAccessToDeliveryNotes,
    requireAccess,
  }
}
