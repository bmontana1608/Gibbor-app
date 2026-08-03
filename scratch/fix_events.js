const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixEvents() {
  const { data: evs } = await supabase.from('eventos').select('id, categoria_id');
  if (!evs) return;
  
  const { data: cats } = await supabase.from('categorias').select('id, nombre');
  const catMap = {};
  cats.forEach(c => catMap[c.id] = c.nombre);

  let count = 0;
  for (const ev of evs) {
    // If categoria_id is a UUID that exists in categorias table
    if (ev.categoria_id && catMap[ev.categoria_id]) {
      await supabase.from('eventos').update({ categoria_id: catMap[ev.categoria_id] }).eq('id', ev.id);
      count++;
    }
  }
  console.log(`Arreglados ${count} eventos con UUID en vez de nombre.`);
}

fixEvents();
