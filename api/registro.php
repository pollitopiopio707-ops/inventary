<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once 'conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'msg' => 'Método no permitido.']);
    exit;
}

$data     = json_decode(file_get_contents('php://input'), true);
$nombre   = trim($data['nombre']   ?? '');
$usuario  = trim($data['usuario']  ?? '');
$password = trim($data['password'] ?? '');

/* ── Validaciones ──────────────────────────────────── */
if (!$nombre || !$usuario || !$password) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'msg' => 'Todos los campos son obligatorios.']);
    exit;
}

if (strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'msg' => 'La contraseña debe tener al menos 6 caracteres.']);
    exit;
}

/* ── Verificar usuario duplicado ───────────────────── */
$check = $pdo->prepare('SELECT id FROM usuarios WHERE usuario = :usuario');
$check->execute([':usuario' => $usuario]);
if ($check->fetch()) {
    http_response_code(409);
    echo json_encode(['ok' => false, 'msg' => 'Ese nombre de usuario ya está en uso.']);
    exit;
}

/* ── Insertar usuario con contraseña encriptada ─────── */
$hash = password_hash($password, PASSWORD_BCRYPT);

$stmt = $pdo->prepare('
    INSERT INTO usuarios (nombre, usuario, password)
    VALUES (:nombre, :usuario, :password)
');
$stmt->execute([
    ':nombre'   => $nombre,
    ':usuario'  => $usuario,
    ':password' => $hash,
]);

echo json_encode(['ok' => true, 'msg' => 'Usuario registrado correctamente.']);
?>