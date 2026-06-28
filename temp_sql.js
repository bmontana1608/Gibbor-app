const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.rpc('execute_sql', { 
    query: `ALTER TABLE public.configuracion_wa 
    ADD COLUMN IF NOT EXISTS cobranza_auto_activa boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS cobranza_dias_previos integer DEFAULT 3,
    ADD COLUMN IF NOT EXISTS cobranza_metodo_pago text DEFAULT 'puedes hacerlo en efectivo o pidiendo el link de pago.';` 
  });
  if (error) {
    console.error('RPC execute_sql failed:', error);
  } else {
    console.log('Success!', data);
  }
}
run();
