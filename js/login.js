// Seleccionamos el contenedor principal y los botones
const container = document.querySelector('.container');
const btnSignIn = document.getElementById('btn-sign-in');
const btnSignUp = document.getElementById('btn-sign-up');

// Al hacer clic en el botón de "Registrarse" (dentro de la parte verde)
btnSignUp.addEventListener('click', () => {
    container.classList.add('toggle');
});

// Al hacer clic en el botón de "Iniciar Sesión" (dentro de la parte verde)
btnSignIn.addEventListener('click', () => {
    container.classList.remove('toggle');
});



// Dentro de tu función de login, después de validar usuario/contraseña:
function manejarLogin() {
    // ... tu lógica de validación ...
    
    // Si es correcto:
    const usuario = {
        nombre: "Cajero Reynosa",
        rol: "Administrador",
        loginTime: new Date().getTime()
    };

    // Guardamos la sesión (se queda grabada en el navegador)
    localStorage.setItem('sesionActiva', JSON.stringify(usuario));

    // Redirigimos al Index
    window.location.href = "index.html"; 
}
