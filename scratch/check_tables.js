require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function listTables() {
  const { data, error } = await supabase.from('perfiles').select('id').limit(1);
  if (error) {
    console.error("Error connecting:", error);
    return;
  }
  
  // To list tables we can just do a raw query, or since we can't easily query information_schema from the JS client without RPC, 
  // I will just check if `partido_eventos` or `minuto_minuto` exists by selecting from them.
  const tablesToCheck = ['partido_eventos', 'minuto_minuto', 'eventos_partido', 'acciones_partido'];
  
  for (const table of tablesToCheck) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (error) {
      console.log(`Table ${table} probably doesn't exist or error:`, error.message);
    } else {
      console.log(`Table ${table} EXISTS!`);
    }
  }
}

listTables();
