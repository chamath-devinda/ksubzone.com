<?php
namespace Middleware;

use Config\Database;
use Utils\JWT;

class AuthMiddleware {
    public static $currentUser = null;
    public static $currentAdmin = null;

    private static function getBearerToken() {
        // 1. First, check cookies (httpOnly)
        $uri = $_SERVER['REQUEST_URI'] ?? '';
        $isAdminRoute = strpos($uri, '/api/admin/') !== false;
        
        $cookieName = $isAdminRoute ? 'kd_admin_token' : 'kd_token';
        if (isset($_COOKIE[$cookieName])) {
            return $_COOKIE[$cookieName];
        }
        
        // Secondary fallback to the other cookie
        $fallbackCookie = $isAdminRoute ? 'kd_token' : 'kd_admin_token';
        if (isset($_COOKIE[$fallbackCookie])) {
            return $_COOKIE[$fallbackCookie];
        }

        // 2. Fallback to Authorization Header
        $authHeader = '';
        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        }
        
        if (empty($authHeader) && isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
        }

        if (empty($authHeader) && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        }

        if (preg_match('/Bearer\s(\S+)/i', $authHeader, $matches)) {
            return $matches[1];
        }
        return null;
    }

    public static function protectUser() {
        $token = self::getBearerToken();
        if (!$token) {
            http_response_code(401);
            echo json_encode(['message' => 'Not authorized, token missing']);
            exit;
        }

        $secret = $_ENV['JWT_SECRET'] ?? 'ksubzone_secret_key_2026';
        $decoded = JWT::verify($token, $secret);
        if (!$decoded) {
            http_response_code(401);
            echo json_encode(['message' => 'Not authorized, token invalid']);
            exit;
        }

        $db = Database::getInstance();
        $user = $db->findOne('users', ['_id' => $decoded['id']]);
        if (!$user) {
            http_response_code(401);
            echo json_encode(['message' => 'Not authorized, user not found']);
            exit;
        }

        if (isset($user['status']) && $user['status'] === 'suspended') {
            http_response_code(403);
            echo json_encode(['message' => 'Your account is suspended']);
            exit;
        }

        self::$currentUser = $user;
        return $user;
    }

    /**
     * Populate the current user when a valid user session is available, while
     * allowing genuinely anonymous requests to continue. A suspended account
     * cannot bypass its restriction by falling back to guest mode.
     */
    public static function optionalUser() {
        self::$currentUser = null;
        $token = self::getBearerToken();
        if (!$token) {
            return null;
        }

        $secret = $_ENV['JWT_SECRET'] ?? 'ksubzone_secret_key_2026';
        $decoded = JWT::verify($token, $secret);
        if (!$decoded || ($decoded['role'] ?? '') === 'admin' || empty($decoded['id'])) {
            return null;
        }

        $db = Database::getInstance();
        $user = $db->findOne('users', ['_id' => $decoded['id']]);
        if (!$user) {
            return null;
        }

        if (isset($user['status']) && $user['status'] === 'suspended') {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode(['message' => 'Your account is suspended']);
            exit;
        }

        self::$currentUser = $user;
        return $user;
    }

    public static function protectAdmin() {
        $token = self::getBearerToken();
        if (!$token) {
            http_response_code(401);
            echo json_encode(['message' => 'Not authorized, admin token missing']);
            exit;
        }

        $secret = $_ENV['JWT_SECRET'] ?? 'ksubzone_secret_key_2026';
        $decoded = JWT::verify($token, $secret);
        if (!$decoded || ($decoded['role'] ?? '') !== 'admin') {
            http_response_code(403);
            echo json_encode(['message' => 'Not authorized, invalid admin scope']);
            exit;
        }

        $db = Database::getInstance();
        $admin = $db->findOne('admins', ['_id' => $decoded['id']]);
        if (!$admin) {
            http_response_code(401);
            echo json_encode(['message' => 'Not authorized, admin user not found']);
            exit;
        }

        // Populate role and permissions
        if (isset($admin['role'])) {
            $roleId = is_array($admin['role']) ? ($admin['role']['_id'] ?? '') : $admin['role'];
            $roleCacheKey = 'admin_role_v1_' . (string)$roleId;
            $roleDoc = $roleId !== '' ? \Utils\Cache::get($roleCacheKey) : false;
            if ($roleDoc === false && $roleId !== '') {
                $roleDoc = $db->findOne('roles', ['_id' => $roleId]);
            }
            if ($roleDoc) {
                $permissionsArePopulated = isset($roleDoc['permissions'][0])
                    && is_array($roleDoc['permissions'][0]);
                if (!$permissionsArePopulated) {
                    $permissionsList = [];
                    if (isset($roleDoc['permissions']) && is_array($roleDoc['permissions'])) {
                        $permissionIds = array_values(array_filter($roleDoc['permissions']));
                        if (!empty($permissionIds)) {
                            $permissionDocs = $db->find('permissions', ['_id' => ['$in' => $permissionIds]]);
                            $permissionMap = [];
                            foreach ($permissionDocs as $permissionDoc) {
                                $permissionMap[(string)$permissionDoc['_id']] = $permissionDoc;
                            }
                            foreach ($permissionIds as $permissionId) {
                                if (isset($permissionMap[(string)$permissionId])) {
                                    $permissionsList[] = $permissionMap[(string)$permissionId];
                                }
                            }
                        }
                    }
                    $roleDoc['permissions'] = $permissionsList;
                    \Utils\Cache::set($roleCacheKey, $roleDoc, 300);
                }
                $admin['role'] = $roleDoc;
            }
        }

        self::$currentAdmin = $admin;
        return $admin;
    }

    public static function isAdmin() {
        $token = self::getBearerToken();
        if (!$token) {
            return false;
        }

        $secret = $_ENV['JWT_SECRET'] ?? 'ksubzone_secret_key_2026';
        $decoded = \Utils\JWT::verify($token, $secret);
        if (!$decoded || ($decoded['role'] ?? '') !== 'admin') {
            return false;
        }

        $db = Database::getInstance();
        $admin = $db->findOne('admins', ['_id' => $decoded['id']]);
        return (bool)$admin;
    }


    public static function hasPermission($permissionName) {
        if (!self::$currentAdmin) {
            http_response_code(401);
            echo json_encode(['message' => 'Unauthorized access']);
            exit;
        }

        $role = self::$currentAdmin['role'] ?? null;
        $roleName = $role['name'] ?? '';

        if ($roleName === 'SuperAdmin') {
            return true;
        }

        $permissions = [];
        if (isset($role['permissions']) && is_array($role['permissions'])) {
            foreach ($role['permissions'] as $p) {
                $permissions[] = $p['name'] ?? '';
            }
        }

        if (in_array($permissionName, $permissions)) {
            return true;
        }

        http_response_code(403);
        echo json_encode(['message' => "Access denied. Requires permission: {$permissionName}"]);
        exit;
    }
}
