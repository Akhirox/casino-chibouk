// ⚠️ Colle ici le bloc "firebaseConfig" de ta console Firebase
// (Paramètres du projet → Vos applications → Application Web → Configuration du SDK).
// Ces valeurs ne sont PAS secrètes : la sécurité est assurée par les règles Firestore (firestore.rules).
//
// Tant que apiKey vaut "REMPLACER", le site tourne en MODE DÉMO LOCAL :
// les comptes et soldes sont stockés uniquement dans le navigateur (pratique pour tester).

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA09d-K-H_FPCnMDpuQsy47iLbjkK3ooAE",
  authDomain: "casino-chibouk.firebaseapp.com",
  projectId: "casino-chibouk",
  storageBucket: "casino-chibouk.firebasestorage.app",
  messagingSenderId: "627745603590",
  appId: "1:627745603590:web:86272375d8f8ee89828387"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const firebaseConfig = {
  apiKey: "REMPLACER",
  authDomain: "REMPLACER.firebaseapp.com",
  projectId: "REMPLACER",
  storageBucket: "REMPLACER.appspot.com",
  messagingSenderId: "REMPLACER",
  appId: "REMPLACER",
};
