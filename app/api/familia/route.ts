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

  // Paso 1: Obtener la cédula del usuario actual para buscar a sus hijos
  const { data: miPerfil } = await supabaseAdmin
    .from("perfiles")
    .select("documento_identidad, acudiente_identificacion")
    .eq("id", uid)
    .single();

  const miCedula = miPerfil?.documento_identidad || miPerfil?.acudiente_identificacion;

  // Paso 2: Construimos la cláusula OR buscando por ID, por Cédula de Acudiente o por Email
  const orParts = [
    `id.eq.${uid}`,
    email ? `email_contacto.eq."${email}"` : null,
  ];
  
  if (miCedula) {
    orParts.push(`acudiente_identificacion.eq."${miCedula}"`);
  }

  const orClause = orParts.filter(Boolean).join(',');

  // Buscamos por ID, por Acudiente y por Correo
  const { data: misPerfiles, error } = await supabaseAdmin
    .from("perfiles")
    .select("*")
    .or(orClause);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Eliminar duplicados por ID
  const unicos = Array.from(new Map(misPerfiles.map(item => [item.id, item])).values());

  return NextResponse.json(unicos);
}
