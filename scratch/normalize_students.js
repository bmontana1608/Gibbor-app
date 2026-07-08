const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function normalizeStudents() {
  const gibborClubId = '8ccc1313-d7f3-42c1-8b91-b97014705694';
  const nombreLargo = 'CATEGORÍA ALPHA (5 a 8 años)';
  
  console.log('--- Normalizando alumnos de la categoría ALPHA ---');
  
  // Buscamos cualquier alumno que diga "ALPHA" o que esté en el club y no tenga grupo claro
  const { data: alumnos } = await supabase
    .from('perfiles')
    .select('id, grupos')
    .eq('club_id', gibborClubId)
    .eq('rol', 'Futbolista');

  const paraCorregir = alumnos.filter(a => a.grupos === 'ALPHA' || !a.grupos || a.grupos === 'Ninguna');
  
  if (paraCorregir.length > 0) {
    const ids = paraCorregir.map(a => a.id);
    await supabase
      .from('perfiles')
      .update({ grupos: nombreLargo })
      .in('id', ids);
    console.log(`✅ ${ids.length} alumnos normalizados a "${nombreLargo}"`);
  } else {
    console.log('No se encontraron alumnos para normalizar.');
  }
}

normalizeStudents();
