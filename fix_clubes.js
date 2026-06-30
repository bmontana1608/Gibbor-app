require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data: clubes } = await supabase.from('clubes').select('id').in('nombre', ['aguilas negras', 'warrior city']);
  
  if (clubes) {
    for (const club of clubes) {
      console.log("Deleting dependencies for club:", club.id);
      await supabase.from('perfiles').delete().eq('club_id', club.id);
      await supabase.from('membresias').delete().eq('club_id', club.id);
      await supabase.from('categorias').delete().eq('club_id', club.id);
      await supabase.from('eventos').delete().eq('club_id', club.id);
      // Wait, there might be other dependencies, but perfiles is the most common one.
      await supabase.from('clubes').delete().eq('id', club.id);
    }
  }

  const { data } = await supabase.from('clubes').select('id, nombre, estado_referido');
  console.log("Clubes after final fix:");
  if (data) {
    data.forEach(d => console.log(d.nombre, "->", d.estado_referido));
  }
}

run();
