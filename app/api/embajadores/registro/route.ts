import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const nombre_completo = formData.get('nombre_completo') as string;
    const empresa = formData.get('empresa') as string;
    const tipo = formData.get('tipo') as string;
    const email = formData.get('email') as string;
    const telefono = formData.get('telefono') as string;
    const ciudad = formData.get('ciudad') as string;

    const supabase = await createClient();

    // Generar un código de referido automático basado en la empresa o nombre
    const baseCode = (empresa || nombre_completo)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 12);
    
    // Generar 4 números random para evitar colisiones
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const codigo_referido = `${baseCode}${randomSuffix}`;

    const { error } = await supabase.from('embajadores').insert({
      nombre_completo,
      empresa,
      tipo,
      email,
      telefono,
      ciudad,
      codigo_referido,
      estado: 'Pendiente',
      mostrar_en_directorio: false
    });

    if (error) {
      console.error('Error insertando embajador:', error);
      return NextResponse.redirect(new URL('/unete-embajador?error=1', request.url));
    }

    // TODO: Send push notification to SuperAdmin (Optional but good)

    return NextResponse.redirect(new URL('/unete-embajador?success=1', request.url));
  } catch (err) {
    console.error('Error en postulación de embajador:', err);
    return NextResponse.redirect(new URL('/unete-embajador?error=1', request.url));
  }
}
