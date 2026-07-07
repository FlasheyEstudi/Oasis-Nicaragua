import * as admin from 'firebase-admin';

let app: admin.app.App | null = null;

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

if (projectId && clientEmail && privateKey) {
  // Manejar escapes de saltos de línea (\n)
  privateKey = privateKey.replace(/\\n/g, '\n');
  
  try {
    if (!admin.apps.length) {
      app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } else {
      app = admin.app();
    }
  } catch (error) {
    console.error('Error al inicializar Firebase Admin:', error);
  }
} else {
  console.warn('Firebase Admin no configurado. Las notificaciones push estarán en modo simulado.');
}

export { admin, app };
