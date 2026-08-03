require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkData() {
  console.log("Fetching last 5 eventos...");
  const { data: eventos, error: err1 } = await supabase
    .from('eventos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (err1) console.error("Error eventos:", err1);
  else console.log("Eventos:", JSON.stringify(eventos, null, 2));

  if (eventos && eventos.length > 0) {
    const { data: convs, error: err2 } = await supabase
      .from('convocatorias')
      .select('*')
      .in('evento_id', eventos.map(e => e.id));
      
    if (err2) console.error("Error convocatorias:", err2);
    else console.log("Convocatorias de esos eventos:", JSON.stringify(convs, null, 2));
  }
}

checkData();
