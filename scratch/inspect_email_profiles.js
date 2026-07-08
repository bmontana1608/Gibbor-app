const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectProfilesByEmail() {
  const email = 'escuelagibborfc@gmail.com';
  console.log(`--- Buscando perfiles para: ${email} ---`);
  
  const { data: perfiles, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('email', email);

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log(`Se encontraron ${perfiles.length} perfiles:`);
  perfiles.forEach((p, i) => {
    console.log(`[${i+1}] ID: ${p.id} | Rol: ${p.rol} | Club: ${p.club_id} | Grupos: ${p.grupos}`);
  });
}

inspectProfilesByEmail();
