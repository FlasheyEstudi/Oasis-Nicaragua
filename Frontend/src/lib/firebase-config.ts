// ============================================
// OASIS - Firebase Client Configuration
// Initializes Firebase Client SDK for FCM push notifications
// ============================================

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported, type Messaging } from 'firebase/messaging';
import { getAuth, type Auth } from 'firebase/auth';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if credentials are valid (not empty, not placeholder)
export const hasValidConfig = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== 'PLACEHOLDER_API_KEY' &&
  firebaseConfig.apiKey.trim() !== '' &&
  firebaseConfig.messagingSenderId &&
  firebaseConfig.messagingSenderId !== '123456789012'
);

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;
let auth: Auth | null = null;

if (hasValidConfig) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    
    // Initialize Firebase Messaging (only in browser environment)
    if (typeof window !== 'undefined') {
      isSupported().then(supported => {
        if (supported && app) {
          messaging = getMessaging(app);
          console.log('✅ [OASIS PWA] Firebase Messaging initialized');
        } else {
          console.warn('⚠️ [OASIS PWA] Firebase Messaging not supported in this browser');
        }
      }).catch(err => {
        console.warn('⚠️ [OASIS PWA] Failed to check messaging support:', err);
      });
    }
  } catch (error) {
    console.error('❌ [OASIS PWA] Error initializing Firebase App:', error);
  }
} else {
  if (typeof window !== 'undefined') {
    console.warn(
      'ℹ️ [OASIS PWA] Firebase credentials are not configured or are placeholders. Push notifications will be disabled.'
    );
  }
}

// Registrar Service Worker
export async function registerServiceWorker() {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator)) {
    console.warn('⚠️ Service Workers not supported in this browser');
    return null;
  }
  
  try {
    const params = new URLSearchParams({
      apiKey: firebaseConfig.apiKey || '',
      authDomain: firebaseConfig.authDomain || '',
      projectId: firebaseConfig.projectId || '',
      storageBucket: firebaseConfig.storageBucket || '',
      messagingSenderId: firebaseConfig.messagingSenderId || '',
      appId: firebaseConfig.appId || '',
    });
    const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${params.toString()}`);
    console.log('✅ Firebase Service Worker registered');
    return registration;
  } catch (error) {
    console.error('❌ Firebase Service Worker registration failed:', error);
    return null;
  }
}

// Obtener token FCM
export async function requestFirebaseToken(registration: ServiceWorkerRegistration): Promise<string | null> {
  if (!messaging) {
    console.warn('⚠️ Firebase Messaging not available');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('⚠️ Notification permission denied');
      return null;
    }

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey || vapidKey === 'PLACEHOLDER_VAPID_KEY') {
      console.error('❌ VAPID key not configured or is a placeholder');
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.log('✅ FCM Token obtained:', token);
      return token;
    } else {
      console.warn('⚠️ No FCM token received');
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting FCM token:', error);
    return null;
  }
}

// Escuchar mensajes en primer plano
export function onForegroundMessage(callback: (payload: any) => void) {
  if (!messaging) return () => {};
  
  const unsubscribe = onMessage(messaging, (payload) => {
    console.log('📨 Foreground message received:', payload);
    callback(payload);
  });
  
  return unsubscribe;
}

export { app, messaging, auth };
export default app;
