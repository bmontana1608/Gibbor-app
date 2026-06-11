require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: eventos, error } = await sb
    .from('eventos')
    .select('id, titulo, created_at')
    .in('estado', ['Pendiente', 'Aprobado', 'Devuelta'])
    .order('created_at', { ascending: false });

  if (error) return console.error(error);

  const seen = new Set();
  for (const ev of eventos) {
    if (seen.has(ev.titulo)) {
      console.log(`Deleting duplicate: ${ev.titulo} (${ev.id})`);
      await sb.from('eventos').delete().eq('id', ev.id);
    } else {
      seen.add(ev.titulo);
    }
  }
  console.log("Done");
}
run();
