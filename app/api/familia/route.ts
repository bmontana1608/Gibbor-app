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

  // Paso 1: Obtener la cédula del usuario actual
  const { data: miPerfil } = await supabaseAdmin
    .from("perfiles")
    .select("documento_identidad, acudiente_identificacion")
    .eq("id", uid)
    .single();

  const miCedula = miPerfil?.documento_identidad || miPerfil?.acudiente_identificacion;

  // Paso 2: Obtener IDs configurados manualmente en hijos_config
  const { data: config } = await supabaseAdmin
    .from("configuracion_wa")
    .select("hijos_config")
    .single();
  
  const manualIds = config?.hijos_config ? config.hijos_config.split(',').map((id: string) => id.trim()) : [];

  // Paso 3: Construimos la cláusula OR buscando por ID, por Cédula de Acudiente, por Email o por IDs manuales
  const orParts = [
    `id.eq.${uid}`,
    email ? `email_contacto.eq."${email}"` : null,
  ];
  
  if (miCedula) {
    orParts.push(`acudiente_identificacion.eq."${miCedula}"`);
  }

  // Añadimos los IDs de la configuración manual
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

  // Eliminar duplicados y filtrar el perfil del Director de la lista de "hijos"
  const unicos = Array.from(new Map(misPerfiles.map(item => [item.id, item])).values());
  const soloHijos = unicos.filter(p => p.id !== uid || p.rol !== "Director");

  return NextResponse.json(soloHijos);
}
