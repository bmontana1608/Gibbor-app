require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data, error } = await supabase.rpc('query_sql', { query: "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'eventos_tipo_check';" });
  console.log("RPC query_sql result:", data, error);
}

main();
