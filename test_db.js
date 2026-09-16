const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const res1 = await supabase.from('facturas_saas').select('*').limit(1);
  console.log("FACTURAS SAAS:", res1.error ? "ERROR: " + res1.error.message : "OK, count: " + res1.data.length);
  
  const res2 = await supabase.from('pagos_saas').select('*').limit(1);
  console.log("PAGOS SAAS:", res2.error ? "ERROR: " + res2.error.message : "OK, count: " + res2.data.length);

  const res3 = await supabase.from('configuracion_superadmin').select('*').limit(1);
  console.log("CONFIG SUPERADMIN:", res3.error ? "ERROR: " + res3.error.message : "OK, count: " + res3.data.length);
}

run();
