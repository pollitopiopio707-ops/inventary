/**
 * auth.js
 * Incluir en index.html ANTES que cualquier otro script.
 * - Verifica que haya sesión activa en el servidor.
 * - Si no hay sesión, redirige a login.html automáticamente.
 * - Muestra el nombre del admin en el header.
 * - Maneja el botón de cerrar sesión.
 */

(async function () {

    /* ── Verificar sesión al cargar ────────────────── */
    try {
        const res  = await fetch('api/login.php', { method: 'GET' });
        const data = await res.json();

        if (!data.ok) {
            // Sin sesión → ir al login
            window.location.replace('login.html');
            return;
        }

        // Mostrar nombre en el header
        const spanAdmin = document.getElementById('admin-nombre');
        if (spanAdmin) spanAdmin.textContent = data.nombre;

    } catch (e) {
        // Si no responde el servidor, igual manda al login
        window.location.replace('login.html');
    }

    /* ── Cerrar sesión ─────────────────────────────── */
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            if (!confirm('¿Cerrar sesión?')) return;
            await fetch('api/login.php', { method: 'DELETE' });
            window.location.replace('login.html');
        });
    }

})();