require('dotenv').config();
const admin = require('firebase-admin');
const fs = require('fs');

admin.initializeApp({
  credential: admin.credential.cert({
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
  }),
});

const db = admin.firestore();
const reservations = JSON.parse(fs.readFileSync('./reservations.json', 'utf8'));

async function importData() {
  const batch = db.batch();

  reservations.forEach((item) => {
    const ref = db.collection('reservations').doc();
    batch.set(ref, item);
  });

  try {
    await batch.commit();
    console.log('✅ Data successfully imported');
  } catch (err) {
    console.error('❌ Error importing data:', err);
  }
}

importData();
