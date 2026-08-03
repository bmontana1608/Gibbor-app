const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkGibborStudents() {
  const gibborClubId = '8ccc1313-d7f3-42c1-8b91-b97014705694';
  
  const { data: alumnos, error } = await supabase
    .from('perfiles')
    .select('nombres, apellidos, grupos')
    .eq('club_id', gibborClubId)
    .eq('rol', 'Futbolista');

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  const conteo = {};
  alumnos.forEach(a => {
    const grupo = a.grupos || 'SIN GRUPO';
    conteo[grupo] = (conteo[grupo] || 0) + 1;
  });

  console.log('--- Distribución de Alumnos en Gibbor ---');
  console.log(conteo);
}

checkGibborStudents();
