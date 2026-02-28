function verificarAccesoConfig() {
    const pass = document.getElementById('pass-config').value;
    if (pass === '1234') {
        document.getElementById('config-lock').style.display = 'none';
        document.getElementById('config-content').style.display = 'block';
    } else {
        alert('Contraseña incorrecta');
    }
}

function resetearBloqueoConfig() {
    document.getElementById('config-lock').style.display = 'block';
    document.getElementById('config-content').style.display = 'none';
}