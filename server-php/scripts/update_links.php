<?php
// server-php/scripts/update_links.php
require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../utils/Slug.php';
require_once __DIR__ . '/../utils/Dotenv.php';

// Bootstrap environment
if (file_exists(__DIR__ . '/../.env')) {
    \Utils\Dotenv::load(__DIR__ . '/../.env');
}

try {
    $db = \Config\Database::getInstance();
    $setting = $db->findOne('settings', ['key' => 'siteContent']);
    
    if ($setting) {
        $value = $setting['value'];
        
        // Update navigation links
        $value['navigation']['links'] = [
            ['label' => 'Movies', 'url' => '/movies'],
            ['label' => 'TV Series', 'url' => '/dramas'],
            ['label' => 'Articles', 'url' => '/articles'],
            ['label' => 'About Us', 'url' => '/about'],
            ['label' => 'Contact Us', 'url' => '/contact']
        ];
        
        // Update footer links
        $value['footer']['links'] = [
            ['label' => 'Home', 'url' => '/'],
            ['label' => 'Movies', 'url' => '/movies'],
            ['label' => 'TV Series', 'url' => '/dramas'],
            ['label' => 'About Us', 'url' => '/about'],
            ['label' => 'Contact Us', 'url' => '/contact']
        ];
        
        $db->updateOne('settings', ['_id' => $setting['_id']], ['value' => $value]);
        echo "SUCCESS: Navigation and Footer links updated in the database.\n";
    } else {
        // If not found, insert defaults
        require_once __DIR__ . '/../utils/SiteContentDefaults.php';
        $defaults = \Utils\SiteContentDefaults::get();
        $db->insertOne('settings', ['key' => 'siteContent', 'value' => $defaults]);
        echo "SUCCESS: Initialized settings database with new links.\n";
    }
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
