import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { sql } = await req.json();
    // Intenta usar la función RPC si existe (esto requiere que en Supabase se haya creado una función 'query_sql')
    const { data, error } = await supabaseAdmin.rpc('query_sql', { sql });
    
    if (error) {
       // Alternativa si no existe query_sql:
       return NextResponse.json({ error: error.message, hint: "Debes crear una función 'query_sql' en Supabase para ejecutar SQL arbitrario." });
    }
    
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
