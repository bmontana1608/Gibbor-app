import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Fetch current config
  const { data: config } = await supabaseAdmin.from('configuracion_wa').select('*').eq('club_id', '7e99fa41-bbd3-4a48-bb58-b5b8cdfbbd10').maybeSingle();
  
  // 2. Add a payment method
  const metodos = [{ id: "test", nombre: "Prueba", numero: "123", instrucciones: "Ninguna" }];
  const payload = { ...config, metodos_pago: JSON.stringify(metodos) };
  
  // 3. Upsert
  const { error: upsertError } = await supabaseAdmin.from('configuracion_wa').upsert(payload);
  
  // 4. Fetch again
  const { data: configAfter } = await supabaseAdmin.from('configuracion_wa').select('*').eq('club_id', '7e99fa41-bbd3-4a48-bb58-b5b8cdfbbd10').maybeSingle();

  // 5. Try to parse it
  let parsed = null;
  let parseError = null;
  try {
    parsed = JSON.parse(configAfter.metodos_pago);
  } catch (e: any) {
    parseError = e.message;
  }

  return NextResponse.json({
    before: config.metodos_pago,
    upsertError,
    after: configAfter.metodos_pago,
    parsed,
    parseError
  });
}
