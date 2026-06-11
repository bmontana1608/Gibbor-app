require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testQuery() {
  const { data, error } = await supabase
    .from('eventos')
    .select(`
      *,
      perfiles!eventos_creado_por_fkey (nombres, apellidos),
      convocatorias (
        id,
        rol_partido,
        estado_notificacion,
        perfiles!convocatorias_jugador_id_fkey (nombres, apellidos, foto_url, posicion)
      )
    `)
    .eq('club_id', '8ccc1313-d7f3-42c1-8b91-b97014705694')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error("QUERY ERROR:", error);
  } else {
    console.log("SUCCESS. Fetched:", data.length, "eventos.");
    // Check if any have convocatorias
    const withConvs = data.filter(e => e.convocatorias && e.convocatorias.length > 0);
    console.log("With convocatorias:", withConvs.length);
  }
}

testQuery();
