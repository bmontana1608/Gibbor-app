
require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data } = await supabase.from('perfiles').select('fecha_ingreso_club, fecha_ingreso, created_at, estado_miembro, fecha_inactivacion, updated_at').eq('rol', 'Futbolista').limit(5);
  console.log(data);
}
run();
