const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncAllReceipts() {
  console.log("Sincronizando recibos proporcionados por el usuario...");

  const recibosUsuario = [
    "Daniell Santiago Sánchez Sánchez",
    "William Gerónimo Castillo Bernal",
    "Joshua Eduardo Florez Rico",
    "David Santiago Cortes Jaramillo",
    "Angel Gabriel Sánchez Ramirez",
    "Frankyurbi Castillo",
    "Samuel Gallego",
    "David Alejandro Melo Rodriguez",
    "Carlos Andrés Rodríguez sonsa",
    "Julian Andres Rico Gonzalez",
    "Alvaro Jose Palomino Villarreal",
    "Elena Ruiz fontecha",
    "Isabella Corredor clavijo",
    "Angel David Palomino Villarreal",
    "Milan Stiven Rojas Sarmiento",
    "Emanuel Riaño Contreras",
    "Oskar David Bastilla Lamprea",
    "Tomas Cárdenas Riaño"
  ];

  // 1. Obtener todos los perfiles de Futbolistas
  const { data: jugadores } = await supabaseAdmin
    .from('perfiles')
    .select('id, nombres, apellidos')
    .eq('rol', 'Futbolista');

  console.log(`Buscando coincidencias para ${recibosUsuario.length} recibos...`);

  for (const nombreRecibo of recibosUsuario) {
    const nombreLimpio = nombreRecibo.toLowerCase().trim();
    
    // Buscar el jugador más parecido
    const jugador = jugadores.find(j => {
      const nombreCompleto = `${j.nombres} ${j.apellidos}`.toLowerCase().trim();
      return nombreCompleto.includes(nombreLimpio) || nombreLimpio.includes(nombreCompleto);
    });

    if (jugador) {
       console.log(`✅ Emparejado: "${nombreRecibo}" -> ${jugador.nombres} ${jugador.apellidos}`);
       
       // Sincronizar todos los recibos que tengan ese nombre (o parecido) al ID correcto
       const { data: recibosRelacionados } = await supabaseAdmin
         .from('pagos_ingresos')
         .select('id, nombres, apellidos')
         .filter('fecha', 'gte', '2026-04-01');
       
       for (const r of recibosRelacionados) {
         const nRec = `${r.nombres} ${r.apellidos}`.toLowerCase().trim();
         if (nRec.includes(nombreLimpio) || nombreLimpio.includes(nRec)) {
            await supabaseAdmin
              .from('pagos_ingresos')
              .update({ jugador_id: jugador.id })
              .eq('id', r.id);
         }
       }

       // Marcar al día
       await supabaseAdmin
         .from('perfiles')
         .update({ estado_pago: 'Al día' })
         .eq('id', jugador.id);
    } else {
       console.log(`❌ No se encontró perfil para: "${nombreRecibo}"`);
    }
  }

  console.log("\nSincronización finalizada.");
}

syncAllReceipts();
