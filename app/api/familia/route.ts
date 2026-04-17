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
  
  // Paso 2: Obtener IDs manuales de hijos (pueden venir del perfil del usuario o del global si es Director)
  let manualIds: string[] = [];
  
  // 2.a Hijos configurados específicamente para este perfil (Entrenador o Padre)
  if (miPerfil?.hijos_config) {
    const ids = miPerfil.hijos_config.split(',').map((id: string) => id.trim());
    manualIds = [...manualIds, ...ids];
  }

  // 2.b Si es Director, también sumamos los hijos de la configuración global
  if (esDirector) {
    const { data: configGlobal } = await supabaseAdmin
      .from("configuracion_wa")
      .select("hijos_config")
      .single();
    
    if (configGlobal?.hijos_config) {
      const idsGlobal = configGlobal.hijos_config.split(',').map((id: string) => id.trim());
      manualIds = [...manualIds, ...idsGlobal];
    }
  }

  // Paso 3: Construimos la cláusula OR
  const orParts = [
    `id.eq.${uid}`,
    email ? `email_contacto.eq."${email}"` : null,
  ];
  
  if (miCedula) {
    orParts.push(`acudiente_identificacion.eq."${miCedula}"`);
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

  // Eliminar duplicados por ID (mantenemos al director para que el Layout sepa quién es)
  const unicos = Array.from(new Map(misPerfiles.map(item => [item.id, item])).values());

  return NextResponse.json(unicos);
}
