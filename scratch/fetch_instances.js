require('dotenv').config({ path: '.env.local' });

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

async function fetchAll() {
  const cleanUrl = EVOLUTION_API_URL.endsWith('/') ? EVOLUTION_API_URL.slice(0, -1) : EVOLUTION_API_URL;
  const url = `${cleanUrl}/instance/fetchInstances`;
  console.log(`📡 Fetching all instances from: ${url}`);
  
  try {
    const res = await fetch(url, {
      headers: { 'apikey': EVOLUTION_API_KEY }
    });
    
    console.log(`Status: ${res.status}`);
    const data = await res.json();
    console.log("\n📦 RESPUESTA DE INSTANCIAS:");
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("❌ Error fetching instances:", e.message);
  }
}

fetchAll();
