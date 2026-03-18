<?php
require_once 'auth.php';          // ← bloquea si no hay sesión
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once 'conexion.php';

$method = $_SERVER['REQUEST_METHOD'];

/* ── GET — listar todos ────────────────────────────── */
if ($method === 'GET') {
    $stmt = $pdo->query('SELECT * FROM productos ORDER BY nombre ASC');
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
}

/* ── POST — crear ──────────────────────────────────── */
elseif ($method === 'POST') {
    $d = json_decode(file_get_contents('php://input'), true);

    if (empty($d['nombre'])) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'msg' => 'El nombre es obligatorio.']);
        exit;
    }

    // Verificar código duplicado
    if (!empty($d['codigo'])) {
        $check = $pdo->prepare('SELECT id FROM productos WHERE codigo = :codigo');
        $check->execute([':codigo' => $d['codigo']]);
        if ($check->fetch()) {
            http_response_code(409);
            echo json_encode(['ok' => false, 'msg' => 'Ya existe un producto con ese código.']);
            exit;
        }
    }

    $stmt = $pdo->prepare('
        INSERT INTO productos (id, codigo, nombre, precio, stock, minimo, categoria)
        VALUES (:id, :codigo, :nombre, :precio, :stock, :minimo, :categoria)
    ');
    $stmt->execute([
        ':id'        => $d['id'],
        ':codigo'    => $d['codigo']    ?? '',
        ':nombre'    => $d['nombre'],
        ':precio'    => $d['precio']    ?? 0,
        ':stock'     => $d['stock']     ?? 0,
        ':minimo'    => $d['minimo']    ?? 5,
        ':categoria' => $d['categoria'] ?? 'Otros',
    ]);
    echo json_encode(['ok' => true]);
}

/* ── PUT — editar ──────────────────────────────────── */
elseif ($method === 'PUT') {
    $d = json_decode(file_get_contents('php://input'), true);

    $stmt = $pdo->prepare('
        UPDATE productos SET
            codigo    = :codigo,
            nombre    = :nombre,
            precio    = :precio,
            stock     = :stock,
            minimo    = :minimo,
            categoria = :categoria,
            updatedAt = NOW()
        WHERE id = :id
    ');
    $stmt->execute([
        ':id'        => $d['id'],
        ':codigo'    => $d['codigo']    ?? '',
        ':nombre'    => $d['nombre'],
        ':precio'    => $d['precio']    ?? 0,
        ':stock'     => $d['stock']     ?? 0,
        ':minimo'    => $d['minimo']    ?? 5,
        ':categoria' => $d['categoria'] ?? 'Otros',
    ]);
    echo json_encode(['ok' => true]);
}

/* ── DELETE — eliminar ─────────────────────────────── */
elseif ($method === 'DELETE') {
    $id   = $_GET['id'] ?? '';
    $stmt = $pdo->prepare('DELETE FROM productos WHERE id = :id');
    $stmt->execute([':id' => $id]);
    echo json_encode(['ok' => true]);
}
?>