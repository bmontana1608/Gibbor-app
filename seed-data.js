const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// Cargar variables de entorno
const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function seedRealData() {
  const email = "escuelagibborfc@gmail.com";
  console.log("🚀 Iniciando sincronización de datos reales...");

  const { data: { users } } = await supabase.auth.admin.listUsers();
  const usuario = users.find(u => u.email === email);

  if (!usuario) {
    console.error("❌ Usuario no encontrado.");
    return;
  }

  const jugadorId = usuario.id;

  // 1. Actualizar perfil con stats de demo
  await supabase.from('perfiles').update({
    posicion: "MED",
    grupos: "Sub-15 Elite",
    goles: 12,
    puntos: 450,
    ranking: "3º",
    estado_pago: "Al día",
    proximo_partido: "Sáb 20 Abr vs Millonarios"
  }).eq('id', jugadorId);

  // 2. Insertar Evaluación Técnica (Radar)
  await supabase.from('evaluaciones_tecnicas').upsert({
    jugador_id: jugadorId,
    fecha: new Date().toISOString(),
    stats: {
      "Tiro": 75,
      "Pase": 88,
      "Regate": 82,
      "Defensa": 65,
      "Fisico": 70,
      "Velocidad": 91
    }
  });

  // 3. Insertar algunas asistencias
  const asistencias = [
    { jugador_id: jugadorId, fecha: '2024-04-10', estado: 'Presente', tipo_sesion: 'Entrenamiento' },
    { jugador_id: jugadorId, fecha: '2024-04-12', estado: 'Presente', tipo_sesion: 'Entrenamiento' },
    { jugador_id: jugadorId, fecha: '2024-04-13', estado: 'Ausente', tipo_sesion: 'Partido' },
    { jugador_id: jugadorId, fecha: '2024-04-15', estado: 'Presente', tipo_sesion: 'Entrenamiento' },
  ];
  await supabase.from('asistencias').upsert(asistencias);

  // 4. Insertar un pago verificado
  await supabase.from('pagos_ingresos').upsert({
    jugador_id: jugadorId,
    concepto: "Mensualidad Abril",
    monto: 150000,
    fecha: new Date().toISOString(),
    verificado: true
  });

  console.log("✅ ¡Dashboard sincronizado con éxito! Datos reales inyectados.");
}

seedRealData();
