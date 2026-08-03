require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkAnonRead() {
  const { data, error } = await supabase
    .from('clubes')
    .select('estado, estado_suscripcion, slug');
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log(data);
  }
}

checkAnonRead();
