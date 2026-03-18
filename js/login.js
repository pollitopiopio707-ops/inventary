// ============================================================
//  login.js — Papelería Rio Grande
//  Mantiene la animación original + conecta con api/login.php
//  y api/registro.php
// ============================================================

/* ── Animación original (sin cambios) ──────────────── */
const container = document.querySelector('.container');
const btnSignIn = document.getElementById('btn-sign-in');
const btnSignUp = document.getElementById('btn-sign-up');

btnSignUp.addEventListener('click', () => container.classList.add('toggle'));
btnSignIn.addEventListener('click', () => container.classList.remove('toggle'));

/* ── Helpers para mensajes ─────────────────────────── */
function mostrarError(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.classList.add('visible');
}

function mostrarExito(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.classList.add('visible');
}

function limpiarMensajes(...ids) {
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('visible');
    });
}

/* ── Verificar si ya hay sesión activa ─────────────── */
(async function verificarSesion() {
    try {
        const res  = await fetch('api/login.php', { method: 'GET' });
        const data = await res.json();
        if (data.ok) {
            // Ya está logueado → ir directo al sistema
            window.location.replace('index.html');
        }
    } catch (e) {
        // Sin conexión al servidor — continúa en el login
    }
})();

/* ══════════════════════════════════════════════════════
   LOGIN
   ══════════════════════════════════════════════════════ */
document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    limpiarMensajes('error-login');

    const usuario  = document.getElementById('login-usuario').value.trim();
    const password = document.getElementById('login-password').value;
    const btn      = document.getElementById('btn-login');

    if (!usuario || !password) {
        mostrarError('error-login', 'Completa todos los campos.');
        return;
    }

    // Estado de carga
    btn.disabled     = true;
    btn.textContent  = 'Verificando...';

    try {
        const res  = await fetch('api/login.php', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ usuario, password }),
        });
        const data = await res.json();

        if (data.ok) {
            // Guardar nombre para mostrarlo en el header del sistema
            sessionStorage.setItem('admin_nombre', data.nombre);
            sessionStorage.setItem('admin_usuario', data.usuario);

            // Redirigir al sistema
            window.location.href = 'index.html';
        } else {
            mostrarError('error-login', data.msg || 'Usuario o contraseña incorrectos.');
        }

    } catch (err) {
        mostrarError('error-login', 'No se pudo conectar con el servidor.');
    } finally {
        btn.disabled    = false;
        btn.textContent = 'Iniciar sesión';
    }
});

/* ══════════════════════════════════════════════════════
   REGISTRO
   ══════════════════════════════════════════════════════ */
document.getElementById('form-registro').addEventListener('submit', async (e) => {
    e.preventDefault();
    limpiarMensajes('error-registro', 'success-registro');

    const nombre   = document.getElementById('reg-nombre').value.trim();
    const usuario  = document.getElementById('reg-usuario').value.trim();
    const password = document.getElementById('reg-password').value;
    const btn      = document.getElementById('btn-registro');

    if (!nombre || !usuario || !password) {
        mostrarError('error-registro', 'Completa todos los campos.');
        return;
    }

    if (password.length < 6) {
        mostrarError('error-registro', 'La contraseña debe tener al menos 6 caracteres.');
        return;
    }

    btn.disabled    = true;
    btn.textContent = 'Registrando...';

    try {
        const res  = await fetch('api/registro.php', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ nombre, usuario, password }),
        });
        const data = await res.json();

        if (data.ok) {
            mostrarExito('success-registro', '¡Cuenta creada! Ahora inicia sesión.');

            // Limpiar campos
            document.getElementById('reg-nombre').value   = '';
            document.getElementById('reg-usuario').value  = '';
            document.getElementById('reg-password').value = '';

            // Volver al login automáticamente después de 2 segundos
            setTimeout(() => container.classList.remove('toggle'), 2000);
        } else {
            mostrarError('error-registro', data.msg || 'No se pudo registrar.');
        }

    } catch (err) {
        mostrarError('error-registro', 'No se pudo conectar con el servidor.');
    } finally {
        btn.disabled    = false;
        btn.textContent = 'Registrarse';
    }
});