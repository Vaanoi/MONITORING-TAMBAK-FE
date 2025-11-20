// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA8S5C_3uY0nvLH6bNVEoXHJeExK_04xMs",
  authDomain: "data-spk.firebaseapp.com",
  databaseURL: "https://data-spk-default-rtdb.firebaseio.com",
  projectId: "data-spk",
  storageBucket: "data-spk.firebasestorage.app",
  messagingSenderId: "747687364306",
  appId: "1:747687364306:web:9c5de259af92e6e1944f0b",
  measurementId: "G-PB8GNB65YY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);  