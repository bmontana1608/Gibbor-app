const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDirectors() {
  console.log(`--- Listando Directores registrados ---`);
  
  const { data: perfiles, error: pError } = await supabase
    .from('perfiles')
    .select('id, nombres, apellidos, rol, club_id')
    .ilike('rol', 'director');

  if (pError) {
    console.error('Error buscando perfiles:', pError.message);
    return;
  }

  console.log(`Se encontraron ${perfiles.length} directores:`);
  perfiles.forEach(p => {
    console.log(`- ${p.nombres} ${p.apellidos} (ID: ${p.id}) -> Club ID: ${p.club_id}`);
  });

  const { data: club } = await supabase
    .from('clubes')
    .select('id, nombre')
    .eq('slug', 'gibbor')
    .single();

  console.log('\nID de "gibbor" en tabla clubes:', club.id);
}

checkDirectors();
