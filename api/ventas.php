<?php
require_once 'auth.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once 'conexion.php';

$method = $_SERVER['REQUEST_METHOD'];

/* ── GET — listar ventas con sus items ─────────────── */
if ($method === 'GET') {
    // Traer ventas
    $ventas = $pdo->query('SELECT * FROM ventas ORDER BY fecha DESC')->fetchAll(PDO::FETCH_ASSOC);

    // Adjuntar items a cada venta
    foreach ($ventas as &$v) {
        $stmt = $pdo->prepare('SELECT * FROM venta_items WHERE venta_id = :vid');
        $stmt->execute([':vid' => $v['id']]);
        $v['items'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    echo json_encode($ventas);
}

/* ── POST — registrar venta ────────────────────────── */
elseif ($method === 'POST') {
    $d = json_decode(file_get_contents('php://input'), true);

    if (empty($d['items'])) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'msg' => 'La venta no tiene productos.']);
        exit;
    }

    // Iniciar transacción (si algo falla, no se guarda nada a medias)
    $pdo->beginTransaction();

    try {
        // 1. Insertar venta
        $stmt = $pdo->prepare('
            INSERT INTO ventas (id, folio, fecha, total, pagoCon, cambio, metodoPago)
            VALUES (:id, :folio, NOW(), :total, :pagoCon, :cambio, :metodoPago)
        ');
        $stmt->execute([
            ':id'         => $d['id'],
            ':folio'      => $d['folio']      ?? '',
            ':total'      => $d['total']      ?? 0,
            ':pagoCon'    => $d['pagoCon']    ?? 0,
            ':cambio'     => $d['cambio']     ?? 0,
            ':metodoPago' => $d['metodoPago'] ?? 'Efectivo',
        ]);

        // 2. Insertar items y descontar stock
        $stmtItem = $pdo->prepare('
            INSERT INTO venta_items (venta_id, producto_id, nombre, codigo, precio, cantidad)
            VALUES (:venta_id, :producto_id, :nombre, :codigo, :precio, :cantidad)
        ');
        $stmtStock = $pdo->prepare('
            UPDATE productos SET stock = stock - :cantidad, updatedAt = NOW()
            WHERE id = :id AND stock >= :cantidad
        ');

        foreach ($d['items'] as $item) {
            // Descontar stock
            $stmtStock->execute([
                ':cantidad' => $item['cantidad'],
                ':id'       => $item['id'],
            ]);
            if ($stmtStock->rowCount() === 0) {
                throw new Exception("Stock insuficiente para: {$item['nombre']}");
            }

            // Guardar item
            $stmtItem->execute([
                ':venta_id'   => $d['id'],
                ':producto_id'=> $item['id'],
                ':nombre'     => $item['nombre'],
                ':codigo'     => $item['codigo']   ?? '',
                ':precio'     => $item['precio'],
                ':cantidad'   => $item['cantidad'],
            ]);
        }

        $pdo->commit();
        echo json_encode(['ok' => true]);

    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(400);
        echo json_encode(['ok' => false, 'msg' => $e->getMessage()]);
    }
}
?>