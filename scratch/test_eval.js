const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase.from('evaluaciones_tecnicas').select('id, club_id, jugador_id').limit(10);
  console.log('Error:', error);
  console.log('Data:', data);
}
test();
