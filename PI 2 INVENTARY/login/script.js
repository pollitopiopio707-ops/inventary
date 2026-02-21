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



//inventario//
