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

async function restaurarDirector() {
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
  console.log("Restaurando perfil como Director...");

  const perfilData = {
    id: usuario.id, // Forzamos el ID de auth.users
    nombres: "Administrador Gibbor",
    apellidos: "FC",
    telefono: "3000000000",
    rol: "Director",
    estado_miembro: "Activo"
  };

  const { data, error } = await supabase
    .from('perfiles')
    .upsert(perfilData)
    .select();

  if (error) {
    console.error("Error al restaurar el perfil en la base de datos:", error.message);
  } else {
    console.log("✅ ¡Perfil de Director restaurado con éxito! Ya puedes iniciar sesión.");
  }
}

restaurarDirector();
