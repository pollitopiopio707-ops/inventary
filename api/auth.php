<?php
/**
 * auth.php
 * Incluir este archivo al inicio de cualquier endpoint protegido.
 * Si la sesión no está activa, devuelve 401 y detiene la ejecución.
 */
session_start();

if (empty($_SESSION['auth'])) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'msg' => 'No autorizado. Inicia sesión.']);
    exit;
}
?>