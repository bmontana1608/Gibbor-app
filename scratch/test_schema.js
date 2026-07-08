require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTables() {
  const { data, error } = await supabase.rpc('get_tables'); // Or just fetch a random event
  
  // Or fetch table names from information_schema if rpc is not available
  console.log("Done");
}

checkTables();
