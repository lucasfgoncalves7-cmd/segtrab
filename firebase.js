// Firebase SDK hospedado em CDN oficial. Acesso à internet necessário.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';
import { firebaseConfig, configured } from './firebase-config.js';
export { configured };
export const firebaseApp = configured ? initializeApp(firebaseConfig) : null;
export const auth = configured ? getAuth(firebaseApp) : null;
export const db = configured ? getFirestore(firebaseApp) : null;
