const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase.from('categorias').select('id, nombre').limit(2);
  console.log('Error:', error);
  console.log('Data:', data);
  
  const { data: evs } = await supabase.from('eventos').select('id, titulo, categoria_id').limit(5);
  console.log('Eventos:', evs);
}
test();
