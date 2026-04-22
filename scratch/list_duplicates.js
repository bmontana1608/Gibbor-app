const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function listDuplicates() {
  console.log("Buscando futbolistas duplicados por documento...");

  // 1. Obtener todos los futbolistas
  const { data: perfiles, error } = await supabaseAdmin
    .from('perfiles')
    .select('id, nombres, apellidos, documento, club_id, email_contacto, telefono, created_at')
    .eq('rol', 'Futbolista');

  if (error) {
    console.error("Error fetching perfiles:", error);
    return;
  }

  // 2. Agrupar por (club_id, documento)
  const groups = {};
  perfiles.forEach(p => {
    if (!p.documento) return; // Ignorar si no tiene documento
    const key = `${p.club_id}_${p.documento.trim()}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });

  // 3. Filtrar grupos con más de 1 perfil
  const duplicates = Object.values(groups).filter(g => g.length > 1);

  if (duplicates.length === 0) {
    console.log("No se encontraron duplicados con documento.");
    return;
  }

  console.log(`Se encontraron ${duplicates.length} grupos de duplicados.`);
  
  duplicates.forEach((group, index) => {
    console.log(`\nGrupo ${index + 1}: Documento [${group[0].documento}]`);
    group.forEach(p => {
      console.log(`  - ID: ${p.id} | ${p.nombres} ${p.apellidos} | Creado: ${p.created_at} | Email: ${p.email_contacto}`);
    });
  });
}

listDuplicates();
