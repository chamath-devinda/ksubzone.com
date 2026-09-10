<?php
namespace Utils\Storage;

interface StorageProviderInterface {
    /**
     * Upload a file to storage.
     * 
     * @param array $file The uploaded file array (from $_FILES or custom array with tmp_name, name, size)
     * @param string $objectKey The generated normalized object key
     * @param array $options Additional options (mimeType, checksum, originalFilename, etc.)
     * @return array|false Returns metadata array on success or false on failure.
     */
    public function upload(array $file, string $objectKey, array $options = []);

    /**
     * Check if an object exists in storage and verify its properties.
     * 
     * @param string $objectKey
     * @return bool
     */
    public function exists(string $objectKey): bool;

    /**
     * Delete an object (primarily for rollback of failed transactions).
     * 
     * @param string $objectKey
     * @return bool
     */
    public function delete(string $objectKey): bool;

    /**
     * Get the public download URL for the object.
     * 
     * @param string $objectKey
     * @return string
     */
    public function getPublicUrl(string $objectKey): string;

    /**
     * Get the provider identifier ('r2', 'supabase', 'local')
     * 
     * @return string
     */
    public function getProviderName(): string;
}
