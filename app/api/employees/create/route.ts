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

    // Usar la función de base de datos para crear el empleado
    const { data: result, error: rpcError } = await supabaseAdmin
      .rpc('create_employee_direct', {
        employee_email: email,
        employee_password: password,
        employee_display_name: displayName,
        owner_user_id: user.id, // Pasar el ID del owner
        employee_can_create_invoices: canCreateInvoices || false,
        employee_can_view_finances: canViewFinances || false,
        employee_can_manage_inventory: canManageInventory || false,
        employee_can_manage_clients: canManageClients || false,
        employee_department: department || null,
        employee_job_position: jobPosition || null,
      });

    if (rpcError) {
      console.error('Error calling RPC function:', rpcError);
      return NextResponse.json(
        { error: `Error al crear el empleado: ${rpcError.message}` },
        { status: 400 }
      );
    }

    // Verificar el resultado de la función
    if (!result || !result.success) {
      console.error('Function returned error:', result);
      return NextResponse.json(
        { error: result?.error || 'Error desconocido al crear el empleado' },
        { status: 400 }
      );
    }

    const newUserId = result.user_id;
    console.log('User created successfully:', newUserId);
    console.log('Function result:', result.message);

    // Retornar éxito
    return NextResponse.json({
      success: true,
      user_id: newUserId,
      email: result.email,
      display_name: result.display_name,
      message: result.message,
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: `Error inesperado: ${error.message}` },
      { status: 500 }
    );
  }
}
