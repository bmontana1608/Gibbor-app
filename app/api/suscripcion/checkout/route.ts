import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { clubId } = await req.json();

    if (!clubId) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    // 1. Obtener la información del club y su plan asignado
    const { data: club, error: clubError } = await supabaseAdmin
      .from('clubes')
      .select('id, nombre, tarifa_por_jugador, logo_url, planes_saas(*)')
      .eq('id', clubId)
      .single();

    if (clubError || !club) {
      return NextResponse.json({ error: 'Club no encontrado' }, { status: 404 });
    }

    // 2. Calcular cantidad de jugadores activos
    const { count, error: countError } = await supabaseAdmin
      .from('perfiles')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', clubId)
      .eq('estado_miembro', 'Activo')
      .not('rol', 'in', '("Director","Entrenador")');

    const totalJugadores = count || 0;
    
    // Nueva logica de cobro por plan
    const planArray = club.planes_saas;
    const plan = Array.isArray(planArray) ? planArray[0] : planArray;
    
    const isInternational = club.pais && club.pais !== 'Colombia';
    let planNombre = plan ? plan.nombre : 'Plan Base';
    let precioBase = plan ? Number(plan.precio_base ?? 100000) : 100000;
    let limiteBase = plan ? Number(plan.limite_jugadores_base ?? 60) : 60;
    let precioExtra = plan ? Number(plan.precio_jugador_extra ?? 2000) : 2000;
    const currency = isInternational ? 'USD' : 'COP';

    if (isInternational) {
      const isAnual = plan && String(plan.nombre).toLowerCase().includes('anual');
      if (totalJugadores > 200) {
        planNombre = 'Plan Internacional (Enterprise)';
        precioBase = 80;
        limiteBase = 200;
        precioExtra = 1;
      } else if (isAnual) {
        planNombre = 'Plan Internacional (Anual)';
        precioBase = 350;
        limiteBase = 80;
        precioExtra = 1; 
      } else {
        planNombre = 'Plan Internacional (Mensual)';
        precioBase = 35;
        limiteBase = 60;
        precioExtra = 1;
      }
    }
    
    const extras = Math.max(0, totalJugadores - limiteBase);
    const totalPagar = precioBase + (extras * precioExtra);

    if (totalPagar <= 0) {
      return NextResponse.json({ error: 'El monto a pagar debe ser mayor a 0.' }, { status: 400 });
    }

    const origin = req.headers.get('origin') || 'https://masterclubmanager.com';

    // Lista de paises soportados por Mercado Pago LATAM
    const mpCountries = ['Colombia', 'Argentina', 'Chile', 'México', 'Mexico', 'Perú', 'Peru', 'Uruguay', 'Brasil', 'Brazil'];
    const isMercadoPagoSupported = !club.pais || mpCountries.includes(club.pais);

    if (!isMercadoPagoSupported) {
      // Si no es soportado por MP, generar link de PayPal
      const paypalLink = `https://paypal.me/TU_USUARIO_DE_PAYPAL/${totalPagar}USD`;
      return NextResponse.json({ url: paypalLink });
    }

    // 3. Crear la preferencia de pago en la cuenta maestra de Mercado Pago
    // Usamos el MP_ACCESS_TOKEN global de la plataforma, NO el mp_access_token del club.
    const masterMpToken = process.env.MP_ACCESS_TOKEN;
    
    if (!masterMpToken) {
       return NextResponse.json({ error: 'Falta configuración de pagos de la plataforma' }, { status: 500 });
    }

    const preferenceResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${masterMpToken}`
      },
      body: JSON.stringify({
        items: [
          {
            id: `SAAS-${clubId}`,
            title: `Suscripción SaaS - ${club.nombre}`,
            description: `Renovación de ${planNombre} (${totalJugadores} jugadores activos)`,
            picture_url: club.logo_url || '',
            quantity: 1,
            unit_price: currency === 'USD' ? Number(totalPagar) * 4100 : Number(totalPagar),
            currency_id: 'COP',
          }
        ],
        payer: {
          name: club.nombre,
        },
        back_urls: {
          success: `${origin}/director/suscripcion?mp_status=success`,
          failure: `${origin}/director/suscripcion?mp_status=failure`,
          pending: `${origin}/director/suscripcion?mp_status=pending`,
        },
        auto_return: 'approved',
        notification_url: `https://masterclubmanager.com/api/suscripcion/webhook?clubId=${clubId}`,
        statement_descriptor: 'GIBBOR APP',
        external_reference: `${clubId}_${Date.now()}`
      })
    });

    const result = await preferenceResponse.json();

    if (!preferenceResponse.ok) {
      console.error('Error MP SaaS:', result);
      return NextResponse.json({ error: 'Error al generar link de pago en Mercado Pago' }, { status: 500 });
    }

    return NextResponse.json({ url: result.init_point });
  } catch (error: any) {
    console.error('Error creando preferencia MP SaaS:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
