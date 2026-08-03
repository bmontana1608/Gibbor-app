const axios = require('axios');

const API_KEY = '98fe0f890b9a730f085dfbee9a610cd44a958a827195ccef25b03d5cffd861c2';
const BASE_URL = 'https://evolution-api-production-c6137.up.railway.app';

async function testSend() {
    try {
        console.log("📤 Intentando enviar mensaje de prueba...");
        const response = await axios.post(`${BASE_URL}/message/sendText/gibbor`, {
            number: "573124265170", // User's phone from ownerJid
            text: "¡Hola! Esta es una prueba de conexión desde la app."
        }, {
            headers: { 
                'apikey': API_KEY,
                'Content-Type': 'application/json'
            }
        });
        console.log("✅ Mensaje enviado con éxito:", response.data);
    } catch (error) {
        console.error("❌ Error al enviar:", error.response?.status, error.response?.data || error.message);
    }
}
testSend();
