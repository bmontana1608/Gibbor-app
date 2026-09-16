const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkFkey() {
  const { data, error } = await supabase.rpc('get_foreign_keys');
  if (error) console.error("RPC fail (might not exist)");
  
  // Try querying information_schema
  const { data: cols } = await supabase.from('pagos_saas').select('*').limit(1);
  console.log('Columns in pagos_saas:', Object.keys(cols[0] || {}));
}
checkFkey();
