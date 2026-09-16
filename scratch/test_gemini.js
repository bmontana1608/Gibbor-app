require('dotenv').config({ path: '.env.local' });

async function testGemini() {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    console.error("No GEMINI_API_KEY in .env.local");
    return;
  }

  const model = "gemini-1.5-flash"; // testing 1.5 first, if route had 2.5 it might fail
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: "Hola, ¿estás funcionando?" }] }],
        systemInstruction: {
          role: "system",
          parts: [{ text: "Eres un bot de prueba." }]
        }
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("API Error:", data.error);
      
      // Intentar con gemini-2.5-flash que estaba en el código
      console.log("Trying gemini-2.5-flash...");
      const res2 = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: "Hola" }] }] })
      });
      const data2 = await res2.json();
      console.log("Result for 2.5:", data2);
    } else {
      console.log("SUCCESS!", data.candidates[0].content.parts[0].text);
    }
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}

testGemini();
