const axios = require('axios');

const API_KEY = '98fe0f890b9a730f085dfbee9a610cd44a958a827195ccef25b03d5cffd861c2';
const BASE_URL = 'https://evolution-api-production-c6137.up.railway.app';

async function testCreate() {
    try {
        console.log("➕ Intentando crear la instancia 'gibbor'...");
        const response = await axios.post(`${BASE_URL}/instance/create`, {
            instanceName: "gibbor",
            token: "gibbor",
            qrcode: true,
            integration: "WHATSAPP-BAILEYS"
        }, {
            headers: { 
                'apikey': API_KEY,
                'Content-Type': 'application/json'
            }
        });
        console.log("✅ Creación exitosa:", response.data);
    } catch (error) {
        console.error("❌ Error al crear:", error.response?.status, error.response?.data || error.message);
    }
}
testCreate();
