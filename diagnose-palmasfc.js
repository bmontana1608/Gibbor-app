const { createClient } = require('@supabase/supabase-js');

// Acepta credenciales como argumentos: node diagnose-palmasfc.js <SUPABASE_URL> <SERVICE_ROLE_KEY>
// O como variables de entorno: SUPABASE_URL=... SERVICE_KEY=... node diagnose-palmasfc.js
const SUPABASE_URL = process.argv[2] || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.argv[3] || process.env.SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Uso: node diagnose-palmasfc.js <SUPABASE_URL> <SERVICE_ROLE_KEY>');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  // Buscar el club Palmas FC
  const {data: clubs, error: clubErr} = await sb.from('clubes').select('id,nombre,slug');
  if (clubErr) {
    console.log('Error obteniendo clubes:', JSON.stringify(clubErr));
    return;
  }

  const palmas = clubs.find(c => c.nombre?.toLowerCase().includes('palmas') || c.slug?.toLowerCase().includes('palmas'));
  if (!palmas) {
    console.log('No se encontro club Palmas. Clubes disponibles:');
    clubs.forEach(c => console.log('  - slug:', c.slug, '| nombre:', c.nombre));
    return;
  }
  
  console.log('Club encontrado:', palmas.nombre, '| slug:', palmas.slug, '| id:', palmas.id);
  
  // Obtener todos los entrenadores del club
  const {data: perfiles, error: pErr} = await sb
    .from('perfiles')
    .select('id, nombres, apellidos, email_contacto, rol, estado_miembro')
    .eq('club_id', palmas.id)
    .eq('rol', 'Entrenador');
    
  if (pErr || !perfiles) {
    console.log('Error obteniendo perfiles:', JSON.stringify(pErr));
    return;
  }
  console.log('\nEntrenadores de ' + palmas.nombre + ': ' + perfiles.length);
  
  // Obtener todos los usuarios de Auth
  let allUsers = [];
  let page = 1;
  while(true) {
    const {data: listData} = await sb.auth.admin.listUsers({page, perPage: 1000});
    if (!listData || !listData.users || listData.users.length === 0) break;
    allUsers = allUsers.concat(listData.users);
    if (listData.users.length < 1000) break;
    page++;
  }
  console.log('Total usuarios en Auth: ' + allUsers.length);
  console.log('');
  
  for (const p of perfiles) {
    const email = (p.email_contacto || '').toLowerCase().trim();
    const authUser = allUsers.find(u => u.email && u.email.toLowerCase().trim() === email);
    
    if (!authUser) {
      console.log('[SIN AUTH] ' + p.nombres + ' ' + p.apellidos + ' | email: ' + email + ' | estado: ' + p.estado_miembro);
    } else {
      const idOk = authUser.id === p.id ? 'ID-OK' : 'ID-DIFERENTE(Auth:' + authUser.id + ' Perfil:' + p.id + ')';
      const emailOk = authUser.email_confirmed_at ? 'email-OK' : 'EMAIL-NO-CONFIRMADO';
      console.log('[OK] ' + p.nombres + ' ' + p.apellidos + ' | ' + email + ' | ' + idOk + ' | ' + emailOk);
    }
  }
  
  console.log('\nDiagnostico completado.');
}

main().catch(console.error);
