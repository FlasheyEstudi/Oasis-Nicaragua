// OASIS - Firebase Authentication Services
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  type UserCredential
} from 'firebase/auth';
import { app, hasValidConfig } from '../firebase-config';

// Initialize Firebase Auth
export const auth = hasValidConfig && app ? getAuth(app) : null;

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

/**
 * Sign in with Google Popup
 */
export async function signInWithGoogle(): Promise<UserCredential | null> {
  if (!auth) {
    throw new Error('Firebase Auth no está configurado. Revisa las variables de entorno.');
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result;
  } catch (error: any) {
    console.error('❌ Error signing in with Google:', error);
    throw error;
  }
}

/**
 * Sign in with Email and Password
 */
export async function loginWithEmail(email: string, password: string): Promise<UserCredential | null> {
  if (!auth) {
    throw new Error('Firebase Auth no está configurado.');
  }
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result;
  } catch (error: any) {
    console.error('❌ Error logging in with email:', error);
    throw error;
  }
}

/**
 * Register a new user with Email and Password in Firebase
 */
export async function registerWithEmail(email: string, password: string): Promise<UserCredential | null> {
  if (!auth) {
    throw new Error('Firebase Auth no está configurado.');
  }
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result;
  } catch (error: any) {
    console.error('❌ Error creating user with email:', error);
    throw error;
  }
}

/**
 * Send a Password Reset Email
 */
export async function resetPassword(email: string): Promise<void> {
  if (!auth) {
    throw new Error('Firebase Auth no está configurado.');
  }
  try {
    await sendPasswordResetEmail(auth, email);
    console.log(`✅ Password reset email sent to: ${email}`);
  } catch (error: any) {
    console.error('❌ Error resetting password:', error);
    throw error;
  }
}

/**
 * Sign Out from Firebase
 */
export async function logOut(): Promise<void> {
  if (!auth) return;
  try {
    await signOut(auth);
    console.log('✅ Signed out of Firebase successfully');
  } catch (error: any) {
    console.error('❌ Error signing out:', error);
    throw error;
  }
}
