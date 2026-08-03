require('dotenv').config({ path: '.env.local' });

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

async function testSendDirect() {
  const cleanUrl = EVOLUTION_API_URL.endsWith('/') ? EVOLUTION_API_URL.slice(0, -1) : EVOLUTION_API_URL;
  const instance = 'gibbor';
  
  const url = `${cleanUrl}/message/sendText/${instance}`;
  console.log(`📡 Enviando texto directo a través de Evolution API: ${url}`);
  
  // Enviemos un mensaje de texto a un número de prueba (usando el número del director en el log: 573124265170)
  const payload = {
    number: "573124265170",
    text: "Mensaje de prueba de diagnóstico de conexión de WhatsApp",
    delay: 1200,
    linkPreview: true
  };
  
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVOLUTION_API_KEY
      },
      body: JSON.stringify(payload)
    });
    
    console.log(`Status: ${res.status} (${res.statusText})`);
    
    const bodyText = await res.text();
    console.log("\n📦 CUERPO DE RESPUESTA DE EVOLUTION API:");
    console.log(bodyText);
  } catch (error) {
    console.error("❌ Error en la llamada fetch:", error.message);
  }
}

testSendDirect();
