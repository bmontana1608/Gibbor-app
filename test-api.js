const axios = require('axios');

const API_KEY = '98fe0f890b9a730f085dfbee9a610cd44a958a827195ccef25b03d5cffd861c2';
const BASE_URL = 'https://evolution-api-production-c6137.up.railway.app';

async function test() {
    try {
        console.log("🔍 Consultando instancias disponibles...");
        const response = await axios.get(`${BASE_URL}/instance/fetchInstances`, {
            headers: { 'apikey': API_KEY }
        });
        console.log("📋 Instancias encontradas:", JSON.stringify(response.data.map(i => i.instanceName || i.name), null, 2));
    } catch (error) {
        console.error("❌ Error consultando:", error.response?.data || error.message);
    }
}
test();
