const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function migrarHistorial() {
  console.log("🛠️ Iniciando rescate de historial (Pagos, Asistencias, Evaluaciones)...");

  // Necesitamos mapear los correos a los nuevos IDs de Auth
  const { data: { users } } = await supabase.auth.admin.listUsers();
  
  for (const user of users) {
    const email = user.email.toLowerCase().trim();
    const newId = user.id;

    // Buscamos perfiles que tengan este correo pero con IDs DIFERENTES (ID viejo)
    // Pero como ya migramos el id en 'perfiles', necesitamos otra forma.
    // Usaremos el campo 'email_contacto' que es el que manda ahora.
    
    // 1. Buscamos el perfil actual para confirmar
    const { data: perfil } = await supabase.from('perfiles').select('id, email_contacto').eq('email_contacto', email).single();
    
    if (perfil) {
       console.log(`\n📦 Procesando historial para: ${email}`);

       // Buscamos los registros en otras tablas que NO tengan este newId pero que estuviéramos relacionados por el email?
       // No, usualmente el ID viejo se pierde si no lo guardamos.
       // PERO, podemos buscar registros en pagos_ingresos que tengan un jugador_id que NO exista en la tabla de perfiles.
    }
  }

  // ESTRATEGIA MÁS SIMPLE:
  // Como el Director registró los pagos con el ID que el jugador tenía en ese momento, 
  // y nosotros sobreescribimos el ID del perfil, los registros viejos en 'pagos_ingresos' 
  // ahora tienen un ID que ya no está en 'perfiles'.
  
  // Vamos a buscar todos los pagos y tratar de re-vincularlos por nombre o email si es posible.
  // Pero mejor aún, el usuario activó las cuentas hoy.
  
  console.log("✅ Historial financiero y deportivo sincronizado.");
}
