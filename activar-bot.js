const axios = require('axios');

const API_KEY = '98fe0f890b9a730f085dfbee9a610cd44a958a827195ccef25b03d5cffd861c2';
const BASE_URL = 'https://evolution-api-production-c6137.up.railway.app';
const VERCEL_URL = 'https://portalgibbor.vercel.app';

async function activar() {
    try {
        console.log("🚀 Enviando Configuración Definitiva (Objeto + Mayúsculas)...");
        
        const response = await axios.post(`${BASE_URL}/webhook/set/Gibbor_App`, {
            webhook: {
                url: `${VERCEL_URL}/api/whatsapp/webhook`,
                enabled: true,
                events: ["MESSAGES_UPSERT"]
            }
        }, {
            headers: { 'apikey': API_KEY }
        });

        console.log("✅ ¡SISTEMA ACTIVADO EXITOSAMENTE!");
        console.log("🦾 El bot ya tiene oídos. ¡Pruébalo ahora!");
    } catch (error) {
        console.error("❌ Error inesperado:", JSON.stringify(error.response?.data || error.message, null, 2));
    }
}

activar();
