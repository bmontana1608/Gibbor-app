require('dotenv').config({ path: '.env.local' });

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

async function checkInstances() {
  const cleanUrl = EVOLUTION_API_URL.endsWith('/') ? EVOLUTION_API_URL.slice(0, -1) : EVOLUTION_API_URL;
  console.log(`📡 Conectando a Evolution API: ${cleanUrl}`);
  
  try {
    const listRes = await fetch(`${cleanUrl}/instance/fetchInstances`, {
      headers: { 'apikey': EVOLUTION_API_KEY }
    });
    
    if (listRes.ok) {
      const listData = await listRes.json();
      console.log("\n📦 INSTANCIAS ENCONTRADAS:");
      console.log(JSON.stringify(listData, null, 2));
    } else {
      console.log(`⚠️ Falló fetchInstances: Código ${listRes.status}. Intentando obtener por nombre de instancia...`);
    }
  } catch (e) {
    console.log("⚠️ Error al listar todas las instancias:", e.message);
  }

  const commonInstances = ['gibbor', 'aguilas-negras', 'aguilas', 'bmontana1608', 'montana'];
  
  console.log("\n🔍 PROBANDO ESTADOS DE INSTANCIAS ESPECÍFICAS:");
  for (const inst of commonInstances) {
    try {
      const res = await fetch(`${cleanUrl}/instance/connectionState/${inst}`, {
        headers: { 'apikey': EVOLUTION_API_KEY }
      });
      const data = await res.json();
      console.log(`- Instancia "${inst}": Status = ${res.status}, State =`, data.instance?.state || data.message || "desconocido");
    } catch (e) {
      console.log(`- Instancia "${inst}": Error:`, e.message);
    }
  }
}

checkInstances();
