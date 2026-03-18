/**
 * dashboard.js — Papelería Rio Grande
 * Lee datos desde la API PHP (MySQL) en lugar de localStorage
 *   GET api/productos.php → productos
 *   GET api/ventas.php    → ventas con items
 */

(function () {

    const DIAS  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

    const C = {
        blue:   '#5b60d6',
        yellow: '#f4b400',
        green:  '#14c38e',
        red:    '#ff4560',
        purple: '#8b5cf6',
        gray:   '#94a3b8',
    };

    /* ── Helpers ──────────────────────────────────────── */
    function fmt(n) {
        return '$' + Number(n || 0).toLocaleString('es-MX', {
            minimumFractionDigits: 2, maximumFractionDigits: 2
        });
    }

    function set(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    async function fetchJSON(url) {
        try {
            const res = await fetch(url);
            if (!res.ok) return [];
            return await res.json();
        } catch { return []; }
    }

    /* ════════════════════════════════════════════════════
       INIT — carga datos de la API y renderiza todo
       ════════════════════════════════════════════════════ */
    async function initDashboard() {
        // Mostrar skeletons mientras carga
        mostrarCargando();

        // Traer productos y ventas en paralelo
        const [productos, ventas] = await Promise.all([
            fetchJSON('api/productos.php'),
            fetchJSON('api/ventas.php'),
        ]);

        updateStats(productos, ventas);
        renderVentasSemanales(ventas);
        renderProductosMasVendidos(ventas, productos);
        renderMovimientos(productos, ventas);
        renderUltimasVentas(ventas);
    }

    /* ── Skeleton mientras cargan los datos ───────────── */
    function mostrarCargando() {
        ['stat-productos','stat-stock-bajo','stat-ventas','stat-clientes'].forEach(id => {
            set(id, '...');
        });
        const tbody = document.getElementById('dashboard-ventas-body');
        if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="empty-msg">Cargando...</td></tr>';
    }

    /* ════════════════════════════════════════════════════
       1. TARJETAS
       ════════════════════════════════════════════════════ */
    function updateStats(productos, ventas) {
        set('stat-productos', productos.length);

        const alertas = productos.filter(p =>
            Number(p.stock) === 0 || Number(p.stock) <= Number(p.minimo || 5)
        ).length;
        set('stat-stock-bajo', alertas);

        const hoy = new Date().toISOString().slice(0, 10);
        const totalHoy = ventas
            .filter(v => (v.fecha || '').slice(0, 10) === hoy)
            .reduce((s, v) => s + Number(v.total || 0), 0);
        set('stat-ventas', fmt(totalHoy));

        set('stat-clientes', ventas.length);
    }

    /* ════════════════════════════════════════════════════
       2. VENTAS SEMANALES — BAR
       ════════════════════════════════════════════════════ */
    function renderVentasSemanales(ventas) {
        const canvas = document.getElementById('ventasChart');
        if (!canvas) return;

        const labels = [], data = [];
        for (let i = 6; i >= 0; i--) {
            const d   = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            labels.push(DIAS[d.getDay()]);
            data.push(
                ventas
                    .filter(v => (v.fecha || '').slice(0, 10) === key)
                    .reduce((s, v) => s + Number(v.total || 0), 0)
            );
        }

        new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: C.blue,
                    borderRadius: 7,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        ticks: { color: '#888', font: { size: 11, family: 'Poppins' } },
                        grid: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#888',
                            font: { size: 11, family: 'Poppins' },
                            callback: v => '$' + v.toLocaleString('es-MX')
                        },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    }
                }
            }
        });
    }

    /* ════════════════════════════════════════════════════
       3. PRODUCTOS MÁS VENDIDOS — DOUGHNUT
       ════════════════════════════════════════════════════ */
    function renderProductosMasVendidos(ventas, productos) {
        const canvas = document.getElementById('productosChart');
        if (!canvas) return;

        // Contar unidades por categoría desde ventas
        const catMap = {};
        ventas.forEach(v => {
            (v.items || []).forEach(item => {
                const prod = productos.find(p =>
                    p.id === item.producto_id ||
                    p.nombre === item.nombre ||
                    p.codigo === item.codigo
                );
                const cat = prod ? (prod.categoria || 'Otros') : 'Otros';
                catMap[cat] = (catMap[cat] || 0) + Number(item.cantidad || 1);
            });
        });

        let labels, data;

        if (Object.keys(catMap).length > 0) {
            const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
            labels = sorted.map(e => e[0]);
            data   = sorted.map(e => e[1]);
        } else if (productos.length > 0) {
            // Sin ventas aún: mostrar distribución del inventario
            const invMap = {};
            productos.forEach(p => {
                const cat = p.categoria || 'Otros';
                invMap[cat] = (invMap[cat] || 0) + 1;
            });
            labels = Object.keys(invMap);
            data   = Object.values(invMap);
        } else {
            labels = ['Sin datos'];
            data   = [1];
        }

        const palette = [C.blue, C.yellow, C.green, C.purple, C.gray, C.red];

        new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: palette.slice(0, labels.length),
                    borderWidth: 0,
                    hoverOffset: 8,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '62%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#555',
                            font: { size: 11, family: 'Poppins' },
                            boxWidth: 12,
                            padding: 12,
                        }
                    }
                }
            }
        });
    }

    /* ════════════════════════════════════════════════════
       4. ENTRADAS VS SALIDAS — LINE
       ════════════════════════════════════════════════════ */
    function renderMovimientos(productos, ventas) {
        const canvas = document.getElementById('movimientosChart');
        if (!canvas) return;

        const labels = [], entradas = [], salidas = [];

        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setDate(1);
            d.setMonth(d.getMonth() - i);
            const yyyy = d.getFullYear();
            const mm   = String(d.getMonth() + 1).padStart(2, '0');
            const key  = `${yyyy}-${mm}`;

            labels.push(MESES[d.getMonth()]);

            // Entradas: productos registrados ese mes (createdAt desde BD)
            const ent = productos
                .filter(p => (p.createdAt || '').startsWith(key))
                .reduce((s, p) => s + Number(p.stock || 0), 0);
            entradas.push(ent);

            // Salidas: unidades vendidas ese mes
            let sal = 0;
            ventas.forEach(v => {
                if ((v.fecha || '').startsWith(key)) {
                    (v.items || []).forEach(item => {
                        sal += Number(item.cantidad || 1);
                    });
                }
            });
            salidas.push(sal);
        }

        new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Entradas',
                        data: entradas,
                        borderColor: C.green,
                        backgroundColor: 'rgba(20,195,142,0.1)',
                        fill: true, tension: 0.4,
                        pointRadius: 4, pointBackgroundColor: C.green,
                        borderWidth: 2,
                    },
                    {
                        label: 'Salidas',
                        data: salidas,
                        borderColor: C.red,
                        backgroundColor: 'rgba(255,69,96,0.07)',
                        fill: true, tension: 0.4,
                        pointRadius: 4, pointBackgroundColor: C.red,
                        borderWidth: 2,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        ticks: { color: '#888', font: { size: 11, family: 'Poppins' } },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#888', font: { size: 11, family: 'Poppins' }, precision: 0 },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    }
                }
            }
        });
    }

    /* ════════════════════════════════════════════════════
       5. TABLA ÚLTIMAS VENTAS
       ════════════════════════════════════════════════════ */
    function renderUltimasVentas(ventas) {
        const tbody = document.getElementById('dashboard-ventas-body');
        if (!tbody) return;

        const ultimas = [...ventas]
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
            .slice(0, 5);

        if (!ultimas.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-msg">No hay ventas registradas</td></tr>';
            return;
        }

        tbody.innerHTML = ultimas.map(v => {
            const fecha  = v.fecha
                ? new Date(v.fecha).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' })
                : '—';
            const folio  = v.folio || v.id || '—';
            const items  = v.items || [];
            const resumen = items.length === 0
                ? '—'
                : items.length === 1
                    ? items[0].nombre
                    : `${items[0].nombre} +${items.length - 1} más`;

            return `<tr>
                <td>
                    <div style="font-size:.82rem;font-weight:600;color:#1a1a2e">${fecha}</div>
                    <div style="font-size:.71rem;color:#94a3b8;margin-top:2px">${folio}</div>
                </td>
                <td class="items-cell">${resumen}</td>
                <td><strong style="color:#1a1a2e">${fmt(v.total)}</strong></td>
                <td><span class="badge-completado">Completada</span></td>
            </tr>`;
        }).join('');
    }

    /* ════════════════════════════════════════════════════
       ARRANQUE Y RE-RENDER
       ════════════════════════════════════════════════════ */
    function destruir() {
        ['ventasChart','productosChart','movimientosChart'].forEach(id => {
            const inst = Chart.getChart(id);
            if (inst) inst.destroy();
        });
    }

    // Arrancar al cargar la página
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDashboard);
    } else {
        initDashboard();
    }

    // Re-renderizar al volver al inicio desde el menú
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.menu-item').forEach(li => {
            li.addEventListener('click', () => {
                if (li.dataset.section === 'inicio') {
                    destruir();
                    setTimeout(initDashboard, 80);
                }
            });
        });
    });

    // API pública para que ventas.js e inventario.js puedan forzar recarga
    window.Dashboard = {
        refresh: () => { destruir(); initDashboard(); }
    };

})();