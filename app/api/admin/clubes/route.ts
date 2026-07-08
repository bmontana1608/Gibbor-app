import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Cliente Admin (Service Role) para bypass de RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { correo_director, password_director, dias_prueba, ...clubData } = await request.json();

    // 1. Obtener el plan SaaS por defecto (el primero disponible)
    const { data: planes, error: planError } = await supabaseAdmin
      .from('planes_saas')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1);

    if (planError || !planes || planes.length === 0) {
      return NextResponse.json({ error: 'No existe ningún plan SaaS configurado. Crea un plan en "Suscripciones" primero.' }, { status: 400 });
    }

    const planId = planes[0].id;

    // Calcular fecha_fin_prueba
    let fechaFinPrueba = null;
    if (dias_prueba && Number(dias_prueba) > 0) {
      const date = new Date();
      date.setDate(date.getDate() + Number(dias_prueba));
      fechaFinPrueba = date.toISOString();
    }

    // 2. Insertar el club con el plan_id correcto
    const { data: clubResult, error: clubError } = await supabaseAdmin
      .from('clubes')
      .insert([{
        ...clubData,
        estado: 'Activo',
        plan: 'Premium',
        plan_id: planId,
        fecha_fin_prueba: fechaFinPrueba,
        estado_suscripcion: fechaFinPrueba ? 'En Prueba' : 'Al Día'
      }])
      .select();

    if (clubError) throw clubError;
    const nuevoClub = clubResult[0];

    try {
      // 2. Crear el Usuario / Dueño del Club en Supabase Auth
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: correo_director,
        password: password_director,
        email_confirm: true
      });

      if (authError) {
        throw new Error(`Error en Auth: ${authError.message}`);
      }

      // 3. Crear el Perfil "Director" vinculado al club_id
      const { error: perfilError } = await supabaseAdmin
        .from('perfiles')
        .insert([{
          id: authUser.user.id,
          nombres: 'Director',
          apellidos: clubData.nombre,
          rol: 'Director',
          club_id: nuevoClub.id,
          estado_miembro: 'Activo'
        }]);

      if (perfilError) {
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
        throw new Error(`Error en Perfil: ${perfilError.message}`);
      }

      // 4. KIT DE BIENVENIDA: Configuración de Marca y WhatsApp
      await supabaseAdmin.from('configuracion_wa').insert([{
        club_id: nuevoClub.id,
        nombre_club: clubData.nombre,
        temporada_actual: `TEMPORADA ${new Date().getFullYear()}`,
        direccion: 'Sede Central',
        ciudad: 'Ciudad de Origen',
        api_url: 'https://evolution-api-production-c6137.up.railway.app' // API Base
      }]);

      // 5. KIT DE BIENVENIDA: Plan de Pago Inicial
      await supabaseAdmin.from('planes').insert([{
        club_id: nuevoClub.id,
        nombre: 'Mensualidad Regular',
        precio_base: 70000,
        dia_cobro_mensual: 1,
        dias_limite_pronto_pago: 5,
        descuento_pronto_pago: 10000
      }]);

      return NextResponse.json(nuevoClub);

    } catch (innerError: any) {
      await supabaseAdmin.from('clubes').delete().eq('id', nuevoClub.id);
      throw innerError;
    }

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...datosParaActualizar } = body;
    
    if (!id) return NextResponse.json({ error: 'Falta el ID del club' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('clubes')
      .update(datosParaActualizar)
      .eq('id', id)
      .select();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
