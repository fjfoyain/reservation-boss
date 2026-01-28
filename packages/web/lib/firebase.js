// lib/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
 apiKey: "AIzaSyAOtimxcqHsv2w5VDATscyYYwHpXM4JDTs",
  authDomain: "parking-lot-43898.firebaseapp.com",
  projectId: "parking-lot-43898",
  storageBucket: "parking-lot-43898.firebasestorage.app",
  messagingSenderId: "47254584011",
  appId: "1:47254584011:web:e23397dd3cbdba4ef2794e",
  measurementId: "G-3BJ8FQ3RNC"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);