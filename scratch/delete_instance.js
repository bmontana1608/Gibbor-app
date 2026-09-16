const axios = require('axios');

const API_KEY = '98fe0f890b9a730f085dfbee9a610cd44a958a827195ccef25b03d5cffd861c2';
const BASE_URL = 'https://evolution-api-production-c6137.up.railway.app';

async function testDelete() {
    try {
        console.log("❌ Intentando desvincular (logout) la instancia 'gibbor'...");
        const response = await axios.delete(`${BASE_URL}/instance/logout/gibbor`, {
            headers: { 'apikey': API_KEY }
        });
        console.log("✅ Desvinculado exitoso:", response.data);
    } catch (error) {
        console.error("❌ Error al borrar:", error.response?.status, error.response?.data || error.message);
    }
}
testDelete();
