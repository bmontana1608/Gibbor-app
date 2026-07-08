import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import webpush from 'web-push';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/solicitudes-club — envío público del formulario
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    
    const nombre_academia = formData.get('nombre_academia') as string;
    const nombre_director = formData.get('nombre_director') as string;
    const email = formData.get('email') as string;
    const telefono = formData.get('telefono') as string;
    const ciudad = formData.get('ciudad') as string;
    const pais = formData.get('pais') as string;
    const jugadores_estimados = formData.get('jugadores_estimados') as string;
    const mensaje = formData.get('mensaje') as string;
    const codigo_referido = formData.get('codigo_referido') as string;
    const fuente_referido = formData.get('fuente_referido') as string;
    const logoFile = formData.get('logo') as File | null;

    if (!nombre_academia || !nombre_director || !email) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // Verificar que no haya ya una solicitud pendiente con ese email
    const { data: existe } = await supabaseAdmin
      .from('solicitudes_club')
      .select('id, estado')
      .eq('email', email.toLowerCase().trim())
      .in('estado', ['Pendiente', 'En Revisión'])
      .maybeSingle();

    if (existe) {
      return NextResponse.json(
        { error: 'Ya existe una solicitud activa con este correo. Pronto nos pondremos en contacto.' },
        { status: 409 }
      );
    }

    let logo_url = null;
    if (logoFile && logoFile.size > 0) {
      const extension = logoFile.name.split('.').pop() || 'png';
      const fileName = `solicitud-${Date.now()}.${extension}`;
      const buffer = Buffer.from(await logoFile.arrayBuffer());
      
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('clubes_logos')
        .upload(fileName, buffer, { contentType: logoFile.type });

      if (!uploadError && uploadData) {
        const { data: publicUrlData } = supabaseAdmin.storage.from('clubes_logos').getPublicUrl(uploadData.path);
        logo_url = publicUrlData.publicUrl;
      }
    }

    const { data, error } = await supabaseAdmin.from('solicitudes_club').insert({
      nombre_academia: nombre_academia.trim(),
      nombre_director: nombre_director.trim(),
      email: email.toLowerCase().trim(),
      telefono: telefono?.trim() || null,
      ciudad: ciudad?.trim() || null,
      pais: pais || 'Colombia',
      jugadores_estimados: jugadores_estimados ? parseInt(jugadores_estimados) : null,
      mensaje: mensaje?.trim() || null,
      codigo_referido: codigo_referido?.trim().toUpperCase() || null,
      fuente_referido: fuente_referido?.trim().toLowerCase() || 'manual',
      logo_url,
      estado: 'Pendiente',
    }).select().single();

    if (error) throw error;

    // --- NOTIFICACIÓN A EMBAJADOR (Si aplica) ---
    if (codigo_referido) {
      const { data: embajador } = await supabaseAdmin
        .from('embajadores')
        .select('id')
        .eq('codigo_referido', codigo_referido.trim().toUpperCase())
        .single();
        
      if (embajador) {
        // Registrar notificación
        await supabaseAdmin.from('notificaciones_embajadores').insert({
          embajador_id: embajador.id,
          tipo: 'NUEVO_CLUB',
          mensaje: `¡Excelente! La academia "${nombre_academia.trim()}" se ha registrado usando tu código.`
        });
        
        // Actualizar última actividad del embajador (recibió un referido)
        await supabaseAdmin.from('embajadores').update({
          ultima_actividad: new Date().toISOString()
        }).eq('id', embajador.id);
      }
    }

    // --- NOTIFICACIÓN PUSH A SUPER ADMINS ---
    try {
      if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        webpush.setVapidDetails(
          process.env.VAPID_EMAIL || 'mailto:admin@masterclubmanager.com',
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
          process.env.VAPID_PRIVATE_KEY
        );

        // Buscar a todos los SuperAdmin
        const { data: superAdmins } = await supabaseAdmin
          .from('perfiles')
          .select('id')
          .eq('rol', 'SuperAdmin');

        if (superAdmins && superAdmins.length > 0) {
          const adminIds = superAdmins.map(sa => sa.id);
          
          // Buscar sus suscripciones
          const { data: subscripciones } = await supabaseAdmin
            .from('push_subscriptions')
            .select('*')
            .in('user_id', adminIds);

          if (subscripciones && subscripciones.length > 0) {
            const notifications = subscripciones.map(async (sub) => {
              try {
                await webpush.sendNotification(
                  sub.subscription,
                  JSON.stringify({
                    title: '¡Nueva solicitud de academia!',
                    body: `${nombre_director} quiere registrar ${nombre_academia}.`,
                    url: '/admin'
                  })
                );
              } catch (err: any) {
                if (err.statusCode === 410 || err.statusCode === 404) {
                  await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id);
                }
              }
            });
            await Promise.all(notifications);
          }
        }
      }
    } catch (pushErr) {
      console.error('Error enviando push a SuperAdmins:', pushErr);
    }
    // -----------------------------------------

    return NextResponse.json({ success: true, id: data.id });
  } catch (err: any) {
    console.error('Error solicitud club:', err);
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}

// GET /api/solicitudes-club — solo para el super admin
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('solicitudes_club')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/solicitudes-club — actualizar estado desde el admin
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, estado, notas_admin } = body;
    if (!id || !estado) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });

    const { error } = await supabaseAdmin
      .from('solicitudes_club')
      .update({ estado, notas_admin: notas_admin || null, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
