const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fix() {
  await supabase.from('clubes').update({ plan_id: 2 }).eq('id', 'af12fa06-3990-46a1-8cac-bf6017ab417c');
  console.log('Fixed Sikuani');
}
fix();
