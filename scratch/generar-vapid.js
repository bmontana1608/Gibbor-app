const webpush = require('web-push');
const vapidKeys = webpush.generateVAPIDKeys();

console.log('--- COPIA ESTAS LLAVES EN TU ARCHIVO .env O GUÁRDALAS ---');
console.log('VAPID_PUBLIC_KEY:', vapidKeys.publicKey);
console.log('VAPID_PRIVATE_KEY:', vapidKeys.privateKey);
console.log('-------------------------------------------------------');
