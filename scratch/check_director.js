const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUser() {
  const email = 'escuelagibborfc@gmail.com';
  
  console.log(`--- Verificando usuario: ${email} ---`);
  
  const { data: perfil, error: pError } = await supabase
    .from('perfiles')
    .select('*, clubes(*)')
    .eq('email', email)
    .single();

  if (pError) {
    console.error('Error buscando perfil:', pError.message);
  } else {
    console.log('Perfil encontrado:');
    console.log('- Nombre:', perfil.nombres, perfil.apellidos);
    console.log('- Rol:', perfil.rol);
    console.log('- Club ID en Perfil:', perfil.club_id);
    console.log('- Club Asociado (Slug):', perfil.clubes?.slug);
  }

  console.log('\n--- Verificando Club "gibbor" ---');
  const { data: club, error: cError } = await supabase
    .from('clubes')
    .select('*')
    .eq('slug', 'gibbor')
    .single();

  if (cError) {
    console.error('Error buscando club gibbor:', cError.message);
  } else {
    console.log('Club Gibbor:');
    console.log('- ID Real:', club.id);
    console.log('- Nombre:', club.nombre);
  }

  if (perfil && club) {
    if (perfil.club_id === club.id) {
      console.log('\n✅ LOS IDS COINCIDEN. El bloqueo es lógico.');
    } else {
      console.log('\n❌ LOS IDS NO COINCIDEN. Hay un error de vinculación en la base de datos.');
    }
  }
}

checkUser();
