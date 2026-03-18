<?php
require_once 'conexion.php';

$usuario = 'admin';
$pass    = 'isai1234';

$stmt = $pdo->prepare('SELECT * FROM usuarios WHERE usuario = :usuario LIMIT 1');
$stmt->execute([':usuario' => $usuario]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

echo 'Usuario encontrado: ';
echo $user ? 'SI' : 'NO';
echo '<br>';

if ($user) {
    echo 'Password en BD: ' . $user['password'];
    echo '<br>';
    echo 'Verify resultado: ';
    echo password_verify($pass, $user['password']) ? 'OK' : 'FALLO';
}
?>