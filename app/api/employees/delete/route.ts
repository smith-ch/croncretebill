import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase environment variables not found. API routes may not work properly.');
}

const supabaseAdmin = supabaseUrl && supabaseServiceKey ? 
  createClient(supabaseUrl, supabaseServiceKey) : null;

export async function DELETE(request: Request) {
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

    console.log('Authenticated user:', user.id);

    // Verificar que el usuario es un owner
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('parent_user_id, is_active')
      .eq('user_id', user.id)
      .single();

    console.log('Profile query result:', { profile, profileError });

    if (profileError || !profile) {
      console.error('Profile not found or error:', profileError);
      return NextResponse.json(
        { error: 'Perfil no encontrado' },
        { status: 404 }
      );
    }

    if (profile.parent_user_id !== null) {
      console.error('User is not an owner. parent_user_id:', profile.parent_user_id);
      return NextResponse.json(
        { error: 'Solo los propietarios pueden eliminar empleados' },
        { status: 403 }
      );
    }

    console.log('User is owner, proceeding with deletion');

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'ID de usuario requerido' },
        { status: 400 }
      );
    }

    // Verificar que el empleado pertenece a este owner
    const { data: employeeProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id, parent_user_id, display_name')
      .eq('user_id', userId)
      .single();

    if (!employeeProfile) {
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      );
    }

    if (employeeProfile.parent_user_id !== user.id) {
      return NextResponse.json(
        { error: 'No tienes permiso para eliminar este empleado' },
        { status: 403 }
      );
    }

    console.log('Deleting employee:', employeeProfile.display_name, userId);

    // Eliminar el perfil del empleado primero
    const { error: deleteProfileError } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('user_id', userId);

    if (deleteProfileError) {
      console.error('Error deleting profile:', deleteProfileError);
      return NextResponse.json(
        { error: `Error al eliminar perfil: ${deleteProfileError.message}` },
        { status: 500 }
      );
    }

    // Eliminar el usuario de auth usando Admin API
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error('Error deleting auth user:', deleteAuthError);
      // No retornar error aquí, el perfil ya fue eliminado
      console.warn('User deleted from profiles but auth deletion failed');
    }

    console.log('Employee deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'Empleado eliminado exitosamente',
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: `Error inesperado: ${error.message}` },
      { status: 500 }
    );
  }
}
