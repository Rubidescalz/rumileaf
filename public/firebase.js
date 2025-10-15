// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB63rQuxoujjqDNyMa6UNd2vOmJJSaxw3E",
  authDomain: "rumileaf-192ed.firebaseapp.com",
  projectId: "rumileaf-192ed",
  storageBucket: "rumileaf-192ed.appspot.com",
  messagingSenderId: "306308145269",
  appId: "1:306308145269:web:874e92e2816c59e816d83c",
  measurementId: "G-19N9B0SJKN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

export { db };