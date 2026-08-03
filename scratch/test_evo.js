require('dotenv').config({ path: '.env.local' });

async function run() {
  const url = `${process.env.EVOLUTION_API_URL}/message/sendText/gibbor`;
  const body = {
    number: "573103391496",
    text: "Mensaje de prueba",
    delay: 1200,
    linkPreview: true
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.EVOLUTION_API_KEY
      },
      body: JSON.stringify(body)
    });
    const data = await res.text();
    console.log(res.status, data);
  } catch(e) {
    console.error(e);
  }
}
run();
