import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const { userIds, newPassword } = await request.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0 || !newPassword) {
      return NextResponse.json({ error: 'Datos incompletos o inválidos' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
    }

    let successCount = 0;
    let failCount = 0;

    // Procesamos en serie para evitar colapsar la API de Supabase Admin
    for (const userId of userIds) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      );
      
      if (error) {
        console.error(`Error reseteando password para ${userId}:`, error.message);
        failCount++;
      } else {
        successCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Contraseñas actualizadas: ${successCount} exitosas, ${failCount} fallidas.` 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
