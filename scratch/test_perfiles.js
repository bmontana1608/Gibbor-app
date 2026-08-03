require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPerfiles() {
  const { data, error } = await supabase
    .from('perfiles')
    .select('id, nombres, apellidos, fecha_nacimiento, rol, grupos')
    .eq('rol', 'Futbolista')
    .limit(10);
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log(data);
  }
}

checkPerfiles();
