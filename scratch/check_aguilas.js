const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPermission() {
  // Get club info
  const { data: club, error: clubErr } = await supabase
    .from('clubes')
    .select('id, slug, nombre')
    .eq('slug', 'aguilas-negras')
    .single();

  if (clubErr) {
    console.error("Error finding club 'aguilas-negras':", clubErr.message);
    return;
  }

  console.log("Club 'aguilas-negras' ID:", club.id);

  // Get current session or just check perfiles for a Director
  const { data: directores, error: dirErr } = await supabase
    .from('perfiles')
    .select('id, nombres, apellidos, rol, club_id')
    .eq('rol', 'Director');

  if (dirErr) {
    console.error("Error finding Directors:", dirErr.message);
    return;
  }

  console.log("Directors found:", directores.length);
  directores.forEach(d => {
    console.log(`Director: ${d.nombres} ${d.apellidos} | ID: ${d.id} | Club ID: ${d.club_id} | Matches: ${d.club_id === club.id}`);
  });
}

checkPermission();
