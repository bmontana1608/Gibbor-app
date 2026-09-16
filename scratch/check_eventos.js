require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkEventos() {
  const { data, error } = await supabase.from('eventos').select('*').limit(1);
  if (error) {
    console.error("Error connecting:", error);
    return;
  }
  if (data && data.length > 0) {
    console.log("Eventos fields:", Object.keys(data[0]));
    console.log("Eventos data:", data[0]);
  } else {
    console.log("No eventos found, but query succeeded.");
  }
}

checkEventos();
