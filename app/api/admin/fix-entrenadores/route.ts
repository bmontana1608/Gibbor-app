import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@/lib/supabase/server';

const PASSWORD_TEMPORAL = 'Master2026*';

// Columnas seguras para clonar (excluye campos auto-generados como created_at, updated_at)
const SAFE_COLS = [
  'nombres','apellidos','documento_identidad','fecha_nacimiento','telefono',
  'email_contacto','direccion','acudiente_nombre','acudiente_identificacion',
  'tipo_sangre','eps','patologias','talla_uniforme','posicion','categoria_id',
  'grupos','estado_miembro','rol','tipo_plan','emergencia_nombre','emergencia_telefono',
  'hijos_config','club_id','fecha_ingreso_club','foto_url','doc_jugador_url',
  'doc_eps_url','doc_acudiente_url','doc_extra_url','estado_pago','fecha_inactivacion'
];

function buildPerfilNuevo(perfil: any, newId: string, email: string) {
  const obj: any = { id: newId, email_contacto: email, estado_miembro: 'Activo' };
  for (const col of SAFE_COLS) {
    if (col in perfil && col !== 'id' && col !== 'email_contacto' && col !== 'estado_miembro') {
      obj[col] = perfil[col];
    }
  }
  return obj;
}

async function getAllAuthUsers() {
  let allUsers: any[] = [];
  let page = 1;
  while (true) {
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (!listData?.users || listData.users.length === 0) break;
    allUsers = allUsers.concat(listData.users);
    if (listData.users.length < 1000) break;
    page++;
  }
  return allUsers;
}

async function verifySuperAdmin(request: Request) {
  const supabase = await createClient();
  const { data: { user: caller } } = await supabase.auth.getUser();
  if (!caller) return null;
  const { data: callerPerfil } = await supabase
    .from('perfiles').select('rol').eq('id', caller.id).single();
  return callerPerfil?.rol === 'SuperAdmin' ? caller : null;
}

async function migrateProfile(perfil: any, newId: string, email: string) {
  // 1. Verificar si ya existe un perfil con newId
  const { data: existingWithNewId } = await supabaseAdmin
    .from('perfiles').select('id').eq('id', newId).maybeSingle();

  if (existingWithNewId) {
    await supabaseAdmin.from('perfiles')
      .update({ email: email, email_contacto: email, estado_miembro: 'Activo' })
      .eq('id', newId);
    return { ok: true, accion: 'actualizado_existente' };
  }

  // 2. Insertar perfil con columnas seguras
  const perfilNuevo = buildPerfilNuevo(perfil, newId, email);
  console.log('[fix-entrenadores] Intentando insertar perfil:', JSON.stringify(perfilNuevo));
  const { error: cloneErr } = await supabaseAdmin.from('perfiles').insert([perfilNuevo]);

  if (cloneErr) {
    console.error('[fix-entrenadores] Error en insert:', cloneErr.code, cloneErr.message, cloneErr.details, cloneErr.hint);
    return { ok: false, error: cloneErr.message, code: cloneErr.code, details: cloneErr.details, hint: cloneErr.hint };
  }

  // 3. Migrar dependencias al nuevo ID
  const oldId = perfil.id;
  for (const tabla of ['pagos_ingresos', 'asistencias', 'evaluaciones_tecnicas']) {
    await supabaseAdmin.from(tabla).update({ jugador_id: newId }).eq('jugador_id', oldId);
  }
  await supabaseAdmin.from('clubes_usuarios').update({ usuario_id: newId }).eq('usuario_id', oldId);

  // 4. Eliminar perfil viejo
  await supabaseAdmin.from('perfiles').delete().eq('id', oldId);

  return { ok: true, accion: 'clonado' };
}

// GET: Diagnosticar estado real de usuarios de un club o TODOS los clubes
// GET /api/admin/fix-entrenadores?slug=palmas-fc   → un club
// GET /api/admin/fix-entrenadores?slug=all          → todos los clubes
export async function GET(request: Request) {
  try {
    const caller = await verifySuperAdmin(request);
    if (!caller) return NextResponse.json({ error: 'Solo SuperAdmin' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    if (!slug) return NextResponse.json({ error: 'Falta ?slug= (o usa ?slug=all para escanear todos)' }, { status: 400 });

    // ── MODO: TODOS LOS CLUBES ──────────────────────────────────────────
    if (slug === 'all') {
      const { data: clubs } = await supabaseAdmin
        .from('clubes').select('id, nombre, slug').order('nombre');
      if (!clubs?.length) return NextResponse.json({ mensaje: 'No hay clubes', resumen: [] });

      const authUsers = await getAllAuthUsers();

      const resumen: any[] = [];
      let total_problemas_global = 0;

      for (const club of clubs) {
        const { data: usuarios } = await supabaseAdmin
          .from('perfiles')
          .select('id, nombres, apellidos, email_contacto, rol, estado_miembro')
          .eq('club_id', club.id)
          .in('rol', ['Entrenador', 'Director', 'Futbolista']);

        if (!usuarios?.length) continue;

        const problemas: any[] = [];
        for (const u of usuarios) {
          const email = (u.email_contacto || '').toLowerCase().trim();
          if (!email) {
            problemas.push({ nombre: `${u.nombres} ${u.apellidos}`, rol: u.rol, email: '(sin email)', problema: 'SIN_EMAIL' });
            continue;
          }
          const authUser = authUsers.find(a => a.email?.toLowerCase().trim() === email);
          if (!authUser) {
            problemas.push({ nombre: `${u.nombres} ${u.apellidos}`, rol: u.rol, email, problema: 'SIN_CUENTA_AUTH' });
          } else if (authUser.id !== u.id) {
            problemas.push({ nombre: `${u.nombres} ${u.apellidos}`, rol: u.rol, email, problema: 'ID_DESINCRONIZADO', auth_id: authUser.id, perfil_id: u.id });
          } else if (!authUser.email_confirmed_at) {
            problemas.push({ nombre: `${u.nombres} ${u.apellidos}`, rol: u.rol, email, problema: 'EMAIL_NO_CONFIRMADO' });
          }
        }

        total_problemas_global += problemas.length;
        if (problemas.length > 0) {
          resumen.push({ club: club.nombre, slug: club.slug, total_usuarios: usuarios.length, con_problemas: problemas.length, problemas });
        }
      }

      return NextResponse.json({
        total_clubes_escaneados: clubs.length,
        clubes_con_problemas: resumen.length,
        total_usuarios_con_problemas: total_problemas_global,
        resumen,
      });
    }

    // ── MODO: UN SOLO CLUB ─────────────────────────────────────────────

    const { data: club } = await supabaseAdmin
      .from('clubes').select('id, nombre, slug').eq('slug', slug).single();
    if (!club) return NextResponse.json({ error: `Club '${slug}' no encontrado` }, { status: 404 });

    // Obtener TODOS los perfiles del club (cualquier rol) que sean Entrenador
    const { data: entrenadores } = await supabaseAdmin
      .from('perfiles')
      .select('id, nombres, apellidos, email_contacto, estado_miembro')
      .eq('club_id', club.id)
      .eq('rol', 'Entrenador');

    if (!entrenadores?.length) {
      return NextResponse.json({ club: club.nombre, mensaje: 'Sin entrenadores en DB', entrenadores: [] });
    }

    const authUsers = await getAllAuthUsers();

    const resultado = await Promise.all(entrenadores.map(async p => {
      const email = (p.email_contacto || '').toLowerCase().trim();
      const authUser = authUsers.find(u => u.email?.toLowerCase().trim() === email);

      // Verificar si hay perfil con el Auth ID
      let perfilConAuthId = null;
      if (authUser && authUser.id !== p.id) {
        const { data } = await supabaseAdmin.from('perfiles').select('id').eq('id', authUser.id).maybeSingle();
        perfilConAuthId = data;
      }

      let problema = 'OK';
      if (!authUser) problema = 'SIN_CUENTA_AUTH';
      else if (authUser.id !== p.id && !perfilConAuthId) problema = 'ID_DESINCRONIZADO_SIN_PERFIL_NUEVO';
      else if (authUser.id !== p.id && perfilConAuthId) problema = 'ID_DESINCRONIZADO_CON_PERFIL_DUPLICADO';
      else if (!authUser.email_confirmed_at) problema = 'EMAIL_NO_CONFIRMADO';

      return {
        nombre: `${p.nombres} ${p.apellidos}`,
        email,
        estado_miembro: p.estado_miembro,
        problema,
        auth_id: authUser?.id || null,
        perfil_id: p.id,
        ids_coinciden: authUser ? authUser.id === p.id : null,
        perfil_con_auth_id_existe: perfilConAuthId !== null,
      };
    }));

    return NextResponse.json({
      club: club.nombre,
      slug: club.slug,
      total: entrenadores.length,
      con_problemas: resultado.filter(r => r.problema !== 'OK').length,
      entrenadores: resultado,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Reparar usuarios - maneja TODOS los escenarios posibles
// POST /api/admin/fix-entrenadores?slug=palmas-fc  → un club
// POST /api/admin/fix-entrenadores?slug=all         → todos los clubes
export async function POST(request: Request) {
  try {
    const caller = await verifySuperAdmin(request);
    if (!caller) return NextResponse.json({ error: 'Solo SuperAdmin' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    if (!slug) return NextResponse.json({ error: 'Falta ?slug=' }, { status: 400 });

    // ── MODO: TODOS LOS CLUBES ─────────────────────────────────────────
    if (slug === 'all') {
      const { data: clubs } = await supabaseAdmin
        .from('clubes').select('id, nombre, slug').order('nombre');
      if (!clubs?.length) return NextResponse.json({ mensaje: 'No hay clubes' });

      const authUsers = await getAllAuthUsers();
      const resumenGlobal: any[] = [];
      let total_reparados = 0;
      let total_errores = 0;
      let total_saltados = 0;

      for (const club of clubs) {
        const { data: usuarios } = await supabaseAdmin
          .from('perfiles').select('*')
          .eq('club_id', club.id)
          .in('rol', ['Entrenador', 'Director', 'Futbolista']);

        if (!usuarios?.length) continue;

        const resultados = await repararUsuarios(usuarios, authUsers);
        const reparados = resultados.filter(r => !['YA_OK','SALTADO','ERROR'].includes(r.estado));
        const errores = resultados.filter(r => r.estado === 'ERROR');
        const saltados = resultados.filter(r => r.estado === 'SALTADO');

        total_reparados += reparados.length;
        total_errores += errores.length;
        total_saltados += saltados.length;

        if (reparados.length > 0 || errores.length > 0) {
          resumenGlobal.push({
            club: club.nombre, slug: club.slug,
            reparados: reparados.length,
            errores: errores.length,
            detalle: resultados.filter(r => r.estado !== 'YA_OK'),
          });
        }
      }

      return NextResponse.json({
        password_temporal_usada: PASSWORD_TEMPORAL,
        total_reparados,
        total_errores,
        total_saltados_sin_email: total_saltados,
        clubes_afectados: resumenGlobal.length,
        resumen: resumenGlobal,
      });
    }

    // ── MODO: UN SOLO CLUB ─────────────────────────────────────────────
    const { data: club } = await supabaseAdmin
      .from('clubes').select('id, nombre, slug').eq('slug', slug).single();
    if (!club) return NextResponse.json({ error: `Club '${slug}' no encontrado` }, { status: 404 });

    const { data: usuarios } = await supabaseAdmin
      .from('perfiles').select('*')
      .eq('club_id', club.id)
      .in('rol', ['Entrenador', 'Director', 'Futbolista']);

    if (!usuarios?.length) {
      return NextResponse.json({ mensaje: 'No hay usuarios con roles', reparados: [] });
    }

    const authUsers = await getAllAuthUsers();
    const resultados = await repararUsuarios(usuarios, authUsers);

    return NextResponse.json({
      club: club.nombre,
      password_temporal_usada: PASSWORD_TEMPORAL,
      total: resultados.length,
      reparados: resultados.filter(r => !['YA_OK', 'SALTADO', 'ERROR'].includes(r.estado)).length,
      errores: resultados.filter(r => r.estado === 'ERROR').length,
      saltados_sin_email: resultados.filter(r => r.estado === 'SALTADO').length,
      detalle: resultados.filter(r => r.estado !== 'YA_OK'),
    });
  } catch (error: any) {
    console.error('[fix-entrenadores POST]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── LÓGICA COMPARTIDA DE REPARACIÓN ────────────────────────────────────────
async function repararUsuarios(usuarios: any[], authUsers: any[]) {
  const resultados: any[] = [];

  for (const p of usuarios) {
    const email = (p.email_contacto || '').toLowerCase().trim();

    if (!email) {
      resultados.push({ nombre: `${p.nombres} ${p.apellidos}`, rol: p.rol, estado: 'SALTADO', razon: 'Sin email_contacto' });
      continue;
    }

    const authUser = authUsers.find(u => u.email?.toLowerCase().trim() === email);

    // CASO 1: Sin cuenta Auth → crear
    if (!authUser) {
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email, password: PASSWORD_TEMPORAL, email_confirm: true,
        user_metadata: { rol: p.rol }
      });

      if (createErr) {
        resultados.push({ nombre: `${p.nombres} ${p.apellidos}`, rol: p.rol, email, estado: 'ERROR', razon: createErr.message });
        continue;
      }

      const newId = newUser.user.id;
      const migration = p.id !== newId
        ? await migrateProfile(p, newId, email)
        : await supabaseAdmin.from('perfiles').update({ estado_miembro: 'Activo', email_contacto: email }).eq('id', p.id).then(() => ({ ok: true, accion: 'actualizado' }));

      resultados.push({
        nombre: `${p.nombres} ${p.apellidos}`, rol: p.rol, email,
        estado: migration.ok ? 'CREADO' : 'AUTH_CREADO_PERFIL_FALLIDO',
        password_temporal: PASSWORD_TEMPORAL,
        detalle_migracion: migration,
      });
      continue;
    }

    // CASO 2: Auth existe pero ID diferente → reparar
    if (authUser.id !== p.id) {
      await supabaseAdmin.auth.admin.updateUserById(authUser.id, { password: PASSWORD_TEMPORAL, email_confirm: true });

      const { data: existingWithAuthId } = await supabaseAdmin
        .from('perfiles').select('id').eq('id', authUser.id).maybeSingle();

      if (existingWithAuthId) {
        await supabaseAdmin.from('perfiles')
          .update({ email_contacto: email, estado_miembro: 'Activo' }).eq('id', authUser.id);
        await supabaseAdmin.from('perfiles').delete().eq('id', p.id);
        resultados.push({ nombre: `${p.nombres} ${p.apellidos}`, rol: p.rol, email, estado: 'DUPLICADO_LIMPIADO', password_temporal: PASSWORD_TEMPORAL });
      } else {
        const migration = await migrateProfile(p, authUser.id, email);
        resultados.push({
          nombre: `${p.nombres} ${p.apellidos}`, rol: p.rol, email,
          estado: migration.ok ? 'ID_REPARADO' : 'ERROR',
          password_temporal: PASSWORD_TEMPORAL,
          detalle_migracion: migration,
        });
      }
      continue;
    }

    // CASO 3: Email no confirmado → confirmar
    if (!authUser.email_confirmed_at) {
      await supabaseAdmin.auth.admin.updateUserById(authUser.id, { password: PASSWORD_TEMPORAL, email_confirm: true });
      await supabaseAdmin.from('perfiles').update({ estado_miembro: 'Activo' }).eq('id', p.id);
      resultados.push({ nombre: `${p.nombres} ${p.apellidos}`, rol: p.rol, email, estado: 'EMAIL_CONFIRMADO', password_temporal: PASSWORD_TEMPORAL });
      continue;
    }

    // CASO 4: Todo OK
    resultados.push({ nombre: `${p.nombres} ${p.apellidos}`, rol: p.rol, email, estado: 'YA_OK' });
  }

  return resultados;
}



