// ============================================================
//  scanner.js — Papelería Rio Grande
//  Escaneo de códigos de barras via cámara (ZXing).
//  - Producto nuevo   → formulario completo para registrar
//  - Producto existe  → solo pide cantidad a sumar al stock
// ============================================================

const Scanner = (() => {

  const STORAGE_KEY = 'papeleria_productos';

  let codeReader   = null;
  let escaneando   = false;
  let ultimoCodigo = null;

  // ── Datos ─────────────────────────────────────────────────
  const leerProductos = () => {
    if (window.Inventario) return window.Inventario.getProductos();
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  };

  const guardarProductos = (lista) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
    if (window.Inventario) { try { window.Inventario.init(); } catch {} }
  };

  // ── Estilos ───────────────────────────────────────────────
  const inyectarEstilos = () => {
    if (document.getElementById('scanner-styles')) return;
    const s = document.createElement('style');
    s.id = 'scanner-styles';
    s.textContent = `
      .scanner-wrap {
        display:flex; flex-direction:column; align-items:center; gap:22px; padding:10px 0;
      }
      /* Solo escritorio: ocultar cámara y mostrar aviso */
      .scanner-desktop-warning {
        display:none; background:#fff3cd; border:1px solid #ffc107;
        border-radius:12px; padding:18px 24px; font-family:'Poppins',sans-serif;
        font-size:14px; color:#856404; text-align:center; width:100%; max-width:500px;
      }
      @media(min-width:769px){
        .scanner-desktop-warning { display:block; }
        .scanner-camera-section  { display:none !important; }
        #scanner-form-card       { display:none !important; }
        #scanner-add-stock-card  { display:none !important; }
      }
      /* Cámara */
      .scanner-camera-section {
        width:100%; max-width:460px;
        display:flex; flex-direction:column; align-items:center; gap:14px;
      }
      .scanner-viewfinder {
        position:relative; width:100%; border-radius:16px;
        overflow:hidden; background:#000; box-shadow:0 8px 32px rgba(0,0,0,.3);
      }
      .scanner-viewfinder video { width:100%; display:block; border-radius:16px; }
      .scanner-overlay {
        position:absolute; inset:0; display:flex;
        align-items:center; justify-content:center; pointer-events:none;
      }
      .scanner-reticle {
        width:230px; height:115px; border:3px solid #3498db; border-radius:10px;
        box-shadow:0 0 0 4000px rgba(0,0,0,.45); position:relative;
        animation:sc-pulse 2s ease-in-out infinite;
      }
      .scanner-reticle::before {
        content:''; position:absolute; left:0; right:0; height:2px;
        background:rgba(52,152,219,.75); top:50%; transform:translateY(-50%);
        animation:sc-line 2s ease-in-out infinite;
      }
      @keyframes sc-pulse { 0%,100%{border-color:#3498db} 50%{border-color:#27ae60} }
      @keyframes sc-line  { 0%{top:10%} 50%{top:90%} 100%{top:10%} }

      .scanner-status {
        font-family:'Poppins',sans-serif; font-size:13px;
        color:#7f8c8d; text-align:center; min-height:20px;
      }
      .scanner-status.active { color:#27ae60; font-weight:600; }
      .scanner-status.found  { color:#3498db; font-weight:600; }
      .scanner-status.error  { color:#e74c3c; }

      .btn-scanner-toggle {
        width:100%; padding:14px; background:#3498db; color:#fff; border:none;
        border-radius:12px; font-family:'Poppins',sans-serif; font-size:15px;
        font-weight:600; cursor:pointer; display:flex; align-items:center;
        justify-content:center; gap:10px; transition:background .2s, transform .1s;
      }
      .btn-scanner-toggle:active  { transform:scale(.97); }
      .btn-scanner-toggle.stop    { background:#e74c3c; }
      .btn-scanner-toggle:disabled{ background:#bdc3c7; cursor:not-allowed; }

      /* ── Tarjeta base ── */
      .sc-card {
        width:100%; max-width:460px; background:#fff; border-radius:16px;
        box-shadow:0 4px 20px rgba(0,0,0,.1); padding:24px;
        font-family:'Poppins',sans-serif; display:none;
      }
      .sc-card.visible { display:block; }

      .sc-card-header {
        display:flex; align-items:center; gap:10px; margin-bottom:18px;
      }
      .sc-card-header i   { font-size:20px; color:#3498db; }
      .sc-card-header h3  { font-size:16px; color:#2c3e50; margin:0; flex:1; }
      .badge-nuevo        { background:#d4edda; color:#155724; padding:3px 10px;
                            border-radius:20px; font-size:11px; font-weight:700; }
      .badge-existente    { background:#cce5ff; color:#004085; padding:3px 10px;
                            border-radius:20px; font-size:11px; font-weight:700; }

      /* Grid del formulario nuevo */
      .sc-grid {
        display:grid; grid-template-columns:1fr 1fr; gap:14px;
      }
      .sc-grid .full { grid-column:1/-1; }
      .sc-grid label {
        display:block; font-size:11px; font-weight:700; color:#7f8c8d;
        text-transform:uppercase; letter-spacing:.5px; margin-bottom:5px;
      }
      .sc-grid input, .sc-grid select {
        width:100%; padding:10px 12px; border:1.5px solid #dce0e6;
        border-radius:8px; font-size:14px; font-family:'Poppins',sans-serif;
        outline:none; box-sizing:border-box; transition:border-color .2s;
      }
      .sc-grid input:focus, .sc-grid select:focus { border-color:#3498db; }
      .sc-grid input[readonly] { background:#f4f7fc; color:#7f8c8d; }

      /* Producto existente: info + campo cantidad */
      .sc-product-info {
        background:#f4f7fc; border-radius:10px; padding:14px 16px;
        margin-bottom:16px; display:flex; flex-direction:column; gap:4px;
      }
      .sc-product-info .sc-prod-name {
        font-size:16px; font-weight:700; color:#2c3e50;
      }
      .sc-product-info .sc-prod-meta {
        font-size:13px; color:#7f8c8d;
      }
      .sc-product-info .sc-prod-stock {
        font-size:13px; color:#27ae60; font-weight:600; margin-top:4px;
      }
      .sc-qty-group {
        display:flex; flex-direction:column; gap:6px;
      }
      .sc-qty-group label {
        font-size:12px; font-weight:700; color:#7f8c8d;
        text-transform:uppercase; letter-spacing:.5px;
      }
      .sc-qty-row {
        display:flex; align-items:center; gap:12px;
      }
      .sc-qty-row input {
        flex:1; padding:12px; border:1.5px solid #dce0e6; border-radius:8px;
        font-size:20px; font-weight:700; text-align:center;
        font-family:'Poppins',sans-serif; outline:none;
        transition:border-color .2s;
      }
      .sc-qty-row input:focus { border-color:#27ae60; }
      .btn-qty {
        width:44px; height:44px; border:none; border-radius:8px;
        font-size:22px; cursor:pointer; transition:background .15s;
        display:flex; align-items:center; justify-content:center; font-weight:700;
      }
      .btn-qty-minus { background:#fdecea; color:#e74c3c; }
      .btn-qty-plus  { background:#d4edda; color:#27ae60; }
      .btn-qty:hover { opacity:.8; }

      /* Acciones */
      .sc-actions {
        display:flex; gap:10px; margin-top:20px;
      }
      .btn-sc-cancel {
        flex:1; padding:11px; border:1.5px solid #bdc3c7; background:#fff;
        border-radius:8px; cursor:pointer; font-family:'Poppins',sans-serif;
        font-size:14px; color:#7f8c8d; transition:background .2s;
      }
      .btn-sc-cancel:hover { background:#f5f5f5; }
      .btn-sc-save-new {
        flex:2; padding:11px; background:#3498db; color:#fff; border:none;
        border-radius:8px; cursor:pointer; font-family:'Poppins',sans-serif;
        font-size:14px; font-weight:700; transition:background .2s;
      }
      .btn-sc-save-new:hover { background:#2980b9; }
      .btn-sc-add-stock {
        flex:2; padding:11px; background:#27ae60; color:#fff; border:none;
        border-radius:8px; cursor:pointer; font-family:'Poppins',sans-serif;
        font-size:14px; font-weight:700; transition:background .2s;
      }
      .btn-sc-add-stock:hover { background:#219150; }

      /* Toast */
      .sc-toast {
        position:fixed; bottom:28px; right:16px; left:16px;
        padding:13px 18px; border-radius:10px; color:#fff;
        font-family:'Poppins',sans-serif; font-size:14px; font-weight:500;
        display:flex; align-items:center; gap:10px;
        box-shadow:0 6px 24px rgba(0,0,0,.2);
        opacity:0; transform:translateY(20px);
        transition:opacity .3s, transform .3s; z-index:9999;
      }
      .sc-toast.show { opacity:1; transform:translateY(0); }
      .sc-toast.ok   { background:#27ae60; }
      .sc-toast.warn { background:#e67e22; }
      .sc-toast.err  { background:#e74c3c; }
    `;
    document.head.appendChild(s);
  };

  // ── Toast ─────────────────────────────────────────────────
  const toast = (msg, tipo = 'ok') => {
    document.querySelectorAll('.sc-toast').forEach(t => t.remove());
    const t = document.createElement('div');
    t.className = `sc-toast ${tipo}`;
    const ico = { ok:'check-circle', warn:'exclamation-triangle', err:'times-circle' }[tipo];
    t.innerHTML = `<i class="fas fa-${ico}"></i> ${msg}`;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3500);
  };

  // ── Construir UI ──────────────────────────────────────────
  const construirUI = () => {
    const sec = document.getElementById('scanner');
    if (!sec) return;
    sec.innerHTML = `
      <div class="scanner-wrap">

        <div class="scanner-desktop-warning">
          <i class="fas fa-mobile-alt" style="font-size:26px;margin-bottom:8px;display:block"></i>
          <strong>Esta función es exclusiva para dispositivos móviles.</strong><br>
          Abre la aplicación desde tu celular para usar el escáner de códigos de barras.
        </div>

        <!-- Cámara -->
        <div class="scanner-camera-section">
          <div class="scanner-viewfinder">
            <video id="scanner-video" playsinline muted></video>
            <div class="scanner-overlay"><div class="scanner-reticle"></div></div>
          </div>
          <p class="scanner-status" id="scanner-status">Presiona el botón para iniciar la cámara</p>
          <button class="btn-scanner-toggle" id="btn-toggle-scanner">
            <i class="fas fa-camera"></i> Iniciar Escáner
          </button>
        </div>

        <!-- Formulario: producto NUEVO -->
        <div class="sc-card" id="scanner-form-card">
          <div class="sc-card-header">
            <i class="fas fa-plus-circle"></i>
            <h3>Registrar Producto Nuevo</h3>
            <span class="badge-nuevo">NUEVO</span>
          </div>
          <div class="sc-grid">
            <div class="full">
              <label>Código Escaneado</label>
              <input type="text" id="sc-codigo" readonly>
            </div>
            <div class="full">
              <label>Nombre del Producto *</label>
              <input type="text" id="sc-nombre" placeholder="Ej. Cuaderno profesional">
            </div>
            <div>
              <label>Precio (MXN) *</label>
              <input type="number" id="sc-precio" placeholder="0.00" step="0.01" min="0">
            </div>
            <div>
              <label>Cantidad Inicial *</label>
              <input type="number" id="sc-stock" placeholder="0" min="0">
            </div>
            <div>
              <label>Categoría</label>
              <select id="sc-categoria">
                <option value="Papelería">Papelería</option>
                <option value="Escritura">Escritura</option>
                <option value="Oficina">Oficina</option>
                <option value="Otros">Otros</option>
              </select>
            </div>
            <div>
              <label>Stock Mínimo</label>
              <input type="number" id="sc-minimo" value="5" min="0">
            </div>
          </div>
          <div class="sc-actions">
            <button class="btn-sc-cancel"   id="btn-sc-new-cancel">
              <i class="fas fa-times"></i> Cancelar
            </button>
            <button class="btn-sc-save-new" id="btn-sc-new-save">
              <i class="fas fa-save"></i> Guardar en Inventario
            </button>
          </div>
        </div>

        <!-- Formulario: producto EXISTENTE → sumar stock -->
        <div class="sc-card" id="scanner-add-stock-card">
          <div class="sc-card-header">
            <i class="fas fa-boxes"></i>
            <h3>Agregar Stock</h3>
            <span class="badge-existente">EXISTENTE</span>
          </div>
          <div class="sc-product-info" id="sc-prod-info"></div>
          <div class="sc-qty-group">
            <label>¿Cuántas unidades deseas agregar?</label>
            <div class="sc-qty-row">
              <button class="btn-qty btn-qty-minus" id="btn-qty-minus">−</button>
              <input type="number" id="sc-qty-add" value="1" min="1">
              <button class="btn-qty btn-qty-plus"  id="btn-qty-plus">+</button>
            </div>
          </div>
          <div class="sc-actions">
            <button class="btn-sc-cancel"    id="btn-sc-stock-cancel">
              <i class="fas fa-times"></i> Cancelar
            </button>
            <button class="btn-sc-add-stock" id="btn-sc-stock-save">
              <i class="fas fa-plus"></i> Sumar al Inventario
            </button>
          </div>
        </div>

      </div>
    `;
  };

  // ── Cargar ZXing ──────────────────────────────────────────
  const cargarZXing = () => new Promise((resolve, reject) => {
    if (window.ZXing) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/@zxing/library@0.19.1/umd/index.min.js';
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });

  // ── Iniciar / detener ─────────────────────────────────────
  const iniciarEscaner = async () => {
    const btn   = document.getElementById('btn-toggle-scanner');
    const video = document.getElementById('scanner-video');
    if (escaneando) { detenerEscaner(); return; }

    btn.disabled = true;
    setStatus('Cargando escáner…', '');

    try { await cargarZXing(); }
    catch {
      setStatus('No se pudo cargar el escáner. Verifica tu conexión.', 'error');
      btn.disabled = false; return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal:'environment' }, width:{ideal:1280}, height:{ideal:720} }
      });
      video.srcObject = stream;
      await video.play();

      const hints = new Map();
      hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
        ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8,
        ZXing.BarcodeFormat.CODE_128, ZXing.BarcodeFormat.CODE_39,
        ZXing.BarcodeFormat.UPC_A, ZXing.BarcodeFormat.UPC_E,
        ZXing.BarcodeFormat.QR_CODE,
      ]);
      hints.set(ZXing.DecodeHintType.TRY_HARDER, true);

      codeReader = new ZXing.BrowserMultiFormatReader(hints, 300);
      escaneando = true;
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-stop-circle"></i> Detener Escáner';
      btn.classList.add('stop');
      setStatus('📷 Apunta al código de barras…', 'active');

      codeReader.decodeFromStream(stream, video, (result) => {
        if (result) {
          const codigo = result.getText();
          if (codigo !== ultimoCodigo) {
            ultimoCodigo = codigo;
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            onCodigoDetectado(codigo);
          }
        }
      });

    } catch (err) {
      const msg = err.name === 'NotAllowedError'
        ? 'Permiso de cámara denegado. Actívalo en tu navegador.'
        : 'Error al acceder a la cámara: ' + err.message;
      setStatus(msg, 'error');
      btn.disabled = false;
    }
  };

  const detenerEscaner = () => {
    const btn   = document.getElementById('btn-toggle-scanner');
    const video = document.getElementById('scanner-video');
    if (codeReader) { try { codeReader.reset(); } catch {} codeReader = null; }
    if (video?.srcObject) { video.srcObject.getTracks().forEach(t => t.stop()); video.srcObject = null; }
    escaneando = false; ultimoCodigo = null;
    btn.innerHTML = '<i class="fas fa-camera"></i> Iniciar Escáner';
    btn.classList.remove('stop');
    setStatus('Escáner detenido.', '');
  };

  const setStatus = (msg, tipo) => {
    const el = document.getElementById('scanner-status');
    if (el) { el.textContent = msg; el.className = `scanner-status ${tipo||''}`; }
  };

  // ── Código detectado ──────────────────────────────────────
  const onCodigoDetectado = (codigo) => {
    setStatus(`✅ Código detectado: ${codigo}`, 'found');
    const productos = leerProductos();
    const existente = productos.find(p => p.codigo === codigo);

    if (existente) {
      mostrarSumarStock(existente);
    } else {
      mostrarFormularioNuevo(codigo);
    }
  };

  // ── Formulario NUEVO ──────────────────────────────────────
  const mostrarFormularioNuevo = (codigo) => {
    document.getElementById('sc-codigo').value    = codigo;
    document.getElementById('sc-nombre').value    = '';
    document.getElementById('sc-precio').value    = '';
    document.getElementById('sc-stock').value     = '';
    document.getElementById('sc-minimo').value    = '5';
    document.getElementById('sc-categoria').value = 'Papelería';
    document.getElementById('scanner-add-stock-card').classList.remove('visible');
    document.getElementById('scanner-form-card').classList.add('visible');
    setTimeout(() => document.getElementById('sc-nombre').focus(), 200);
  };

  const guardarNuevo = () => {
    const codigo    = document.getElementById('sc-codigo').value.trim();
    const nombre    = document.getElementById('sc-nombre').value.trim();
    const precio    = parseFloat(document.getElementById('sc-precio').value);
    const stock     = parseInt(document.getElementById('sc-stock').value);
    const categoria = document.getElementById('sc-categoria').value;
    const minimo    = parseInt(document.getElementById('sc-minimo').value) || 5;

    if (!nombre)                      { toast('El nombre es obligatorio.', 'warn'); return; }
    if (isNaN(precio) || precio < 0)  { toast('Precio inválido.', 'warn'); return; }
    if (isNaN(stock)  || stock < 0)   { toast('Cantidad inválida.', 'warn'); return; }

    const productos = leerProductos();
    productos.push({
      id: `prod_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      codigo, nombre, precio, stock, categoria, minimo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    guardarProductos(productos);
    toast(`"${nombre}" agregado al inventario.`);
    cerrarFormularios();
  };

  // ── Formulario SUMAR STOCK ────────────────────────────────
  const mostrarSumarStock = (producto) => {
    document.getElementById('sc-prod-info').innerHTML = `
      <span class="sc-prod-name">${producto.nombre}</span>
      <span class="sc-prod-meta">Código: ${producto.codigo || '—'} · ${producto.categoria}</span>
      <span class="sc-prod-meta">Precio: $${parseFloat(producto.precio).toFixed(2)}</span>
      <span class="sc-prod-stock">Stock actual: ${producto.stock} unidades</span>
    `;
    document.getElementById('sc-qty-add').value = '1';
    document.getElementById('scanner-form-card').classList.remove('visible');
    document.getElementById('scanner-add-stock-card').classList.add('visible');
    // Guardar referencia del producto activo en el botón
    document.getElementById('btn-sc-stock-save').dataset.prodId = producto.id;
    setTimeout(() => document.getElementById('sc-qty-add').focus(), 200);
  };

  const sumarStock = () => {
    const prodId = document.getElementById('btn-sc-stock-save').dataset.prodId;
    const qty    = parseInt(document.getElementById('sc-qty-add').value);

    if (isNaN(qty) || qty < 1) { toast('Ingresa una cantidad válida.', 'warn'); return; }

    const productos = leerProductos();
    const idx       = productos.findIndex(p => p.id === prodId);
    if (idx === -1) { toast('Producto no encontrado.', 'err'); return; }

    const antes = productos[idx].stock;
    productos[idx].stock     += qty;
    productos[idx].updatedAt  = new Date().toISOString();

    guardarProductos(productos);
    toast(`+${qty} unidades agregadas a "${productos[idx].nombre}" (${antes} → ${productos[idx].stock})`);
    cerrarFormularios();
  };

  // ── Helpers ───────────────────────────────────────────────
  const cerrarFormularios = () => {
    document.getElementById('scanner-form-card')?.classList.remove('visible');
    document.getElementById('scanner-add-stock-card')?.classList.remove('visible');
    ultimoCodigo = null;
    if (escaneando) setStatus('📷 Apunta al código de barras…', 'active');
  };

  // ── Init ──────────────────────────────────────────────────
  const init = () => {
    inyectarEstilos();
    construirUI();

    document.getElementById('btn-toggle-scanner')
      ?.addEventListener('click', iniciarEscaner);

    // Nuevo producto
    document.getElementById('btn-sc-new-save')
      ?.addEventListener('click', guardarNuevo);
    document.getElementById('btn-sc-new-cancel')
      ?.addEventListener('click', cerrarFormularios);

    // Sumar stock
    document.getElementById('btn-sc-stock-save')
      ?.addEventListener('click', sumarStock);
    document.getElementById('btn-sc-stock-cancel')
      ?.addEventListener('click', cerrarFormularios);

    // Botones +/−
    document.getElementById('btn-qty-plus')?.addEventListener('click', () => {
      const i = document.getElementById('sc-qty-add');
      i.value = (parseInt(i.value) || 0) + 1;
    });
    document.getElementById('btn-qty-minus')?.addEventListener('click', () => {
      const i = document.getElementById('sc-qty-add');
      const v = (parseInt(i.value) || 1) - 1;
      i.value = v < 1 ? 1 : v;
    });

    // Detener cámara al salir de la sección
    document.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', () => {
        if (item.dataset.section !== 'scanner' && escaneando) detenerEscaner();
      });
    });
  };

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => Scanner.init());
window.Scanner = Scanner;