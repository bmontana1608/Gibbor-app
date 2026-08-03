require('dotenv').config({ path: '.env.local' });

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

async function checkDetailedState() {
  const cleanUrl = EVOLUTION_API_URL.endsWith('/') ? EVOLUTION_API_URL.slice(0, -1) : EVOLUTION_API_URL;
  const instance = 'gibbor';
  
  const url = `${cleanUrl}/instance/connectionState/${instance}`;
  console.log(`📡 Consultando estado detallado de: ${url}`);
  
  try {
    const res = await fetch(url, {
      headers: { 'apikey': EVOLUTION_API_KEY }
    });
    
    console.log(`Status: ${res.status}`);
    const data = await res.json();
    console.log("\n📦 RESPUESTA COMPLETA:");
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("❌ Error:", e.message);
  }
}

checkDetailedState();
