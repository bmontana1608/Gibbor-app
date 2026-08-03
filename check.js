const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: planes } = await supabase.from('planes_saas').select('*');
  console.log('Planes:', planes);
  
  const { data: facturas } = await supabase.from('facturacion_mensual').select('*');
  console.log('Facturas:', facturas);
}
check();
