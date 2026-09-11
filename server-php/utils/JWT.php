<?php
namespace Utils;

class JWT {
    public static function secret() {
        $secret = $_ENV['JWT_SECRET'] ?? getenv('JWT_SECRET') ?: '';
        if (strlen($secret) < 32) throw new \RuntimeException('Authentication is not configured.');
        return $secret;
    }

    private static function base64UrlEncode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode($data) {
        $remainder = strlen($data) % 4;
        if ($remainder) {
            $padlen = 4 - $remainder;
            $data .= str_repeat('=', $padlen);
        }
        return base64_decode(strtr($data, '-_', '+/'));
    }

    public static function sign($payload, $secret, $expiryDays = 7) {
        $header = json_encode(['alg' => 'HS256', 'typ' => 'JWT']);
        $payload['exp'] = time() + ($expiryDays * 24 * 60 * 60);
        $payload['iat'] = time();

        $base64UrlHeader = self::base64UrlEncode($header);
        $base64UrlPayload = self::base64UrlEncode(json_encode($payload));

        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $secret, true);
        $base64UrlSignature = self::base64UrlEncode($signature);

        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    public static function verify($token, $secret) {
        if (!is_string($token) || strlen($token) > 8192) return false;
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return false;
        }

        list($base64UrlHeader, $base64UrlPayload, $base64UrlSignature) = $parts;

        $signature = self::base64UrlDecode($base64UrlSignature);
        $expectedSignature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $secret, true);

        if (!hash_equals($signature, $expectedSignature)) {
            return false;
        }

        $payload = json_decode(self::base64UrlDecode($base64UrlPayload), true);
        $header = json_decode(self::base64UrlDecode($base64UrlHeader), true);
        if (!is_array($payload) || ($header['alg'] ?? '') !== 'HS256' || empty($payload['id']) || !isset($payload['exp']) || !is_numeric($payload['exp'])) {
            return false;
        }

        if (isset($payload['exp']) && $payload['exp'] <= time()) {
            return false; // Token expired
        }

        return $payload;
    }
}
