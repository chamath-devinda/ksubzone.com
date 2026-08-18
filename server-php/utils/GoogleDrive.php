<?php
namespace Utils;

class GoogleDrive {
    private $serviceAccount;
    private $folderId;

    public function __construct($serviceAccount, $folderId) {
        $this->serviceAccount = $serviceAccount;
        $this->folderId = $folderId;
    }

    /**
     * Authenticates with Google OAuth using a Service Account JSON private key.
     * Signs a JWT using RS256 and requests an access token.
     * 
     * @return string The OAuth2 access token
     */
    private function getAccessToken() {
        $sa = $this->serviceAccount;
        if (empty($sa) || !isset($sa['private_key']) || !isset($sa['client_email'])) {
            throw new \Exception("Invalid Google Service Account JSON configuration.");
        }

        $now = time();
        $header = [
            'alg' => 'RS256',
            'typ' => 'JWT'
        ];
        $payload = [
            'iss' => $sa['client_email'],
            'scope' => 'https://www.googleapis.com/auth/drive',
            'aud' => 'https://oauth2.googleapis.com/token',
            'exp' => $now + 3600,
            'iat' => $now
        ];

        $encodeHeader = $this->base64UrlEncode(json_encode($header));
        $encodePayload = $this->base64UrlEncode(json_encode($payload));
        $input = $encodeHeader . '.' . $encodePayload;

        $privateKey = $sa['private_key'];
        $signature = '';
        if (!openssl_sign($input, $signature, $privateKey, 'SHA256')) {
            throw new \Exception("Signing Service Account JWT failed: " . openssl_error_string());
        }

        $encodeSignature = $this->base64UrlEncode($signature);
        $jwt = $input . '.' . $encodeSignature;

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://oauth2.googleapis.com/token');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $jwt
        ]));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $resData = json_decode($response, true);
        if ($httpCode !== 200 || !isset($resData['access_token'])) {
            $err = isset($resData['error_description']) ? $resData['error_description'] : ($resData['error'] ?? 'Unknown OAuth authentication error');
            throw new \Exception("Google OAuth Authentication Failed: " . $err);
        }

        return $resData['access_token'];
    }

    private function base64UrlEncode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * Lists ZIP backup files inside the configured Google Drive folder.
     * 
     * @return array List of files (id, name, size, createdTime)
     */
    public function listBackups() {
        $accessToken = $this->getAccessToken();
        $folderId = $this->folderId;
        
        $q = urlencode("'{$folderId}' in parents and name contains '.zip' and trashed = false");
        $url = "https://www.googleapis.com/drive/v3/files?q={$q}&fields=files(id,name,size,mimeType,createdTime)&orderBy=createdTime+desc";

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Authorization: Bearer {$accessToken}"
        ]);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $resData = json_decode($response, true);
        if ($httpCode !== 200) {
            $err = $resData['error']['message'] ?? 'Failed to list files from Google Drive';
            throw new \Exception($err);
        }

        return $resData['files'] ?? [];
    }

    /**
     * Uploads a local ZIP file to Google Drive under the specified folder.
     * 
     * @param string $filePath Local path to the ZIP backup
     * @param string $fileName Target filename in Google Drive
     * @return array Google Drive file metadata
     */
    public function uploadBackup($filePath, $fileName) {
        $accessToken = $this->getAccessToken();
        $folderId = $this->folderId;

        $boundary = '-------' . uniqid();
        $metadata = [
            'name' => $fileName,
            'parents' => [$folderId]
        ];

        $fileData = @file_get_contents($filePath);
        if ($fileData === false) {
            throw new \Exception("Failed to read backup zip file at: " . $filePath);
        }

        $body = "";
        $body .= "--" . $boundary . "\r\n";
        $body .= "Content-Type: application/json; charset=UTF-8\r\n\r\n";
        $body .= json_encode($metadata) . "\r\n";
        $body .= "--" . $boundary . "\r\n";
        $body .= "Content-Type: application/zip\r\n\r\n";
        $body .= $fileData . "\r\n";
        $body .= "--" . $boundary . "--\r\n";

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Authorization: Bearer {$accessToken}",
            "Content-Type: multipart/related; boundary={$boundary}",
            "Content-Length: " . strlen($body)
        ]);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $resData = json_decode($response, true);
        if ($httpCode !== 200 && $httpCode !== 201) {
            $err = $resData['error']['message'] ?? 'Upload request failed';
            throw new \Exception("Google Drive upload failed: " . $err);
        }

        return $resData;
    }

    /**
     * Downloads a backup ZIP from Google Drive and saves it to a local temporary path.
     * 
     * @param string $fileId Google Drive File ID
     * @param string $destinationPath Local path to write to
     * @return bool True on success
     */
    public function downloadBackup($fileId, $destinationPath) {
        $accessToken = $this->getAccessToken();
        $url = "https://www.googleapis.com/drive/v3/files/{$fileId}?alt=media";

        $fp = fopen($destinationPath, 'w+');
        if (!$fp) {
            throw new \Exception("Failed to create temporary restore file: " . $destinationPath);
        }

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_FILE, $fp);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Authorization: Bearer {$accessToken}"
        ]);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        
        curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        fclose($fp);
        curl_close($ch);

        if ($httpCode !== 200) {
            @unlink($destinationPath);
            throw new \Exception("Failed to download file from Google Drive (HTTP code: {$httpCode})");
        }

        return true;
    }

    /**
     * Deletes a backup ZIP file from Google Drive.
     * 
     * @param string $fileId Google Drive File ID
     * @return bool True on success
     */
    public function deleteBackup($fileId) {
        $accessToken = $this->getAccessToken();
        $url = "https://www.googleapis.com/drive/v3/files/{$fileId}";

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Authorization: Bearer {$accessToken}"
        ]);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 && $httpCode !== 204) {
            $resData = json_decode($response, true);
            $err = $resData['error']['message'] ?? 'Failed to execute deletion in Drive';
            throw new \Exception($err);
        }

        return true;
    }
}
