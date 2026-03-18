// ============================================================
//  inventario.js — Papelería Rio Grande
//  Conectado a api/productos.php (MySQL via PHP)
// ============================================================

const Inventario = (() => {

  // ── Estado ───────────────────────────────────────────────
  let productos  = [];
  let editandoId = null;

  // ── Utilidades ───────────────────────────────────────────
  const generarId = () => `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const fmt$       = (n) => `$${parseFloat(n).toFixed(2)}`;

  // ── Llamadas a la API ────────────────────────────────────
  async function apiFetch(url, options = {}) {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.msg || 'Error en el servidor');
    return data;
  }

  // ── Toast ────────────────────────────────────────────────
  const mostrarAlerta = (mensaje, tipo = 'success') => {
    document.querySelectorAll('.inv-toast').forEach(t => t.remove());
    const toast = document.createElement('div');
    toast.className = `inv-toast inv-toast--${tipo}`;
    const ico = tipo === 'success' ? 'check-circle' : tipo === 'warning' ? 'exclamation-triangle' : 'times-circle';
    toast.innerHTML = `<i class="fas fa-${ico}"></i> ${mensaje}`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('inv-toast--visible'));
    setTimeout(() => {
      toast.classList.remove('inv-toast--visible');
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  };

  // ── Estilos del toast ────────────────────────────────────
  const inyectarEstilos = () => {
    if (document.getElementById('inv-toast-styles')) return;
    const style = document.createElement('style');
    style.id = 'inv-toast-styles';
    style.textContent = `
      .inv-toast {
        position: fixed; bottom: 30px; right: 30px;
        padding: 14px 22px; border-radius: 10px; color: #fff;
        font-family: 'Poppins', sans-serif; font-size: 14px; font-weight: 500;
        display: flex; align-items: center; gap: 10px;
        box-shadow: 0 6px 24px rgba(0,0,0,0.2);
        opacity: 0; transform: translateY(20px);
        transition: opacity 0.35s ease, transform 0.35s ease; z-index: 9999;
      }
      .inv-toast--visible  { opacity: 1; transform: translateY(0); }
      .inv-toast--success  { background: #27ae60; }
      .inv-toast--warning  { background: #e67e22; }
      .inv-toast--error    { background: #e74c3c; }

      .badge-stock { display:inline-block; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:600; }
      .badge-ok      { background:#d4edda; color:#155724; }
      .badge-warning { background:#fff3cd; color:#856404; }
      .badge-danger  { background:#f8d7da; color:#721c24; }

      .btn-edit-prod, .btn-delete-prod {
        border:none; padding:6px 12px; border-radius:6px;
        cursor:pointer; font-size:13px; transition:opacity .2s;
      }
      .btn-edit-prod   { background:#3498db; color:#fff; margin-right:4px; }
      .btn-delete-prod { background:#e74c3c; color:#fff; }
      .btn-edit-prod:hover, .btn-delete-prod:hover { opacity:0.82; }

      #modal-editar { display:none; position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:1000; align-items:center; justify-content:center; }
      #modal-editar.open { display:flex; }
      .modal-box { background:#fff; border-radius:14px; padding:32px; width:480px; max-width:95vw; box-shadow:0 20px 60px rgba(0,0,0,.25); font-family:'Poppins',sans-serif; }
      .modal-box h3 { margin:0 0 20px; font-size:18px; color:#2c3e50; display:flex; align-items:center; gap:10px; }
      .modal-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
      .modal-grid .full { grid-column:1/-1; }
      .modal-grid label { display:block; font-size:12px; font-weight:600; color:#7f8c8d; margin-bottom:4px; text-transform:uppercase; letter-spacing:.5px; }
      .modal-grid input, .modal-grid select { width:100%; padding:9px 12px; border:1.5px solid #dce0e6; border-radius:8px; font-size:14px; font-family:'Poppins',sans-serif; outline:none; box-sizing:border-box; transition:border-color .2s; }
      .modal-grid input:focus, .modal-grid select:focus { border-color:#3498db; }
      .modal-actions { margin-top:22px; display:flex; gap:10px; justify-content:flex-end; }
      .btn-modal-cancel { padding:10px 20px; border:1.5px solid #bdc3c7; background:#fff; border-radius:8px; cursor:pointer; font-family:'Poppins',sans-serif; font-size:14px; color:#7f8c8d; }
      .btn-modal-cancel:hover { background:#f5f5f5; }
      .btn-modal-save { padding:10px 22px; background:#3498db; color:#fff; border:none; border-radius:8px; cursor:pointer; font-family:'Poppins',sans-serif; font-size:14px; font-weight:600; }
      .btn-modal-save:hover { background:#2980b9; }
    `;
    document.head.appendChild(style);
  };

  // ── Modal de edición ─────────────────────────────────────
  const crearModal = () => {
    if (document.getElementById('modal-editar')) return;
    const modal = document.createElement('div');
    modal.id = 'modal-editar';
    modal.innerHTML = `
      <div class="modal-box">
        <h3><i class="fas fa-edit" style="color:#3498db"></i> Editar Producto</h3>
        <div class="modal-grid">
          <div class="full"><label>Código</label><input type="text" id="edit-codigo"></div>
          <div class="full"><label>Nombre del Producto</label><input type="text" id="edit-nombre"></div>
          <div><label>Precio (MXN)</label><input type="number" id="edit-precio" step="0.01" min="0"></div>
          <div><label>Stock Actual</label><input type="number" id="edit-stock" min="0"></div>
          <div><label>Categoría</label>
            <select id="edit-categoria">
              <option value="Papelería">Papelería</option>
              <option value="Escritura">Escritura</option>
              <option value="Oficina">Oficina</option>
              <option value="Otros">Otros</option>
            </select>
          </div>
          <div><label>Stock Mínimo</label><input type="number" id="edit-minimo" min="0"></div>
        </div>
        <div class="modal-actions">
          <button class="btn-modal-cancel" id="btn-modal-cancel"><i class="fas fa-times"></i> Cancelar</button>
          <button class="btn-modal-save"   id="btn-modal-save"><i class="fas fa-save"></i> Guardar Cambios</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById('btn-modal-cancel').addEventListener('click', cerrarModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) cerrarModal(); });
    document.getElementById('btn-modal-save').addEventListener('click', guardarEdicion);
  };

  const abrirModal = (id) => {
    const p = productos.find(p => p.id === id);
    if (!p) return;
    editandoId = id;
    document.getElementById('edit-codigo').value    = p.codigo    || '';
    document.getElementById('edit-nombre').value    = p.nombre;
    document.getElementById('edit-precio').value    = p.precio;
    document.getElementById('edit-stock').value     = p.stock;
    document.getElementById('edit-categoria').value = p.categoria;
    document.getElementById('edit-minimo').value    = p.minimo;
    document.getElementById('modal-editar').classList.add('open');
  };

  const cerrarModal = () => {
    document.getElementById('modal-editar').classList.remove('open');
    editandoId = null;
  };

  const guardarEdicion = async () => {
    if (!editandoId) return;
    const nombre = document.getElementById('edit-nombre').value.trim();
    const precio = parseFloat(document.getElementById('edit-precio').value);
    const stock  = parseInt(document.getElementById('edit-stock').value);

    if (!nombre)                       { mostrarAlerta('El nombre no puede estar vacío.', 'warning'); return; }
    if (isNaN(precio) || precio < 0)   { mostrarAlerta('Precio inválido.', 'warning'); return; }
    if (isNaN(stock)  || stock < 0)    { mostrarAlerta('Stock inválido.', 'warning'); return; }

    const datos = {
      id:        editandoId,
      codigo:    document.getElementById('edit-codigo').value.trim(),
      nombre,
      precio,
      stock,
      categoria: document.getElementById('edit-categoria').value,
      minimo:    parseInt(document.getElementById('edit-minimo').value) || 0,
    };

    try {
      await apiFetch('api/productos.php', { method: 'PUT', body: JSON.stringify(datos) });
      await cargarProductos();
      cerrarModal();
      mostrarAlerta(`"${nombre}" actualizado correctamente.`);
      if (window.Dashboard) Dashboard.refresh();
    } catch (err) {
      mostrarAlerta(err.message, 'error');
    }
  };

  // ── Cargar productos desde la BD ─────────────────────────
  const cargarProductos = async () => {
    try {
      productos = await apiFetch('api/productos.php');
      renderTabla();
      actualizarDashboard();
    } catch (err) {
      mostrarAlerta('Error al cargar productos: ' + err.message, 'error');
    }
  };

  // ── Renderizar tabla ─────────────────────────────────────
  const getBadgeStock = (p) => {
    if (p.stock == 0)              return `<span class="badge-stock badge-danger">Sin stock</span>`;
    if (p.stock <= p.minimo)       return `<span class="badge-stock badge-warning">${p.stock} ⚠️</span>`;
    return                                `<span class="badge-stock badge-ok">${p.stock}</span>`;
  };

  const renderTabla = (lista = null) => {
    const tbody  = document.getElementById('tabla-productos-body');
    if (!tbody) return;
    const fuente = lista ?? getListaFiltrada();

    if (!fuente.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-msg">No hay productos que mostrar</td></tr>`;
      return;
    }

    tbody.innerHTML = fuente.map(p => `
      <tr>
        <td>${p.codigo || '—'}</td>
        <td>${p.nombre}</td>
        <td>${p.categoria}</td>
        <td>${fmt$(p.precio)}</td>
        <td>${getBadgeStock(p)}</td>
        <td>
          <button class="btn-edit-prod"   onclick="Inventario.editar('${p.id}')"><i class="fas fa-edit"></i> Editar</button>
          <button class="btn-delete-prod" onclick="Inventario.eliminar('${p.id}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`).join('');
  };

  // ── Filtros ──────────────────────────────────────────────
  const getListaFiltrada = () => {
    const query = (document.getElementById('inventario-search')?.value || '').toLowerCase().trim();
    const orden = document.getElementById('filter-order')?.value || 'asc';

    let lista = [...productos];
    if (query) lista = lista.filter(p =>
      p.nombre.toLowerCase().includes(query) || (p.codigo || '').toLowerCase().includes(query)
    );

    lista.sort((a, b) => {
      if (orden === 'asc')       return a.nombre.localeCompare(b.nombre);
      if (orden === 'desc')      return b.nombre.localeCompare(a.nombre);
      if (orden === 'stock-low') return a.stock - b.stock;
      return 0;
    });

    return lista;
  };

  // ── Actualizar tarjetas del dashboard ────────────────────
  const actualizarDashboard = () => {
    const cardProductos = document.querySelector('.dashboard-card.yellow .card-info p');
    if (cardProductos) cardProductos.textContent = productos.length;

    const stockBajo = productos.filter(p => p.stock <= p.minimo && p.stock > 0).length
                    + productos.filter(p => p.stock == 0).length;
    const cardRed = document.querySelector('.dashboard-card.red .card-info p');
    if (cardRed) cardRed.textContent = stockBajo;
  };

  // ── Agregar producto ─────────────────────────────────────
  const agregarProducto = async (e) => {
    e.preventDefault();

    const codigo    = document.getElementById('prod-codigo').value.trim();
    const nombre    = document.getElementById('prod-nombre').value.trim();
    const precio    = parseFloat(document.getElementById('prod-precio').value);
    const stock     = parseInt(document.getElementById('prod-stock').value);
    const categoria = document.getElementById('prod-categoria').value;
    const minimo    = parseInt(document.getElementById('prod-minimo').value) || 5;

    if (!nombre)                     { mostrarAlerta('El nombre es obligatorio.', 'warning'); return; }
    if (isNaN(precio) || precio < 0) { mostrarAlerta('Ingresa un precio válido.', 'warning'); return; }
    if (isNaN(stock)  || stock < 0)  { mostrarAlerta('Ingresa una cantidad válida.', 'warning'); return; }

    const nuevo = {
      id: generarId(),
      codigo, nombre, precio, stock, categoria, minimo,
    };

    try {
      await apiFetch('api/productos.php', { method: 'POST', body: JSON.stringify(nuevo) });
      await cargarProductos();
      mostrarAlerta(`"${nombre}" agregado al inventario.`);
      if (window.Dashboard) Dashboard.refresh();

      // Limpiar formulario
      document.getElementById('prod-codigo').value    = '';
      document.getElementById('prod-nombre').value    = '';
      document.getElementById('prod-precio').value    = '';
      document.getElementById('prod-stock').value     = '';
      document.getElementById('prod-minimo').value    = '5';
      document.getElementById('prod-categoria').value = 'Papelería';

    } catch (err) {
      mostrarAlerta(err.message, 'error');
    }
  };

  // ── Eliminar producto ────────────────────────────────────
  const eliminarProducto = async (id) => {
    const p = productos.find(p => p.id === id);
    if (!p) return;
    if (!confirm(`¿Eliminar "${p.nombre}" del inventario?`)) return;

    try {
      await apiFetch(`api/productos.php?id=${id}`, { method: 'DELETE' });
      await cargarProductos();
      mostrarAlerta(`"${p.nombre}" eliminado.`, 'warning');
      if (window.Dashboard) Dashboard.refresh();
    } catch (err) {
      mostrarAlerta(err.message, 'error');
    }
  };

  // ── Backup (descarga JSON) ───────────────────────────────
  const generarBackup = () => {
    const blob = new Blob([JSON.stringify({ version:'1.0', exportadoEn: new Date().toISOString(), productos }, null, 2)], { type:'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: `backup_${new Date().toISOString().slice(0,10)}.json` });
    a.click();
    URL.revokeObjectURL(url);
    mostrarAlerta('Respaldo generado y descargado.');
  };

  // ── Init ─────────────────────────────────────────────────
  const init = async () => {
    inyectarEstilos();
    crearModal();
    await cargarProductos();

    const form = document.querySelector('#inventario .grid-form');
    if (form) form.addEventListener('submit', agregarProducto);

    ['inventario-search','filter-order','filter-date-start','filter-date-end'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', renderTabla);
    });

    document.getElementById('btn-backup')?.addEventListener('click', generarBackup);
  };

  return {
    init,
    editar:       abrirModal,
    eliminar:     eliminarProducto,
    getProductos: () => [...productos],
    recargar:     cargarProductos,
  };

})();

document.addEventListener('DOMContentLoaded', () => Inventario.init());
window.Inventario = Inventario;