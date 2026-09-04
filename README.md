
App shopping.

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDPjLtsX2t8tMD10e4DZwQJTCLXclk1Nf4",
  authDomain: "atelierproforma.firebaseapp.com",
  projectId: "atelierproforma",
  storageBucket: "atelierproforma.firebasestorage.app",
  messagingSenderId: "79985303556",
  appId: "1:79985303556:web:3e52013ac6c05afb979551",
  measurementId: "G-W19PL5XVHX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

npm install -g firebase-tools