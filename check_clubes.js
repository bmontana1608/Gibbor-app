require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data, error } = await supabase.from('clubes').select('id, nombre, estado_suscripcion, estado_referido, embajador_id');
  console.log("Clubes:");
  if (data) {
    data.forEach(d => console.log(d.id, d.nombre, d.estado_suscripcion, d.estado_referido, d.embajador_id));
  }
  console.log("Error:", error);
}

run();
