import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
}

const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * Cron endpoint para actualizar suscripciones expiradas automáticamente
 * Debe ejecutarse diariamente mediante un cron job
 */
export async function GET(request: Request) {
  try {
    // Verificar token de seguridad del cron (opcional pero recomendado)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid cron secret' },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database configuration error' },
        { status: 500 }
      );
    }

    console.log('🔄 Ejecutando actualización de suscripciones expiradas...');

    // Ejecutar la función de actualización
    const { data, error } = await supabaseAdmin.rpc('update_expired_subscriptions');

    if (error) {
      console.error('❌ Error actualizando suscripciones:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          details: error 
        },
        { status: 500 }
      );
    }

    const result = data as any;
    console.log('✅ Resultado:', result);

    return NextResponse.json({
      success: true,
      message: result?.message || 'Actualización completada',
      updated_count: result?.updated_count || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Error inesperado:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// También permitir POST para mayor compatibilidad
export async function POST(request: Request) {
  return GET(request);
}
