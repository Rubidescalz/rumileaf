import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB63rQuxoujjqDNyMa6UNd2vOmJJSaxw3E",
  authDomain: "rumileaf-192ed.firebaseapp.com",
  projectId: "rumileaf-192ed",
  storageBucket: "rumileaf-192ed.appspot.com",
  messagingSenderId: "306308145269",
  appId: "1:306308145269:web:874e92e2816c59e816d83c",
  measurementId: "G-19N9B0SJKN"
};


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);


export { db, auth };
export default app;