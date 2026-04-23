const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function listGibborStaff() {
  const gibborClubId = '8ccc1313-d7f3-42c1-8b91-b97014705694';
  
  console.log('--- Personal y Alumnos de Gibbor ---');
  const { data: perfiles, error } = await supabase
    .from('perfiles')
    .select('id, nombres, apellidos, rol, grupos')
    .eq('club_id', gibborClubId);

  if (error) {
    console.error('Error:', error.message);
  } else {
    perfiles.forEach(p => {
      console.log(`- [${p.rol}] ${p.nombres} ${p.apellidos} | ID: ${p.id} | Grupos: ${p.grupos}`);
    });
  }
}

listGibborStaff();
