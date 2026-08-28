import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase project used as the shared database for showcases + uploaded items,
// so client links work from any device/browser, not just the admin's own.
const firebaseConfig = {
  apiKey: 'AIzaSyCwspixtYLx91RPpzPKQyKBAp9ND1X3Si8',
  authDomain: 'portfolio-3a8b6.firebaseapp.com',
  projectId: 'portfolio-3a8b6',
  storageBucket: 'portfolio-3a8b6.firebasestorage.app',
  messagingSenderId: '14307533057',
  appId: '1:14307533057:web:cdbc38bd788c6e7e00fb00',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
