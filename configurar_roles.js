const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log("Iniciando re-asignación de roles...");

  // 1. Buscar a todos los usuarios
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
  if (authError) {
    console.error("Error al listar usuarios de Auth:", authError.message);
    return;
  }
  
  const usuarios = authData.users;

  // 2. Buscar/Restablecer al Director (Gibbor FC)
  const gibborUser = usuarios.find(u => u.email === 'escuelagibborfc@gmail.com');
  
  if (gibborUser) {
    const { data: gibborClub } = await supabaseAdmin.from('clubes').select('id').eq('slug', 'gibbor').single();
    if (gibborClub) {
      console.log("✓ Enlazando escuelagibborfc a la Academia Gibbor FC...");
      await supabaseAdmin.from('perfiles')
        .update({ rol: 'Director', club_id: gibborClub.id })
        .eq('id', gibborUser.id);
    }
  } else {
    console.log("⚠️ No se encontró la cuenta escuelagibborfc@gmail.com registrada todavía en Auth.");
  }

  // 3. Crear/Elevar al nuevo SuperAdmin
  let nexclubUser = usuarios.find(u => u.email === 'nexclub@test.com');
  
  if (!nexclubUser) {
    console.log("✓ Creando al nuevo guardián SaaS: nexclub@test.com...");
    const { data: newAuthData, error: newAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: 'nexclub@test.com',
      password: 'NexClub2026*',
      email_confirm: true
    });
    
    if (newAuthError) {
      console.error("Error creando al admin:", newAuthError.message);
      return;
    }
    
    nexclubUser = newAuthData.user;
    
    await supabaseAdmin.from('perfiles').insert([{
      id: nexclubUser.id,
      nombres: 'NexClub',
      apellidos: 'SaaS Master',
      rol: 'SuperAdmin'
    }]);
  } else {
    console.log("✓ Elevando nexclub@test.com al rol SuperAdmin...");
    await supabaseAdmin.from('perfiles')
      .update({ rol: 'SuperAdmin', club_id: null })
      .eq('id', nexclubUser.id);
  }

  console.log("============== RESULTADOS ===============");
  console.log("1. ✅ escuelagibborfc@gmail.com ahora navega dentro de la bóveda de 'Gibbor FC' (Rol: Director)");
  console.log("2. ✅ nexclub@test.com es el nuevo dios de la plataforma (Rol: SuperAdmin)");
  console.log("   Contraseña temporal: NexClub2026*");
  console.log("=========================================");
}

main();
