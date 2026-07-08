const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: planesData, error: planesErr } = await supabase.from('planes_saas').select('*');
  console.log("PLANES SAAS:", planesData);
}

run();
