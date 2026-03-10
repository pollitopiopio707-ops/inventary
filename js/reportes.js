// ============================================================
//  reportes.js — Papelería Rio Grande
//  Genera reportes de ventas, inventario y movimientos.
//  Exporta a PDF (via ventana de impresión) y Excel (SheetJS CDN).
// ============================================================

const Reportes = (() => {

  const KEYS = {
    ventas:    'papeleria_ventas',
    productos: 'papeleria_productos',
    entradas:  'papeleria_entradas',
    salidas:   'papeleria_salidas',
  };

  const leer = (key) => {
    try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : []; }
    catch { return []; }
  };

  const getVentas    = () => leer(KEYS.ventas);
  const getProductos = () => window.Inventario ? window.Inventario.getProductos() : leer(KEYS.productos);
  const getEntradas  = () => leer(KEYS.entradas);
  const getSalidas   = () => leer(KEYS.salidas);

  const fmt$    = (n) => `$${parseFloat(n || 0).toFixed(2)}`;
  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('es-MX') : '—';

  const filtrarPorPeriodo = (lista, campo, mes, anio) =>
    lista.filter(item => {
      const f = item[campo] ? new Date(item[campo]) : null;
      if (!f) return false;
      return f.getFullYear() === parseInt(anio) &&
             (mes === 'all' || (f.getMonth() + 1) === parseInt(mes));
    });

  const construirDatos = (tipo, mes, anio) => {
    switch (tipo) {
      case 'ventas': {
        const ventas = filtrarPorPeriodo(getVentas(), 'fecha', mes, anio);
        return {
          columnas: ['FECHA','FOLIO','PRODUCTOS','SUBTOTAL','TOTAL','MÉTODO'],
          filas: ventas.map(v => [
            fmtDate(v.fecha), v.folio || v.id || '—',
            (v.items||[]).map(i=>`${i.nombre} x${i.cantidad}`).join(', ') || '—',
            fmt$(v.subtotal), fmt$(v.total), v.metodoPago || 'Efectivo',
          ]),
          resumen: {
            'Total de ventas': ventas.length,
            'Ingresos totales': fmt$(ventas.reduce((s,v)=>s+(v.total||0),0)),
            'Ticket promedio':  fmt$(ventas.length ? ventas.reduce((s,v)=>s+(v.total||0),0)/ventas.length : 0),
          },
        };
      }
      case 'inventario': {
        const prods = getProductos();
        return {
          columnas: ['CÓDIGO','PRODUCTO','CATEGORÍA','PRECIO','STOCK','STOCK MÍN.','ESTADO'],
          filas: prods.map(p => [
            p.codigo||'—', p.nombre, p.categoria, fmt$(p.precio), p.stock, p.minimo,
            p.stock===0 ? 'Sin stock' : p.stock<=p.minimo ? 'Stock bajo' : 'OK',
          ]),
          resumen: {
            'Total productos': prods.length,
            'Valor del inventario': fmt$(prods.reduce((s,p)=>s+(p.precio*p.stock),0)),
            'Productos sin stock':  prods.filter(p=>p.stock===0).length,
          },
        };
      }
      case 'stock-bajo': {
        const prods = getProductos().filter(p=>p.stock<=p.minimo);
        return {
          columnas: ['CÓDIGO','PRODUCTO','CATEGORÍA','PRECIO','STOCK ACTUAL','STOCK MÍN.'],
          filas: prods.map(p=>[p.codigo||'—',p.nombre,p.categoria,fmt$(p.precio),p.stock,p.minimo]),
          resumen: {
            'Productos en alerta': prods.length,
            'Sin stock total': prods.filter(p=>p.stock===0).length,
          },
        };
      }
      case 'entradas': {
        const ent = filtrarPorPeriodo(getEntradas(), 'fecha', mes, anio);
        return {
          columnas: ['FECHA','PRODUCTO','CÓDIGO','CANTIDAD','COSTO UNIT.','TOTAL'],
          filas: ent.map(e=>[
            fmtDate(e.fecha), e.nombre||'—', e.codigo||'—', e.cantidad,
            fmt$(e.costoUnitario||e.precio||0),
            fmt$((e.costoUnitario||e.precio||0)*(e.cantidad||0)),
          ]),
          resumen: {
            'Total entradas': ent.length,
            'Unidades recibidas': ent.reduce((s,e)=>s+(e.cantidad||0),0),
            'Costo total': fmt$(ent.reduce((s,e)=>s+((e.costoUnitario||e.precio||0)*(e.cantidad||0)),0)),
          },
        };
      }
      case 'salidas': {
        const sal = filtrarPorPeriodo(getSalidas(), 'fecha', mes, anio);
        return {
          columnas: ['FECHA','PRODUCTO','CÓDIGO','CANTIDAD','MOTIVO'],
          filas: sal.map(s=>[fmtDate(s.fecha),s.nombre||'—',s.codigo||'—',s.cantidad,s.motivo||'Baja manual']),
          resumen: {
            'Total salidas': sal.length,
            'Unidades dadas de baja': sal.reduce((s,e)=>s+(e.cantidad||0),0),
          },
        };
      }
      default: return { columnas:[], filas:[], resumen:{} };
    }
  };

  const leerFiltros = () => ({
    tipo: document.getElementById('repo-tipo')?.value || 'ventas',
    mes:  document.getElementById('repo-mes')?.value  || 'all',
    anio: document.getElementById('repo-anio')?.value || new Date().getFullYear(),
  });

  const labelTipo = (t) => ({'ventas':'Ventas Realizadas','inventario':'Stock e Inventario','stock-bajo':'Productos con Stock Bajo','entradas':'Entradas de Mercancía','salidas':'Bajas / Salidas'}[t]||t);
  const labelMes  = (m) => ({'all':'Todos los meses','01':'Enero','02':'Febrero','03':'Marzo','04':'Abril','05':'Mayo','06':'Junio','07':'Julio','08':'Agosto','09':'Septiembre','10':'Octubre','11':'Noviembre','12':'Diciembre'}[m]||m);

  // ── Vista previa ─────────────────────────────────────────
  const renderVista = ({ tipo, mes, anio }) => {
    const { columnas, filas, resumen } = construirDatos(tipo, mes, anio);
    const tbody = document.getElementById('report-preview-body');
    const thead = tbody?.closest('table')?.querySelector('thead tr');
    if (!tbody) return;

    if (thead && columnas.length)
      thead.innerHTML = columnas.map(c=>`<th>${c}</th>`).join('');

    tbody.innerHTML = filas.length
      ? filas.map(f=>`<tr>${f.map(c=>`<td>${c??'—'}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${columnas.length||5}" class="empty-msg">Sin datos para el periodo seleccionado</td></tr>`;

    // Resumen
    document.getElementById('reporte-resumen')?.remove();
    const container = tbody.closest('.card');
    if (container && Object.keys(resumen).length) {
      const div = document.createElement('div');
      div.id = 'reporte-resumen';
      div.style.cssText = 'display:flex;flex-wrap:wrap;gap:14px;padding:18px 20px 4px;border-top:1px solid #eee;margin-top:16px';
      div.innerHTML = Object.entries(resumen).map(([k,v])=>`
        <div style="background:#f4f7fc;border-radius:10px;padding:12px 20px;min-width:160px;flex:1">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#7f8c8d;font-weight:600">${k}</div>
          <div style="font-size:20px;font-weight:700;color:#2c3e50;margin-top:4px">${v}</div>
        </div>`).join('');
      container.appendChild(div);
    }
  };

  // ── Exportar PDF ─────────────────────────────────────────
  const exportarPDF = () => {
    const { tipo, mes, anio } = leerFiltros();
    const { columnas, filas, resumen } = construirDatos(tipo, mes, anio);
    const titulo = `${labelTipo(tipo)} — ${labelMes(mes)} ${anio}`;
    const resumenHTML = Object.entries(resumen).map(([k,v])=>`<div class="rc"><div class="rl">${k}</div><div class="rv">${v}</div></div>`).join('');
    const filasHTML = filas.length
      ? filas.map(f=>`<tr>${f.map(c=>`<td>${c??'—'}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${columnas.length}" style="text-align:center;padding:20px;color:#999">Sin datos para el periodo</td></tr>`;

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${titulo}</title><style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Segoe UI',Arial,sans-serif;color:#2c3e50;padding:30px;font-size:13px}
      .hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;border-bottom:3px solid #3498db;padding-bottom:14px}
      .hdr h1{font-size:20px}.hdr .meta{text-align:right;font-size:11px;color:#7f8c8d}
      .sub{font-size:15px;font-weight:600;color:#3498db;margin-top:4px}
      .res{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:20px}
      .rc{background:#eaf3fb;border-radius:8px;padding:12px 18px;flex:1;min-width:130px}
      .rl{font-size:10px;text-transform:uppercase;color:#7f8c8d;font-weight:700;letter-spacing:.5px}
      .rv{font-size:18px;font-weight:800;color:#2980b9;margin-top:3px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th{background:#2c3e50;color:#fff;padding:10px 8px;text-align:left;font-size:11px;letter-spacing:.5px}
      td{padding:8px;border-bottom:1px solid #ecf0f1}
      tr:nth-child(even) td{background:#f9f9f9}
      .foot{margin-top:18px;text-align:right;font-size:10px;color:#bdc3c7}
      @media print{body{padding:15px}@page{margin:1cm;size:A4 landscape}}
    </style></head><body>
    <div class="hdr">
      <div><h1>Papelería Rio Grande</h1><div class="sub">${titulo}</div></div>
      <div class="meta"><div>Generado: ${new Date().toLocaleDateString('es-MX')}</div><div>Sistema de Inventario</div></div>
    </div>
    ${resumenHTML ? `<div class="res">${resumenHTML}</div>` : ''}
    <table><thead><tr>${columnas.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${filasHTML}</tbody></table>
    <div class="foot">Papelería Rio Grande © ${new Date().getFullYear()} — Reporte generado automáticamente</div>
    <script>window.onload=()=>{window.print()}<\/script></body></html>`;

    const win = window.open('','_blank');
    if (!win) { alert('Activa las ventanas emergentes para exportar PDF.'); return; }
    win.document.write(html);
    win.document.close();
  };

  // ── Exportar Excel ────────────────────────────────────────
  const cargarSheetJS = () => new Promise((resolve, reject) => {
    if (window.XLSX) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });

  const exportarExcel = async () => {
    try { await cargarSheetJS(); }
    catch { alert('No se pudo cargar la librería Excel. Verifica tu conexión.'); return; }

    const { tipo, mes, anio } = leerFiltros();
    const { columnas, filas, resumen } = construirDatos(tipo, mes, anio);

    const wb  = XLSX.utils.book_new();
    const ws  = XLSX.utils.aoa_to_sheet([columnas, ...filas]);
    ws['!cols'] = columnas.map((_,ci) =>
      ({ wch: Math.max(columnas[ci].length, ...filas.map(f=>String(f[ci]??'').length)) + 4 })
    );
    XLSX.utils.book_append_sheet(wb, ws, labelTipo(tipo).slice(0,31));

    if (Object.keys(resumen).length) {
      const wsR = XLSX.utils.aoa_to_sheet([
        ['MÉTRICA','VALOR'],
        ...Object.entries(resumen),
        [],
        ['Generado el', new Date().toLocaleString('es-MX')],
        ['Periodo', `${labelMes(mes)} ${anio}`],
      ]);
      wsR['!cols'] = [{wch:30},{wch:20}];
      XLSX.utils.book_append_sheet(wb, wsR, 'Resumen');
    }

    XLSX.writeFile(wb, `reporte_${tipo}_${anio}${mes!=='all'?'_'+mes:''}.xlsx`);
  };

  // ── Poblar selectores ─────────────────────────────────────
  const completarMeses = () => {
    const sel = document.getElementById('repo-mes');
    if (!sel) return;
    sel.innerHTML = [['all','Todos los meses'],['01','Enero'],['02','Febrero'],['03','Marzo'],
      ['04','Abril'],['05','Mayo'],['06','Junio'],['07','Julio'],['08','Agosto'],
      ['09','Septiembre'],['10','Octubre'],['11','Noviembre'],['12','Diciembre']]
      .map(([v,t])=>`<option value="${v}">${t}</option>`).join('');
  };

  const completarAnios = () => {
    const sel = document.getElementById('repo-anio');
    if (!sel) return;
    const actual = new Date().getFullYear();
    sel.innerHTML = Array.from({length:5},(_,i)=>actual-i)
      .map(y=>`<option value="${y}">${y}</option>`).join('');
  };

  const completarTipos = () => {
    const sel = document.getElementById('repo-tipo');
    if (!sel) return;
    sel.innerHTML = [
      ['ventas','Ventas Totales'],['inventario','Stock e Inventario'],
      ['stock-bajo','Productos con Stock Bajo'],['entradas','Entradas de Mercancía'],
      ['salidas','Bajas / Salidas'],
    ].map(([v,t])=>`<option value="${v}">${t}</option>`).join('');
  };

  // ── Init ──────────────────────────────────────────────────
  const init = () => {
    completarMeses();
    completarAnios();
    completarTipos();

    ['repo-tipo','repo-mes','repo-anio'].forEach(id =>
      document.getElementById(id)?.addEventListener('change', () => renderVista(leerFiltros()))
    );

    document.querySelector('.btn-pdf')?.addEventListener('click', exportarPDF);
    document.querySelector('.btn-excel')?.addEventListener('click', exportarExcel);

    renderVista(leerFiltros());
  };

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => Reportes.init());
window.Reportes = Reportes;