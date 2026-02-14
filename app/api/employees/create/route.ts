import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase environment variables not found. API routes may not work properly.');
}

const supabaseAdmin = supabaseUrl && supabaseServiceKey ? 
  createClient(supabaseUrl, supabaseServiceKey) : null;

export async function POST(request: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database configuration error' },
        { status: 500 }
      );
    }

    // Obtener el token del header de autorización
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verificar el usuario usando el token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verificar que el usuario es un owner
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('parent_user_id, is_active')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.parent_user_id !== null) {
      return NextResponse.json(
        { error: 'Solo los propietarios pueden crear empleados' },
        { status: 403 }
      );
    }

    // Verificar límite de empleados según plan de suscripción
    const { data: subscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select(`
        current_max_users,
        subscription_plans!inner (
          name,
          display_name
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!subscription) {
      return NextResponse.json(
        { error: 'No tienes una suscripción activa' },
        { status: 403 }
      );
    }

    const sub = subscription as any;
    const maxUsers = sub.current_max_users || 1;
    const planName = sub.subscription_plans?.display_name || 'Desconocido';

    // Plan gratuito no permite empleados (max_users = 1 = solo owner)
    if (maxUsers <= 1) {
      return NextResponse.json(
        { error: `Tu plan "${planName}" no permite crear empleados. Actualiza tu plan para agregar empleados a tu equipo.` },
        { status: 403 }
      );
    }

    // Contar empleados actuales
    const { count: currentEmployees } = await supabaseAdmin
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('parent_user_id', user.id);

    if (currentEmployees !== null && currentEmployees >= maxUsers - 1) {
      return NextResponse.json(
        { error: `Has alcanzado el límite de ${maxUsers - 1} empleado(s) de tu plan "${planName}". Actualiza tu plan para agregar más empleados.` },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      email,
      password,
      displayName,
      canCreateInvoices,
      canViewFinances,
      canManageInventory,
      canManageClients,
      department,
      jobPosition,
    } = body;

    // Validaciones
    if (!email || !password || !displayName) {
      return NextResponse.json(
        { error: 'Email, contraseña y nombre son requeridos' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    console.log('Creating user with email:', email);

    // NUEVO MÉTODO: Usar Admin API oficial de Supabase (más confiable)
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: password,
      email_confirm: true, // Email confirmado automáticamente
      user_metadata: {
        display_name: displayName,
      },
    });

    if (createUserError || !newUser.user) {
      console.error('Error creating user with Admin API:', createUserError);
      return NextResponse.json(
        { error: `Error al crear el usuario: ${createUserError?.message || 'Error desconocido'}` },
        { status: 400 }
      );
    }

    const newUserId = newUser.user.id;
    console.log('User created successfully with Admin API:', newUserId);

    // Obtener role_id de employee
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('name', 'employee')
      .single();

    const employeeRoleId = roleData?.id;

    // Crear perfil del empleado en user_profiles
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        user_id: newUserId,
        parent_user_id: user.id,
        root_owner_id: user.id,
        role_id: employeeRoleId,
        email: email.toLowerCase().trim(),
        display_name: displayName,
        department: department || null,
        job_position: jobPosition || null,
        can_create_invoices: canCreateInvoices || false,
        can_view_finances: canViewFinances || false,
        can_manage_inventory: canManageInventory || false,
        can_manage_clients: canManageClients || false,
        can_manage_users: false,
        is_active: true,
        allowed_modules: ['invoices', 'clients', 'products', 'inventory'],
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Si falla el perfil, eliminar el usuario creado
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return NextResponse.json(
        { error: `Error al crear el perfil: ${profileError.message}` },
        { status: 400 }
      );
    }

    console.log('Profile created successfully for user:', newUserId);

    // Retornar éxito
    return NextResponse.json({
      success: true,
      user_id: newUserId,
      email: email.toLowerCase().trim(),
      display_name: displayName,
      message: 'Empleado creado exitosamente. Puede iniciar sesión inmediatamente.',
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: `Error inesperado: ${error.message}` },
      { status: 500 }
    );
  }
}
