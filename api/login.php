<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'conexion.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $data    = json_decode(file_get_contents('php://input'), true);
    $usuario = trim($data['usuario'] ?? '');
    $pass    = trim($data['password'] ?? '');

    if (!$usuario || !$pass) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'msg' => 'Campos incompletos.']);
        exit;
    }

    $stmt = $pdo->prepare('SELECT * FROM usuarios WHERE usuario = :usuario LIMIT 1');
    $stmt->execute([':usuario' => $usuario]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || !password_verify($pass, $user['password'])) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'msg' => 'Usuario o contraseña incorrectos.']);
        exit;
    }

    $_SESSION['auth']    = true;
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['nombre']  = $user['nombre'];
    $_SESSION['usuario'] = $user['usuario'];

    echo json_encode([
        'ok'      => true,
        'nombre'  => $user['nombre'],
        'usuario' => $user['usuario'],
    ]);

} elseif ($method === 'DELETE') {
    session_destroy();
    echo json_encode(['ok' => true]);

} elseif ($method === 'GET') {
    if (!empty($_SESSION['auth'])) {
        echo json_encode([
            'ok'      => true,
            'nombre'  => $_SESSION['nombre'],
            'usuario' => $_SESSION['usuario'],
        ]);
    } else {
        http_response_code(401);
        echo json_encode(['ok' => false]);
    }
}
?>
```

---

Guarda el archivo, luego intenta el login en:
```
http://localhost/PapeleriaRioGrande/login.html