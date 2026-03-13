// ============================================================
//  ventas.js — Papelería Rio Grande
//  POS: carrito, búsqueda, cálculo de cambio, finalizar venta.
//  Guarda historial en localStorage para reportes.js
// ============================================================

const Ventas = (() => {

  const STORAGE_KEY_VENTAS = 'papeleria_ventas';
  const STORAGE_KEY_PRODS  = 'papeleria_productos';

  // ── Estado del carrito ────────────────────────────────────
  let carrito = [];   // [{ id, codigo, nombre, precio, cantidad }]

  // ── Utilidades ────────────────────────────────────────────
  const fmt$ = (n) => `$${parseFloat(n || 0).toFixed(2)}`;

  const generarFolio = () => {
    const now = new Date();
    const pad  = (n) => String(n).padStart(2, '0');
    return `VTA-${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${Date.now().toString().slice(-5)}`;
  };

  const leerProductos = () => {
    if (window.Inventario) return window.Inventario.getProductos();
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_PRODS) || '[]'); }
    catch { return []; }
  };

  const guardarProductos = (lista) => {
    localStorage.setItem(STORAGE_KEY_PRODS, JSON.stringify(lista));
  };

  const leerVentas = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_VENTAS) || '[]'); }
    catch { return []; }
  };

  // ── Toast ─────────────────────────────────────────────────
  const inyectarEstilosToast = () => {
    if (document.getElementById('vta-toast-styles')) return;
    const s = document.createElement('style');
    s.id = 'vta-toast-styles';
    s.textContent = `
      .vta-toast{position:fixed;bottom:30px;right:30px;padding:14px 22px;border-radius:10px;
        color:#fff;font-family:'Poppins',sans-serif;font-size:14px;font-weight:500;
        display:flex;align-items:center;gap:10px;box-shadow:0 6px 24px rgba(0,0,0,.2);
        opacity:0;transform:translateY(20px);transition:opacity .35s,transform .35s;z-index:9999}
      .vta-toast.show{opacity:1;transform:translateY(0)}
      .vta-toast.success{background:#27ae60}
      .vta-toast.warning{background:#e67e22}
      .vta-toast.error  {background:#e74c3c}

      /* Modal ticket */
      #modal-ticket{display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);
        z-index:1000;align-items:center;justify-content:center}
      #modal-ticket.open{display:flex}
      .ticket-box{background:#fff;border-radius:16px;padding:36px;width:400px;max-width:95vw;
        box-shadow:0 20px 60px rgba(0,0,0,.25);font-family:'Poppins',sans-serif;text-align:center}
      .ticket-box h3{font-size:18px;color:#27ae60;margin-bottom:4px}
      .ticket-box .folio{font-size:12px;color:#7f8c8d;margin-bottom:20px}
      .ticket-items{text-align:left;font-size:13px;border-top:1px dashed #ccc;
        border-bottom:1px dashed #e10d0d;padding:12px 0;margin:12px 0}
      .ticket-item{display:flex;justify-content:space-between;padding:3px 0}
      .ticket-total{font-size:18px;font-weight:700;color:#2c3e50;margin:8px 0 4px}
      .ticket-cambio{font-size:13px;color:#7f8c8d;margin-bottom:20px}
      .btn-ticket-close{padding:10px 28px;background:#3498db;color:#fff;border:none;
        border-radius:8px;cursor:pointer;font-family:'Poppins',sans-serif;font-size:14px;
        font-weight:600;transition:background .2s}
      .btn-ticket-close:hover{background:#2980b9}
      .btn-ticket-print{padding:10px 18px;background:#ecf0f1;color:#2c3e50;border:none;
        border-radius:8px;cursor:pointer;font-family:'Poppins',sans-serif;font-size:14px;
        margin-right:8px;transition:background .2s}
      .btn-ticket-print:hover{background:#dfe6e9}

      /* Sugerencias */
      .suggestions-container{position:absolute;top:100%;left:0;right:48px;background:#fff;
        border:1px solid #dce0e6;border-top:none;border-radius:0 0 10px 10px;
        box-shadow:0 8px 20px rgba(0,0,0,.1);z-index:500;max-height:220px;overflow-y:auto}
      .suggestion-item{padding:10px 14px;cursor:pointer;font-size:14px;
        font-family:'Poppins',sans-serif;display:flex;justify-content:space-between;
        border-bottom:1px solid #f0f0f0;transition:background .15s}
      .suggestion-item:hover{background:#eaf3fb}
      .suggestion-item .sug-precio{color:#3498db;font-weight:600;font-size:13px}
      .suggestion-item .sug-stock{font-size:11px;color:#7f8c8d}

      /* Fila del carrito */
      #cart-body tr td{vertical-align:middle}
      .qty-input{width:60px;padding:5px 8px;border:1.5px solid #dce0e6;border-radius:6px;
        font-family:'Poppins',sans-serif;font-size:13px;text-align:center}
      .btn-remove-item{border:none;background:#e74c3c;color:#fff;padding:5px 10px;
        border-radius:6px;cursor:pointer;font-size:13px;transition:opacity .2s}
      .btn-remove-item:hover{opacity:.8}
    `;
    document.head.appendChild(s);
  };

  const toast = (msg, tipo = 'success') => {
    document.querySelectorAll('.vta-toast').forEach(t => t.remove());
    const t = document.createElement('div');
    t.className = `vta-toast ${tipo}`;
    const ico = { success:'check-circle', warning:'exclamation-triangle', error:'times-circle' }[tipo];
    t.innerHTML = `<i class="fas fa-${ico}"></i> ${msg}`;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3000);
  };

  // ── Modal ticket ──────────────────────────────────────────
  const crearModalTicket = () => {
    if (document.getElementById('modal-ticket')) return;
    const m = document.createElement('div');
    m.id = 'modal-ticket';
    m.innerHTML = `
      <div class="ticket-box">
        <h3><i class="fas fa-check-circle"></i> ¡Venta Completada!</h3>
        <div class="folio" id="tk-folio"></div>
        <div class="ticket-items" id="tk-items"></div>
        <div class="ticket-total" id="tk-total"></div>
        <div class="ticket-cambio" id="tk-cambio"></div>
        <div>
          <button class="btn-ticket-print" id="btn-tk-print"><i class="fas fa-print"></i> Imprimir</button>
          <button class="btn-ticket-close" id="btn-tk-close">Aceptar</button>
        </div>
      </div>`;
    document.body.appendChild(m);
    document.getElementById('btn-tk-close').addEventListener('click', () => m.classList.remove('open'));
    document.getElementById('btn-tk-print').addEventListener('click', imprimirTicket);
    m.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('open'); });
  };

  let ultimaVenta = null;

  const mostrarTicket = (venta) => {
    ultimaVenta = venta;
    document.getElementById('tk-folio').textContent = `Folio: ${venta.folio} — ${new Date(venta.fecha).toLocaleString('es-MX')}`;
    document.getElementById('tk-items').innerHTML = venta.items.map(i =>
      `<div class="ticket-item"><span>${i.nombre} x${i.cantidad}</span><span>${fmt$(i.precio * i.cantidad)}</span></div>`
    ).join('');
    document.getElementById('tk-total').textContent   = `TOTAL: ${fmt$(venta.total)}`;
    document.getElementById('tk-cambio').textContent  = `Pagó: ${fmt$(venta.pagoCon)} — Cambio: ${fmt$(venta.cambio)}`;
    document.getElementById('modal-ticket').classList.add('open');
  };

  const imprimirTicket = () => {
    if (!ultimaVenta) return;
    const v = ultimaVenta;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Ticket ${v.folio}</title>
    <style>
      body{font-family:'Courier New',monospace;font-size:12px;width:280px;margin:0 auto;padding:10px}
      h2{text-align:center;font-size:14px;margin:0 0 4px}
      .sub{text-align:center;font-size:11px;color:#555;margin-bottom:10px}
      .sep{border:none;border-top:1px dashed #000;margin:8px 0}
      .row{display:flex;justify-content:space-between}
      .total{font-size:15px;font-weight:bold}
      .footer{text-align:center;margin-top:10px;font-size:10px;color:#777}
    </style></head><body>
    <h2>PAPELERÍA RIO GRANDE</h2>
    <div class="sub">Folio: ${v.folio}<br>${new Date(v.fecha).toLocaleString('es-MX')}</div>
    <hr class="sep">
    ${v.items.map(i=>`<div class="row"><span>${i.nombre} x${i.cantidad}</span><span>${fmt$(i.precio*i.cantidad)}</span></div>`).join('')}
    <hr class="sep">
    <div class="row total"><span>TOTAL</span><span>${fmt$(v.total)}</span></div>
    <div class="row"><span>Pagó</span><span>${fmt$(v.pagoCon)}</span></div>
    <div class="row"><span>Cambio</span><span>${fmt$(v.cambio)}</span></div>
    <hr class="sep">
    <div class="footer">¡Gracias por su compra!</div>
    <script>window.onload=()=>{window.print();window.close()}<\/script>
    </body></html>`;
    const w = window.open('','_blank','width=320,height=500');
    if (w) { w.document.write(html); w.document.close(); }
  };

  // ── Carrito: render ───────────────────────────────────────
  const renderCarrito = () => {
    const tbody = document.getElementById('cart-body');
    if (!tbody) return;

    if (!carrito.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-msg">El carrito está vacío</td></tr>`;
      actualizarTotales();
      return;
    }

    tbody.innerHTML = carrito.map(item => `
      <tr data-id="${item.id}">
        <td>${item.codigo || '—'}</td>
        <td>${item.nombre}</td>
        <td>${fmt$(item.precio)}</td>
        <td><input class="qty-input" type="number" min="1" value="${item.cantidad}"
             onchange="Ventas._cambiarCantidad('${item.id}', this.value)"></td>
        <td>${fmt$(item.precio * item.cantidad)}</td>
        <td><button class="btn-remove-item" onclick="Ventas._quitarItem('${item.id}')">
          <i class="fas fa-trash"></i></button></td>
      </tr>`).join('');

    actualizarTotales();
  };

  const actualizarTotales = () => {
    const subtotal = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
    const total    = subtotal;

    const elSub   = document.getElementById('subtotal');
    const elTotal = document.getElementById('grand-total');
    if (elSub)   elSub.textContent   = fmt$(subtotal);
    if (elTotal) elTotal.textContent = fmt$(total);

    // Cambio
    calcularCambio();
  };

  const calcularCambio = () => {
    const total  = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
    const pago   = parseFloat(document.getElementById('payment-amount')?.value || 0);
    const cambio = pago - total;
    const el     = document.getElementById('change-result');
    if (el) {
      el.textContent = fmt$(cambio > 0 ? cambio : 0);
      el.style.color = cambio < 0 && pago > 0 ? '#e74c3c' : '#50c446';
    }
  };

  // ── Agregar producto al carrito ───────────────────────────
  const agregarAlCarrito = (producto) => {
    if (producto.stock <= 0) {
      toast(`"${producto.nombre}" sin stock disponible.`, 'warning');
      return;
    }
    const existe = carrito.find(i => i.id === producto.id);
    if (existe) {
      if (existe.cantidad >= producto.stock) {
        toast(`Stock máximo disponible: ${producto.stock}`, 'warning');
        return;
      }
      existe.cantidad++;
    } else {
      carrito.push({ ...producto, cantidad: 1 });
    }
    renderCarrito();
    toast(`"${producto.nombre}" agregado al carrito.`);
  };

  // ── Cambiar cantidad ──────────────────────────────────────
  const cambiarCantidad = (id, valor) => {
    const item = carrito.find(i => i.id === id);
    if (!item) return;
    const productos = leerProductos();
    const prod = productos.find(p => p.id === id);
    const maxStock = prod ? prod.stock : Infinity;

    const qty = parseInt(valor);
    if (isNaN(qty) || qty < 1) { item.cantidad = 1; }
    else if (qty > maxStock)   { item.cantidad = maxStock; toast(`Stock máximo: ${maxStock}`, 'warning'); }
    else                       { item.cantidad = qty; }

    renderCarrito();
  };

  // ── Quitar ítem ───────────────────────────────────────────
  const quitarItem = (id) => {
    carrito = carrito.filter(i => i.id !== id);
    renderCarrito();
  };

  // ── Búsqueda / sugerencias ────────────────────────────────
  let debounceTimer = null;

  const buscar = (query) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const lista   = document.getElementById('suggestions-list');
      if (!lista) return;
      const q = query.trim().toLowerCase();

      if (!q) { lista.innerHTML = ''; return; }

      const productos = leerProductos();
      const encontrados = productos.filter(p =>
        p.nombre.toLowerCase().includes(q) || (p.codigo || '').toLowerCase().includes(q)
      ).slice(0, 8);

      if (!encontrados.length) {
        lista.innerHTML = `<div class="suggestion-item" style="color:#999;cursor:default">Sin resultados para "${q}"</div>`;
        return;
      }

      lista.innerHTML = encontrados.map(p => `
        <div class="suggestion-item" onclick="Ventas._seleccionar('${p.id}')">
          <div>
            <span>${p.nombre}</span>
            <span class="sug-stock"> — Stock: ${p.stock}</span>
          </div>
          <span class="sug-precio">${fmt$(p.precio)}</span>
        </div>`).join('');
    }, 200);
  };

  const seleccionarProducto = (id) => {
    const productos = leerProductos();
    const prod = productos.find(p => p.id === id);
    if (prod) agregarAlCarrito(prod);
    const input = document.getElementById('sales-input');
    const lista = document.getElementById('suggestions-list');
    if (input) input.value = '';
    if (lista) lista.innerHTML = '';
  };

  // ── Finalizar venta ───────────────────────────────────────
  const finalizarVenta = () => {
    if (!carrito.length) {
      toast('El carrito está vacío.', 'warning');
      return;
    }

    const total  = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
    const pago   = parseFloat(document.getElementById('payment-amount')?.value || 0);

    if (pago < total) {
      toast('El pago es insuficiente.', 'error');
      return;
    }

    // Descontar stock
    const productos = leerProductos();
    let stockError  = false;

    carrito.forEach(item => {
      const prod = productos.find(p => p.id === item.id);
      if (!prod) return;
      if (prod.stock < item.cantidad) {
        toast(`Stock insuficiente para "${item.nombre}".`, 'error');
        stockError = true;
        return;
      }
      prod.stock -= item.cantidad;
    });

    if (stockError) return;

    guardarProductos(productos);

    // Actualizar Inventario si está cargado
    if (window.Inventario && window.Inventario.init) {
      // Re-render de tabla de inventario
      try { window.Inventario.init(); } catch {}
    }

    // Guardar venta en historial
    const venta = {
      id:        `vta_${Date.now()}`,
      folio:     generarFolio(),
      fecha:     new Date().toISOString(),
      items:     carrito.map(i => ({ ...i })),
      subtotal:  total,
      total,
      pagoCon:   pago,
      cambio:    pago - total,
      metodoPago: 'Efectivo',
    };

    const historial = leerVentas();
    historial.push(venta);
    localStorage.setItem(STORAGE_KEY_VENTAS, JSON.stringify(historial));

    // Mostrar ticket
    mostrarTicket(venta);

    // Limpiar carrito
    carrito = [];
    renderCarrito();
    const payInput = document.getElementById('payment-amount');
    if (payInput) payInput.value = '';
  };

  // ── Cancelar venta ────────────────────────────────────────
  const cancelarVenta = () => {
    if (!carrito.length) return;
    if (!confirm('¿Cancelar la venta actual y vaciar el carrito?')) return;
    carrito = [];
    renderCarrito();
    const payInput = document.getElementById('payment-amount');
    if (payInput) payInput.value = '';
    toast('Venta cancelada.', 'warning');
  };

  // ── Init ──────────────────────────────────────────────────
  const init = () => {
    inyectarEstilosToast();
    crearModalTicket();
    renderCarrito();

    // Input de búsqueda
    const input = document.getElementById('sales-input');
    if (input) {
      input.addEventListener('input', (e) => buscar(e.target.value));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const lista    = document.getElementById('suggestions-list');
          const primero  = lista?.querySelector('.suggestion-item');
          if (primero) primero.click();
        }
      });
      // Cerrar sugerencias al hacer clic fuera
      document.addEventListener('click', (e) => {
        if (!input.contains(e.target)) {
          const lista = document.getElementById('suggestions-list');
          if (lista) lista.innerHTML = '';
        }
      });
    }

    // Botón buscar manual
    document.getElementById('btn-search')?.addEventListener('click', () => {
      const val = document.getElementById('sales-input')?.value;
      if (val) buscar(val);
    });

    // Cambio
    document.getElementById('payment-amount')?.addEventListener('input', calcularCambio);

    // Finalizar / Cancelar
    document.getElementById('btn-finish')?.addEventListener('click', finalizarVenta);
    document.getElementById('btn-clear')?.addEventListener('click', cancelarVenta);
  };

  return {
    init,
    // Expuestos para llamadas inline desde la tabla
    _cambiarCantidad: cambiarCantidad,
    _quitarItem:      quitarItem,
    _seleccionar:     seleccionarProducto,
    getHistorial:     leerVentas,
  };

})();

document.addEventListener('DOMContentLoaded', () => Ventas.init());
window.Ventas = Ventas;