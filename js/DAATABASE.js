
// Importa las funciones necesarias
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";

// PEGUE AQUÍ SU CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "ID",
  appId: "APP_ID"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Escuchar el envío del Login
const loginForm = document.getElementById('login-form');

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email-input').value;
    const password = document.getElementById('password-input').value;

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // LOGIN EXITOSO
            alert("¡Bienvenido!");
            window.location.href = "ventas.html"; // Redirige a tu app de ventas
        })
        .catch((error) => {
            alert("Error: Correo o contraseña incorrectos.");
            console.error(error.message);
        });
});