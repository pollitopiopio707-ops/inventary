<?php
require_once 'auth.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once 'conexion.php';

$tipo = $_GET['tipo'] ?? 'ventas';
$mes  = $_GET['mes']  ?? 'all';
$anio = $_GET['anio'] ?? date('Y');

/* ── Helper: filtro de fecha ───────────────────────── */
function filtroFecha($campo, $mes, $anio) {
    $anio = intval($anio);
    if ($mes === 'all') {
        return "YEAR($campo) = $anio";
    }
    return "YEAR($campo) = $anio AND MONTH($campo) = " . intval($mes);
}

$resultado = [];

switch ($tipo) {

    /* ══════════════════════════════════════════════
       VENTAS
       ══════════════════════════════════════════════ */
    case 'ventas': {
        $where = filtroFecha('v.fecha', $mes, $anio);
        $stmt  = $pdo->query("
            SELECT
                v.id, v.folio, v.fecha,
                v.subtotal, v.total, v.pagoCon, v.cambio, v.metodoPago
            FROM ventas v
            WHERE $where
            ORDER BY v.fecha DESC
        ");
        $ventas = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Adjuntar items a cada venta
        $stmtItems = $pdo->prepare("SELECT * FROM venta_items WHERE venta_id = :vid");
        foreach ($ventas as &$v) {
            $stmtItems->execute([':vid' => $v['id']]);
            $v['items'] = $stmtItems->fetchAll(PDO::FETCH_ASSOC);
        }

        // Resumen
        $totalIngresos = array_sum(array_column($ventas, 'total'));
        $ticketProm    = count($ventas) ? $totalIngresos / count($ventas) : 0;

        $resultado = [
            'filas'   => $ventas,
            'resumen' => [
                'Total de ventas'  => count($ventas),
                'Ingresos totales' => $totalIngresos,
                'Ticket promedio'  => round($ticketProm, 2),
            ]
        ];
        break;
    }

    /* ══════════════════════════════════════════════
       INVENTARIO COMPLETO
       ══════════════════════════════════════════════ */
    case 'inventario': {
        $stmt = $pdo->query("SELECT * FROM productos ORDER BY nombre ASC");
        $prods = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $valorTotal = array_sum(array_map(fn($p) => $p['precio'] * $p['stock'], $prods));
        $sinStock   = count(array_filter($prods, fn($p) => $p['stock'] == 0));

        $resultado = [
            'filas'   => $prods,
            'resumen' => [
                'Total productos'       => count($prods),
                'Valor del inventario'  => $valorTotal,
                'Productos sin stock'   => $sinStock,
            ]
        ];
        break;
    }

    /* ══════════════════════════════════════════════
       STOCK BAJO
       ══════════════════════════════════════════════ */
    case 'stock-bajo': {
        $stmt  = $pdo->query("SELECT * FROM productos WHERE stock <= minimo ORDER BY stock ASC");
        $prods = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $resultado = [
            'filas'   => $prods,
            'resumen' => [
                'Productos en alerta' => count($prods),
                'Sin stock total'     => count(array_filter($prods, fn($p) => $p['stock'] == 0)),
            ]
        ];
        break;
    }

    /* ══════════════════════════════════════════════
       ENTRADAS (productos registrados ese periodo)
       ══════════════════════════════════════════════ */
    case 'entradas': {
        $where = filtroFecha('createdAt', $mes, $anio);
        $stmt  = $pdo->query("SELECT * FROM productos WHERE $where ORDER BY createdAt DESC");
        $prods = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $unidades   = array_sum(array_column($prods, 'stock'));
        $costoTotal = array_sum(array_map(fn($p) => $p['precio'] * $p['stock'], $prods));

        $resultado = [
            'filas'   => $prods,
            'resumen' => [
                'Productos ingresados' => count($prods),
                'Unidades recibidas'   => $unidades,
                'Costo total'          => $costoTotal,
            ]
        ];
        break;
    }

    /* ══════════════════════════════════════════════
       SALIDAS (items vendidos ese periodo)
       ══════════════════════════════════════════════ */
    case 'salidas': {
        $where = filtroFecha('v.fecha', $mes, $anio);
        $stmt  = $pdo->query("
            SELECT
                vi.nombre, vi.codigo, vi.cantidad, vi.precio,
                v.fecha, v.folio,
                (vi.precio * vi.cantidad) AS importe
            FROM venta_items vi
            JOIN ventas v ON v.id = vi.venta_id
            WHERE $where
            ORDER BY v.fecha DESC
        ");
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $unidades = array_sum(array_column($items, 'cantidad'));
        $total    = array_sum(array_column($items, 'importe'));

        $resultado = [
            'filas'   => $items,
            'resumen' => [
                'Total salidas'          => count($items),
                'Unidades vendidas'      => $unidades,
                'Importe total vendido'  => $total,
            ]
        ];
        break;
    }

    default:
        $resultado = ['filas' => [], 'resumen' => []];
}

echo json_encode($resultado);
?>