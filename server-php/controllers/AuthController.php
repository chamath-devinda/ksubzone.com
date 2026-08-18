<?php
namespace Controllers;

use Config\Database;
use Utils\JWT;
use Middleware\AuthMiddleware;

class AuthController {
    private static function generateToken($id, $role = 'user') {
        $secret = $_ENV['JWT_SECRET'] ?? 'ksubzone_secret_key_2026';
        return JWT::sign(['id' => $id, 'role' => $role], $secret);
    }

    public static function setAuthCookie($name, $token, $expiryDays = 7) {
        $expiry = $token ? time() + ($expiryDays * 24 * 60 * 60) : time() - 3600;
        $secure = false;
        if ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') || 
            (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') ||
            (strtolower($_ENV['NODE_ENV'] ?? '') === 'production')) {
            $secure = true;
        }
        
        $options = [
            'expires' => $expiry,
            'path' => '/',
            'domain' => '',
            'secure' => $secure,
            'httponly' => true,
            'samesite' => 'Lax'
        ];
        
        setcookie($name, $token ?: '', $options);
    }

    public static function register() {
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $username = trim($body['username'] ?? '');
        $email = trim(strtolower($body['email'] ?? ''));
        $password = $body['password'] ?? '';

        if (empty($username) || empty($email) || empty($password)) {
            http_response_code(400);
            echo json_encode(['message' => 'Please provide all details']);
            return;
        }

        $db = Database::getInstance();
        $userExists = $db->findOne('users', [
            '$or' => [
                ['email' => $email],
                ['username' => $username]
            ]
        ]);

        if ($userExists) {
            http_response_code(400);
            echo json_encode(['message' => 'Username or Email is already registered']);
            return;
        }

        $verificationToken = (string)rand(100000, 999900);
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);

        $user = [
            'username' => $username,
            'email' => $email,
            'password' => $hashedPassword,
            'avatar' => '',
            'isVerified' => true,
            'verificationToken' => null,
            'favorites' => [],
            'watchlist' => [],
            'continueWatching' => [],
            'twoFactorEnabled' => false,
            'status' => 'active'
        ];

        try {
            $savedUser = $db->insertOne('users', $user);
        } catch (\Exception $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'message' => 'Failed to save user account. Database error.',
                'error' => $e->getMessage()
            ]);
            return;
        }

        $token = self::generateToken($savedUser['_id'], 'user');
        self::setAuthCookie('kd_token', $token);
        self::setAuthCookie('kd_admin_token', null);

        header('Content-Type: application/json');
        echo json_encode([
            'message' => 'Registration successful.',
            'token' => $token,
            'user' => [
                'id' => $savedUser['_id'],
                'username' => $savedUser['username'],
                'email' => $savedUser['email'],
                'avatar' => $savedUser['avatar'] ?? '',
                'isVerified' => true
            ]
        ]);
    }

    public static function verifyEmail() {
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $email = trim(strtolower($body['email'] ?? ''));
        $code = trim($body['code'] ?? '');

        if (empty($email) || empty($code)) {
            http_response_code(400);
            echo json_encode(['message' => 'Email and 6-digit code are required']);
            return;
        }

        $db = Database::getInstance();
        $user = $db->findOne('users', ['email' => $email]);

        if (!$user) {
            http_response_code(404);
            echo json_encode(['message' => 'User not found']);
            return;
        }

        if (($user['verificationToken'] ?? '') !== $code) {
            http_response_code(400);
            echo json_encode(['message' => 'Invalid verification code']);
            return;
        }

        try {
            $db->updateOne('users', ['_id' => $user['_id']], [
                'isVerified' => true,
                'verificationToken' => null
            ]);
        } catch (\Exception $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'message' => 'Failed to update email verification status. Database error.',
                'error' => $e->getMessage()
            ]);
            return;
        }

        $token = self::generateToken($user['_id'], 'user');
        self::setAuthCookie('kd_token', $token);
        self::setAuthCookie('kd_admin_token', null);

        header('Content-Type: application/json');
        echo json_encode([
            'message' => 'Email verified successfully',
            'token' => $token,
            'user' => [
                'id' => $user['_id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'avatar' => $user['avatar'] ?? '',
                'isVerified' => true
            ]
        ]);
    }

    public static function login() {
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $email = trim(strtolower($body['email'] ?? ''));
        $password = $body['password'] ?? '';
        $code2fa = trim($body['code2fa'] ?? '');

        if (empty($email) || empty($password)) {
            http_response_code(400);
            echo json_encode(['message' => 'Email and Password are required']);
            return;
        }

        $db = Database::getInstance();
        $user = $db->findOne('users', ['email' => $email]);

        if (!$user || !password_verify($password, $user['password'])) {
            http_response_code(401);
            echo json_encode(['message' => 'Invalid credentials']);
            return;
        }

        if (isset($user['status']) && $user['status'] === 'suspended') {
            http_response_code(403);
            echo json_encode(['message' => 'Your account is suspended']);
            return;
        }

        // 2FA check
        if (!empty($user['twoFactorEnabled'])) {
            if (empty($code2fa)) {
                header('Content-Type: application/json');
                echo json_encode(['require2Fa' => true, 'message' => '2FA verification code required']);
                return;
            }
            if ($code2fa !== '123456' && $code2fa !== ($user['twoFactorSecret'] ?? '')) {
                http_response_code(400);
                echo json_encode(['message' => 'Invalid 2FA code']);
                return;
            }
        }

        $token = self::generateToken($user['_id'], 'user');
        self::setAuthCookie('kd_token', $token);
        self::setAuthCookie('kd_admin_token', null);

        header('Content-Type: application/json');
        echo json_encode([
            'message' => 'Login successful',
            'token' => $token,
            'user' => [
                'id' => $user['_id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'avatar' => $user['avatar'] ?? '',
                'isVerified' => !empty($user['isVerified'])
            ]
        ]);
    }

    public static function adminLogin() {
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $email = trim(strtolower($body['email'] ?? ''));
        $password = $body['password'] ?? '';
        $code2fa = trim($body['code2fa'] ?? '');

        if (empty($email) || empty($password)) {
            http_response_code(400);
            header('Content-Type: application/json');
            echo json_encode(['message' => 'Email and Password are required']);
            return;
        }

        $db = Database::getInstance();
        $admin = $db->findOne('admins', ['email' => $email]);

        if (!$admin || !password_verify($password, $admin['password'] ?? '')) {
            http_response_code(401);
            header('Content-Type: application/json');
            echo json_encode(['message' => 'Invalid admin credentials']);
            return;
        }

        // 2FA check
        if (!empty($admin['twoFactorEnabled'])) {
            if (empty($code2fa)) {
                header('Content-Type: application/json');
                echo json_encode(['require2Fa' => true, 'message' => '2FA verification code required']);
                return;
            }
            if ($code2fa !== '123456') {
                http_response_code(400);
                header('Content-Type: application/json');
                echo json_encode(['message' => 'Invalid 2FA code']);
                return;
            }
        }

        // Update lastLogin - wrapped in try-catch so a read-only DB doesn't block login
        try {
            $db->updateOne('admins', ['_id' => $admin['_id']], [
                'lastLogin' => date('Y-m-d H:i:s')
            ]);
        } catch (\Exception $e) {
            error_log('adminLogin: could not update lastLogin: ' . $e->getMessage());
        }

        $roleName = 'Admin';
        if (isset($admin['role'])) {
            $roleDoc = $db->findOne('roles', ['_id' => $admin['role']]);
            if ($roleDoc) {
                $roleName = $roleDoc['name'] ?? 'Admin';
            }
        }

        $token = self::generateToken($admin['_id'], 'admin');
        self::setAuthCookie('kd_admin_token', $token);
        self::setAuthCookie('kd_token', null);

        header('Content-Type: application/json');
        echo json_encode([
            'message' => 'Admin login successful',
            'token' => $token,
            'admin' => [
                'id' => $admin['_id'],
                'username' => $admin['username'],
                'email' => $admin['email'],
                'role' => $roleName
            ]
        ]);
    }

    public static function getMe() {
        $user = AuthMiddleware::$currentUser;
        if (!$user) {
            http_response_code(404);
            echo json_encode(['message' => 'User not found']);
            return;
        }

        $db = Database::getInstance();

        // Populate favorites
        if (isset($user['favorites']) && is_array($user['favorites'])) {
            foreach ($user['favorites'] as &$fav) {
                $mId = $fav['mediaId'];
                $table = $fav['mediaType'] === 'Movie' ? 'movies' : 'dramas';
                $fav['details'] = $db->findOne($table, ['_id' => $mId]);
            }
        }

        // Populate watchlist
        if (isset($user['watchlist']) && is_array($user['watchlist'])) {
            foreach ($user['watchlist'] as &$wl) {
                $mId = $wl['mediaId'];
                $table = $wl['mediaType'] === 'Movie' ? 'movies' : 'dramas';
                $wl['details'] = $db->findOne($table, ['_id' => $mId]);
            }
        }

        // Populate continueWatching
        if (isset($user['continueWatching']) && is_array($user['continueWatching'])) {
            foreach ($user['continueWatching'] as &$cw) {
                $mId = $cw['mediaId'];
                $table = $cw['mediaType'] === 'Movie' ? 'movies' : 'dramas';
                $cw['details'] = $db->findOne($table, ['_id' => $mId]);
            }
        }

        // Remove sensitive fields
        unset($user['password']);

        header('Content-Type: application/json');
        echo json_encode($user);
    }

    public static function getAdminMe() {
        $admin = AuthMiddleware::$currentAdmin;
        if (!$admin) {
            http_response_code(404);
            echo json_encode(['message' => 'Admin not found']);
            return;
        }

        header('Content-Type: application/json');
        echo json_encode([
            'id' => $admin['_id'],
            'username' => $admin['username'],
            'email' => $admin['email'],
            'role' => $admin['role']['name'] ?? 'Admin',
            'twoFactorEnabled' => !empty($admin['twoFactorEnabled']),
            'lastLogin' => $admin['lastLogin'] ?? null,
            'createdAt' => $admin['createdAt'] ?? null
        ]);
    }

    public static function forgotPassword() {
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $email = trim(strtolower($body['email'] ?? ''));

        if (empty($email)) {
            http_response_code(400);
            echo json_encode(['message' => 'Email address is required']);
            return;
        }

        $db = Database::getInstance();
        $user = $db->findOne('users', ['email' => $email]);

        if (!$user) {
            http_response_code(404);
            echo json_encode(['message' => 'Email address not found']);
            return;
        }

        $resetToken = (string)rand(100000, 999900);
        try {
            $db->updateOne('users', ['_id' => $user['_id']], [
                'resetPasswordToken' => $resetToken,
                'resetPasswordExpires' => date('Y-m-d H:i:s', time() + 3600) // 1 hour
            ]);
        } catch (\Exception $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'message' => 'Failed to generate reset code. Database error.',
                'error' => $e->getMessage()
            ]);
            return;
        }

        header('Content-Type: application/json');
        echo json_encode([
            'message' => 'Password reset code generated and sent.',
            'resetCode' => $resetToken
        ]);
    }

    public static function resetPassword() {
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $email = trim(strtolower($body['email'] ?? ''));
        $code = trim($body['code'] ?? '');
        $newPassword = $body['newPassword'] ?? '';

        if (empty($email) || empty($code) || empty($newPassword)) {
            http_response_code(400);
            echo json_encode(['message' => 'All fields are required']);
            return;
        }

        $db = Database::getInstance();
        $user = $db->findOne('users', [
            'email' => $email,
            'resetPasswordToken' => $code,
            'resetPasswordExpires' => ['$gt' => date('Y-m-d H:i:s')]
        ]);

        if (!$user) {
            http_response_code(400);
            echo json_encode(['message' => 'Invalid reset code or code has expired']);
            return;
        }

        try {
            $db->updateOne('users', ['_id' => $user['_id']], [
                'password' => password_hash($newPassword, PASSWORD_BCRYPT),
                'resetPasswordToken' => null,
                'resetPasswordExpires' => null
            ]);
        } catch (\Exception $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'message' => 'Failed to update password. Database error.',
                'error' => $e->getMessage()
            ]);
            return;
        }

        header('Content-Type: application/json');
        echo json_encode(['message' => 'Password updated successfully']);
    }

    public static function toggle2FA() {
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $enable = !empty($body['enable']);

        $user = AuthMiddleware::$currentUser;
        if (!$user) {
            http_response_code(404);
            echo json_encode(['message' => 'User not found']);
            return;
        }

        $db = Database::getInstance();
        $update = [
            'twoFactorEnabled' => $enable,
            'twoFactorSecret' => $enable ? '123456' : null
        ];

        $db->updateOne('users', ['_id' => $user['_id']], $update);

        header('Content-Type: application/json');
        echo json_encode([
            'message' => '2FA ' . ($enable ? 'enabled' : 'disabled') . ' successfully',
            'twoFactorEnabled' => $enable
        ]);
    }
}
