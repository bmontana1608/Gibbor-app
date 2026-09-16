const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const envUrlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const envKeyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabaseUrl = envUrlMatch ? envUrlMatch[1].trim() : null;
const supabaseServiceKey = envKeyMatch ? envKeyMatch[1].trim() : null;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Faltan las variables de entorno en .env.local.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function crearSuperAdmin() {
  // Vamos a usar el correo predeterminado del admin del SaaS.
  // Tu email suele ser: "escuelagibborfc@gmail.com" pero puedes cambiar esto.
  const email = "escuelagibborfc@gmail.com";
  
  console.log(`Buscando usuario con email: ${email}...`);
  const { data: { users }, error: errorAuth } = await supabase.auth.admin.listUsers();
  
  if (errorAuth) {
    console.error("Error al buscar en auth:", errorAuth);
    return;
  }
  
  const usuario = users.find(u => u.email === email);
  
  if (!usuario) {
    console.error(`No existe ningún usuario en Supabase Auth con el email: ${email}`);
    process.exit(1);
  }

  console.log(`Usuario encontrado. ID: ${usuario.id}`);
  console.log("Asignando el rol maestro de 'SuperAdmin'...");

  // Este script actualiza el rol en la tabla perfiles a SuperAdmin
  const { data, error } = await supabase
    .from('perfiles')
    .update({ rol: 'SuperAdmin' })
    .eq('id', usuario.id)
    .select();

  if (error) {
    console.error("Error al actualizar el perfil en la base de datos:", error.message);
  } else {
    console.log("✅ ¡Perfil actualizado a SuperAdmin con éxito! Ahora tienes acceso al Panel SaaS (/admin).");
  }
}

crearSuperAdmin();
