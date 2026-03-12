// ============================================================
//  scanner.js — Papelería Rio Grande
//  Escaneo de códigos de barras via cámara (ZXing).
//  - Producto nuevo   → formulario completo para registrar
//  - Producto existe  → solo pide cantidad a sumar al stock
//
//  NOTA: Los estilos están en scanner.css
//        Asegúrate de incluirlo en tu HTML:
//        <link rel="stylesheet" href="scanner.css">
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

  // ── Toast ─────────────────────────────────────────────────
  const toast = (msg, tipo = 'ok') => {
    document.querySelectorAll('.sc-toast').forEach(t => t.remove());
    const t = document.createElement('div');
    t.className = `sc-toast ${tipo}`;
    const ico = { ok: 'check-circle', warn: 'exclamation-triangle', err: 'times-circle' }[tipo];
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
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      video.srcObject = stream;
      await video.play();

      const hints = new Map();
      hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
        ZXing.BarcodeFormat.EAN_13,   ZXing.BarcodeFormat.EAN_8,
        ZXing.BarcodeFormat.CODE_128, ZXing.BarcodeFormat.CODE_39,
        ZXing.BarcodeFormat.UPC_A,    ZXing.BarcodeFormat.UPC_E,
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
    escaneando   = false;
    ultimoCodigo = null;
    btn.innerHTML = '<i class="fas fa-camera"></i> Iniciar Escáner';
    btn.classList.remove('stop');
    setStatus('Escáner detenido.', '');
  };

  const setStatus = (msg, tipo) => {
    const el = document.getElementById('scanner-status');
    if (el) { el.textContent = msg; el.className = `scanner-status ${tipo || ''}`; }
  };

  // ── Código detectado ──────────────────────────────────────
  const onCodigoDetectado = (codigo) => {
    setStatus(`✅ Código detectado: ${codigo}`, 'found');
    const productos = leerProductos();
    const existente = productos.find(p => p.codigo === codigo);
    existente ? mostrarSumarStock(existente) : mostrarFormularioNuevo(codigo);
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

    if (!nombre)                     { toast('El nombre es obligatorio.', 'warn'); return; }
    if (isNaN(precio) || precio < 0) { toast('Precio inválido.', 'warn'); return; }
    if (isNaN(stock)  || stock < 0)  { toast('Cantidad inválida.', 'warn'); return; }

    const productos = leerProductos();
    productos.push({
      id: `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
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
    productos[idx].stock    += qty;
    productos[idx].updatedAt = new Date().toISOString();

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

    // Detener cámara al cambiar de sección
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