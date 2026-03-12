// ============================================================
//  navegacion.js — Papelería Rio Grande
//  Maneja el cambio de secciones del menú lateral.
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  const menuItems  = document.querySelectorAll('.menu-item');
  const secciones  = document.querySelectorAll('.content-section');
  const tituloHeader = document.getElementById('section-title');

  const titulos = {
    inicio:        'INICIO',
    inventario:    'INVENTARIO',
    ventas:        'VENTAS',
    scanner:       'ESCÁNER',
    reportes:      'REPORTES',
    configuracion: 'CONFIGURACIÓN',
  };

  const irA = (seccionId) => {
    // 1. Ocultar TODAS las secciones
    secciones.forEach(sec => sec.classList.remove('active'));

    // 2. Mostrar solo la seleccionada
    const target = document.getElementById(seccionId);
    if (target) target.classList.add('active');

    // 3. Actualizar menú lateral
    menuItems.forEach(item => item.classList.remove('active'));
    const menuActivo = document.querySelector(`.menu-item[data-section="${seccionId}"]`);
    if (menuActivo) menuActivo.classList.add('active');

    // 4. Actualizar título del header
    if (tituloHeader) tituloHeader.textContent = titulos[seccionId] || seccionId.toUpperCase();
  };

  // Escuchar clics en el menú
  menuItems.forEach(item => {
    item.addEventListener('click', () => irA(item.dataset.section));
  });

  // Mostrar inicio al cargar
  irA('inicio');

});