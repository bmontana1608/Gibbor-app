async function testProdApi() {
  const url = "https://portalgibbor.vercel.app/api/whatsapp/send";
  console.log(`📡 Enviando POST a: ${url}`);
  
  const payload = {
    telefono: "573124265170", // un número de prueba
    mensaje: "Prueba de envío de mensaje - Conexión",
    instanceName: "gibbor"
  };
  
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    
    console.log(`Status: ${res.status} (${res.statusText})`);
    
    const contentType = res.headers.get("content-type");
    console.log(`Content-Type: ${contentType}`);
    
    const bodyText = await res.text();
    console.log("\n📦 CUERPO DE LA RESPUESTA DE VERCEL:");
    console.log(bodyText);
    
  } catch (error) {
    console.error("❌ Falló la petición de prueba:", error.message);
  }
}

testProdApi();
