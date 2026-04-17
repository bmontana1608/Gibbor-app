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

  // Paso 1: Obtener la cédula y el rol del usuario actual
  const { data: miPerfil } = await supabaseAdmin
    .from("perfiles")
    .select("documento_identidad, acudiente_identificacion, rol")
    .eq("id", uid)
    .single();

  const miCedula = miPerfil?.documento_identidad || miPerfil?.acudiente_identificacion;
  const esDirector = miPerfil?.rol === 'Director';

  // Paso 2: Obtener IDs configurados manualmente (solo si es Director)
  let manualIds: string[] = [];
  if (esDirector) {
    const { data: config } = await supabaseAdmin
      .from("configuracion_wa")
      .select("hijos_config")
      .single();
    
    manualIds = config?.hijos_config ? config.hijos_config.split(',').map((id: string) => id.trim()) : [];
  }

  // Paso 3: Construimos la cláusula OR
  const orParts = [
    `id.eq.${uid}`,
    email ? `email_contacto.eq."${email}"` : null,
  ];
  
  if (miCedula) {
    orParts.push(`acudiente_identificacion.eq."${miCedula}"`);
  }

  // Solo añadimos los IDs manuales si el usuario es el Director
  if (esDirector) {
    manualIds.forEach((id: string) => {
      if (id && id.length > 5) orParts.push(`id.eq.${id}`);
    });
  }

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
