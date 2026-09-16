const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function unificarContabilidad() {
  console.log("🛠️ Iniciando unificación de cartera y corrección de ingresos...");

  // 1. ELIMINAR LOS REGISTROS DUPLICADOS QUE YO CREÉ
  console.log("🧹 Borrando registros de sincronización automática...");
  const { error: errDel } = await supabase.from('pagos_ingresos')
    .delete()
    .ilike('notas', '%Sincronización%');

  if (errDel) console.error("Error borrando duplicados:", errDel.message);

  // 2. OBTENER JUGADORES ACTUALES PARA EL MAPEO
  const { data: jugadores } = await supabase.from('perfiles').select('id, nombres, apellidos');
  
  // 3. OBTENER TODOS LOS PAGOS RESTANTES (LOS ORIGINALES)
  const { data: pagos } = await supabase.from('pagos_ingresos').select('*');

  console.log(`📊 Analizando ${pagos.length} recibos originales para re-vinculación...`);

  let reconectados = 0;

  for (const pago of pagos) {
    // Si el jugador_id del pago ya no existe en la tabla de perfiles (ID viejo)
    if (!jugadores.find(j => j.id === pago.jugador_id)) {
      
      // Intentamos buscar al dueño por nombre y apellido
      const dueño = jugadores.find(j => 
        j.nombres.toLowerCase().trim() === (pago.nombres || '').toLowerCase().trim() &&
        j.apellidos.toLowerCase().trim() === (pago.apellidos || '').toLowerCase().trim()
      );

      if (dueño) {
        // Vinculamos el recibo original al ID nuevo
        const { error } = await supabase.from('pagos_ingresos')
          .update({ jugador_id: dueño.id })
          .eq('id', pago.id);
        
        if (!error) reconectados++;
      }
    }
  }

  console.log(`✅ ¡Contabilidad saneada!`);
  console.log(`🗑️ Duplicados eliminados.`);
  console.log(`🔗 ${reconectados} recibos originales re-vinculados a sus dueños.`);
}

unificarContabilidad();
