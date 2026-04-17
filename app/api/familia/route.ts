import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const uid = searchParams.get('uid');

  if (!email && !uid) {
    return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
  }

  // Usamos el Service Role Key para saltar el RLS (solo en el servidor)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Paso 1: Obtener la cédula, el rol y la configuración de hijos del usuario actual
  const { data: miPerfil } = await supabaseAdmin
    .from("perfiles")
    .select("documento_identidad, acudiente_identificacion, rol, hijos_config")
    .eq("id", uid)
    .single();

  const miCedula = miPerfil?.documento_identidad || miPerfil?.acudiente_identificacion;
  const esDirector = miPerfil?.rol === 'Director';
  
  // Paso 2: Obtener IDs manuales de hijos según el rol (EXCLUSIVO)
  let manualIds: string[] = [];
  
  if (esDirector) {
    // 2.a Si es Director, usamos ÚNICAMENTE la configuración global (Ajustes del Club)
    const { data: configGlobal } = await supabaseAdmin
      .from("configuracion_wa")
      .select("hijos_config")
      .single();
    
    if (configGlobal?.hijos_config) {
      manualIds = configGlobal.hijos_config.split(',').map((id: string) => id.trim());
    }
  } else if (miPerfil?.hijos_config) {
    // 2.b Para Entrenadores y otros, usamos su hijos_config personal
    manualIds = miPerfil.hijos_config.split(',').map((id: string) => id.trim());
  }

  // Paso 3: Construimos la cláusula OR
  // Solo buscamos Futbolistas por email/cédula para evitar que el Staff se mezcle
  const orParts = [
    `id.eq.${uid}`,
  ];
  
  if (email) {
    orParts.push(`and(email_contacto.eq."${email}",rol.eq.Futbolista)`);
  }

  if (miCedula) {
    orParts.push(`and(acudiente_identificacion.eq."${miCedula}",rol.eq.Futbolista)`);
  }

  // Añadimos TODOS los IDs manuales recolectados
  manualIds.forEach((id: string) => {
    if (id && id.length > 5) orParts.push(`id.eq.${id}`);
  });

  const orClause = orParts.filter(Boolean).join(',');

  // Buscamos todos los perfiles que coincidan con alguna condición
  const { data: misPerfiles, error } = await supabaseAdmin
    .from("perfiles")
    .select("*")
    .or(orClause);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Eliminar duplicados por ID
  const unicos = Array.from(new Map(misPerfiles.map(item => [item.id, item])).values());

  // --- ORDENAMIENTO INTELIGENTE POR PRIORIDAD ---
  // Prioridad 1: Coincidencia de email o cédula (familia biológica)
  // Prioridad 2: En hijos_config personal
  // Prioridad 3: Lo demás
  const personalesIds = miPerfil?.hijos_config?.split(',').map((id:string) => id.trim()) || [];

  const ordenados = unicos.sort((a, b) => {
    // 1. Prioridad biológica
    const aBio = a.email_contacto === email || a.acudiente_identificacion === miCedula;
    const bBio = b.email_contacto === email || b.acudiente_identificacion === miCedula;
    if (aBio && !bBio) return -1;
    if (!aBio && bBio) return 1;

    // 2. Prioridad configuración personal
    const aPerso = personalesIds.includes(a.id);
    const bPerso = personalesIds.includes(b.id);
    if (aPerso && !bPerso) return -1;
    if (!aPerso && bPerso) return 1;

    return 0;
  });

  return NextResponse.json(ordenados);
}
