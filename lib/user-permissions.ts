import { supabase } from './supabase'

/**
 * Función para verificar y reparar el perfil de un usuario
 * Útil para diagnosticar problemas de permisos
 */
export async function ensureUserProfile(userId?: string) {
  try {
    // Obtener el usuario actual si no se proporciona ID
    let user
    if (userId) {
      const { data: userData } = await supabase.auth.getSession()
      if (userData.session?.user?.id !== userId) {
        throw new Error("ID de usuario no coincide con el usuario autenticado")
      }
      user = userData.session?.user
    } else {
      const { data: userData, error: userError } = await supabase.auth.getSession()
      if (userError || !userData.session?.user) {
        throw new Error("Usuario no autenticado")
      }
      user = userData.session?.user
    }

    // Verificar si existe el perfil
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (profile && !profileError) {
      return {
        success: true,
        profile,
        message: "Perfil existe y es válido"
      }
    }

    // Si no existe el perfil, intentar crearlo
    const { data: newProfile, error: createError } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name || "",
        company_name: user.user_metadata?.company_name || "",
        role: "vendedor"
      } as any)
      .select()
      .single()

    if (createError) {
      return {
        success: false,
        error: createError,
        message: "No se pudo crear el perfil automáticamente"
      }
    }

    return {
      success: true,
      profile: newProfile,
      message: "Perfil creado exitosamente"
    }

  } catch (error: any) {
    return {
      success: false,
      error,
      message: error.message || "Error al verificar perfil de usuario"
    }
  }
}

/**
 * Función para diagnosticar problemas comunes de permisos
 */
export async function diagnosePermissionIssues() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) {
      return {
        success: false,
        message: "Usuario no autenticado",
        issues: ["NO_AUTH"]
      }
    }

    const issues: string[] = []
    const diagnostics: any = {
      userId: user.id,
      email: user.email,
      issues: [],
      recommendations: []
    }

    // Verificar perfil
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (!profile || profileError) {
      issues.push("NO_PROFILE")
      diagnostics.recommendations.push("Crear perfil de usuario")
    } else {
      diagnostics.profile = profile
    }

    // Verificar si puede crear clientes
    try {
      const { count, error: clientsError } = await supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)

      if (clientsError) {
        issues.push("CLIENTS_PERMISSION_ERROR")
        diagnostics.recommendations.push("Verificar políticas RLS para clientes")
        diagnostics.clientsError = clientsError.message
      } else {
        diagnostics.clientsCount = count
      }
    } catch (error: any) {
      issues.push("CLIENTS_ACCESS_ERROR")
      diagnostics.clientsAccessError = error.message
    }

    // Verificar si puede crear productos
    try {
      const { count, error: productsError } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)

      if (productsError) {
        issues.push("PRODUCTS_PERMISSION_ERROR")
        diagnostics.recommendations.push("Verificar políticas RLS para productos")
        diagnostics.productsError = productsError.message
      } else {
        diagnostics.productsCount = count
      }
    } catch (error: any) {
      issues.push("PRODUCTS_ACCESS_ERROR")
      diagnostics.productsAccessError = error.message
    }

    return {
      success: issues.length === 0,
      issues,
      diagnostics,
      message: issues.length === 0
        ? "No se encontraron problemas de permisos"
        : `Se encontraron ${issues.length} problemas de permisos`
    }

  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Error al diagnosticar problemas de permisos",
      issues: ["UNKNOWN_ERROR"]
    }
  }
}

/**
 * Función para reparar problemas comunes de permisos
 */
export async function repairUserPermissions() {
  try {
    // Primero asegurar que el perfil existe
    const profileResult = await ensureUserProfile()
    if (!profileResult.success) {
      return profileResult
    }

    // Ejecutar diagnóstico para verificar si los problemas se resolvieron
    const diagnosis = await diagnosePermissionIssues()

    return {
      success: diagnosis.success,
      message: diagnosis.success
        ? "Permisos reparados exitosamente"
        : "Algunos problemas de permisos persisten",
      profileResult,
      diagnosis
    }

  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Error al reparar permisos",
      error
    }
  }
}