const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixEval() {
  const { data: evals } = await supabase.from('evaluaciones_tecnicas').select('id, jugador_id').is('club_id', null);
  
  if (!evals || evals.length === 0) {
    console.log("No hay evaluaciones con club_id null");
    return;
  }
  
  console.log(`Encontradas ${evals.length} evaluaciones rotas. Arreglando...`);
  
  let count = 0;
  for (const ev of evals) {
    const { data: perfil } = await supabase.from('perfiles').select('club_id').eq('id', ev.jugador_id).single();
    if (perfil && perfil.club_id) {
      await supabase.from('evaluaciones_tecnicas').update({ club_id: perfil.club_id }).eq('id', ev.id);
      count++;
    }
  }
  
  console.log(`Completado. ${count} arregladas.`);
}

fixEval();
