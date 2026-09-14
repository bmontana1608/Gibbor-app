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

// GET /api/solicitudes-club — enriquecido con datos reales de clubes para el super admin
export async function GET() {
  try {
    const { data: solicitudes, error } = await supabaseAdmin
      .from('solicitudes_club')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Obtener clubes existentes para enlazar con solicitudes aprobadas
    const { data: clubes } = await supabaseAdmin
      .from('clubes')
      .select('id, nombre, slug, logo_url, estado, created_at');

    const clubMapById = new Map<string, any>();
    const clubMapByName = new Map<string, any>();

    if (clubes) {
      for (const club of clubes) {
        if (club.id) clubMapById.set(club.id, club);
        if (club.nombre) clubMapByName.set(club.nombre.trim().toLowerCase(), club);
      }
    }

    const enriquecidas = (solicitudes || []).map((s: any) => {
      let matchingClub = null;
      if (s.club_id && clubMapById.has(s.club_id)) {
        matchingClub = clubMapById.get(s.club_id);
      } else if (s.nombre_academia && clubMapByName.has(s.nombre_academia.trim().toLowerCase())) {
        matchingClub = clubMapByName.get(s.nombre_academia.trim().toLowerCase());
      } else if (s.nombre_club && clubMapByName.has(s.nombre_club.trim().toLowerCase())) {
        matchingClub = clubMapByName.get(s.nombre_club.trim().toLowerCase());
      }

      const assignedSlug = matchingClub?.slug || s.slug || null;
      const clubId = matchingClub?.id || s.club_id || null;
      const logo = s.logo_url || matchingClub?.logo_url || null;

      return {
        ...s,
        club_id: clubId,
        slug: assignedSlug,
        club_slug: assignedSlug,
        logo_url: logo,
        club_nombre: matchingClub?.nombre || s.nombre_academia || s.nombre_club,
      };
    });

    return NextResponse.json(enriquecidas);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/solicitudes-club — actualizar estado, notas y slug desde el admin
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, estado, notas_admin, slug, club_id } = body;
    if (!id) return NextResponse.json({ error: 'ID de solicitud requerido' }, { status: 400 });

    // 1. Si se envía un nuevo slug, validarlo y actualizar el club correspondiente
    if (slug) {
      const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)+/g, '');
      if (!cleanSlug) {
        return NextResponse.json({ error: 'El slug no puede estar vacío' }, { status: 400 });
      }

      // Buscar si otra academia ya tiene ese slug
      const { data: existingClub } = await supabaseAdmin
        .from('clubes')
        .select('id, nombre')
        .eq('slug', cleanSlug)
        .maybeSingle();

      if (existingClub && existingClub.id !== club_id) {
        return NextResponse.json(
          { error: `El slug "${cleanSlug}" ya está en uso por "${existingClub.nombre}". Por favor elige otro.` },
          { status: 409 }
        );
      }

      // Si tenemos club_id, actualizar la tabla clubes
      if (club_id) {
        const { error: clubUpdateErr } = await supabaseAdmin
          .from('clubes')
          .update({ slug: cleanSlug })
          .eq('id', club_id);
        if (clubUpdateErr) throw clubUpdateErr;
      }

      // Intentar guardar el slug en solicitudes_club si la columna existe
      try {
        await supabaseAdmin
          .from('solicitudes_club')
          .update({ slug: cleanSlug, updated_at: new Date().toISOString() })
          .eq('id', id);
      } catch (e) {
        // Ignorar si la columna no existe en solicitudes_club
      }
    }

    // 2. Actualizar estado y notas si se proporcionaron
    const updatePayload: any = { updated_at: new Date().toISOString() };
    if (estado) updatePayload.estado = estado;
    if (notas_admin !== undefined) updatePayload.notas_admin = notas_admin || null;

    const { error } = await supabaseAdmin
      .from('solicitudes_club')
      .update(updatePayload)
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
