const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data: facturas } = await supabase.from('facturacion_mensual').select('id, club_id, total_pagar');
  console.log('Facturas en BD:', facturas);
}
test();
