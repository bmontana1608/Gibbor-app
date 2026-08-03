const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.rpc('execute_sql', { 
    query: `ALTER TABLE public.pagos_saas DROP CONSTRAINT IF EXISTS pagos_saas_factura_id_fkey;
            ALTER TABLE public.pagos_saas ADD CONSTRAINT pagos_saas_factura_id_fkey FOREIGN KEY (factura_id) REFERENCES facturacion_mensual(id) ON DELETE SET NULL;` 
  });
  if (error) {
    console.error('RPC execute_sql failed:', error);
  } else {
    console.log('Success!', data);
  }
}
run();
