const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function searchAlexProfiles() {
  console.log('--- Buscando perfiles por nombre: Alex ---');
  
  const { data: perfiles, error } = await supabase
    .from('perfiles')
    .select('*')
    .or('nombres.ilike.%alex%,apellidos.ilike.%alex%');

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log(`Encontrados ${perfiles.length} perfiles relacionados:`);
  perfiles.forEach((p, i) => {
    console.log(`[${i+1}] ID: ${p.id} | Rol: ${p.rol} | Club: ${p.club_id} | Grupos: ${p.grupos} | Nombres: ${p.nombres} ${p.apellidos}`);
  });
}

searchAlexProfiles();
