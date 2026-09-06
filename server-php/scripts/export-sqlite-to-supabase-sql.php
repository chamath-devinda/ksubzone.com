<?php
// export-sqlite-to-supabase-sql.php
// Generates database/supabase_migration_full.sql from ksubzone.sqlite

ini_set('display_errors', 1);
error_reporting(E_ALL);

$sqlitePath = __DIR__ . '/../ksubzone.sqlite';
$outputPath = __DIR__ . '/../../database/supabase_migration_full.sql';

if (!file_exists($sqlitePath)) {
    die("ERROR: SQLite database not found at {$sqlitePath}\n");
}

$sqlite = new PDO("sqlite:" . $sqlitePath);
$sqlite->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$collections = [
    'users', 'admins', 'roles', 'permissions', 'movies', 
    'dramas', 'seasons', 'episodes', 'genres', 'subtitles', 
    'reviews', 'comments', 'analytics', 'settings', 'articles',
    'notifications', 'tmdb_imports'
];

$sql = "-- ==================================================================\n";
$sql .= "-- KSubZone Full Supabase PostgreSQL Migration Script\n";
$sql .= "-- Target Project Ref: lhbmpnnjrbvqvumtydcx\n";
$sql .= "-- Generated: " . date('Y-m-d H:i:s') . "\n";
$sql .= "-- IMPORTANT: Copy the ENTIRE file (Ctrl+A then Ctrl+C) and run!\n";
$sql .= "-- ==================================================================\n\n";

$sql .= "-- ==================================================================\n";
$sql .= "-- STEP 1: CREATE ALL TABLES (Must run first!)\n";
$sql .= "-- ==================================================================\n\n";
foreach ($collections as $col) {
    $sql .= "CREATE TABLE IF NOT EXISTS \"{$col}\" (\n";
    $sql .= "    \"_id\" TEXT PRIMARY KEY,\n";
    $sql .= "    \"data\" JSONB,\n";
    $sql .= "    \"createdAt\" TEXT,\n";
    $sql .= "    \"updatedAt\" TEXT\n";
    $sql .= ");\n";
    $sql .= "CREATE INDEX IF NOT EXISTS \"idx_{$col}_createdAt\" ON \"{$col}\" (\"createdAt\" DESC);\n\n";
}

$sql .= "-- ==================================================================\n";
$sql .= "-- STEP 2: PERFORMANCE INDEXES ON JSONB ATTRIBUTES\n";
$sql .= "-- ==================================================================\n\n";
$pgsqlIndexes = [
    'subtitles' => [
        'idx_subtitles_mediaId' => "(\"data\"->>'mediaId')",
        'idx_subtitles_approvalStatus' => "(\"data\"->>'approvalStatus')",
        'idx_subtitles_uploader' => "(\"data\"->>'uploader')"
    ],
    'users' => [
        'idx_users_username' => "(\"data\"->>'username')",
        'idx_users_email' => "(\"data\"->>'email')"
    ],
    'admins' => [
        'idx_admins_username' => "(\"data\"->>'username')",
        'idx_admins_email' => "(\"data\"->>'email')"
    ],
    'movies' => [
        'idx_movies_slug' => "(\"data\"->>'slug')",
        'idx_movies_status' => "(\"data\"->>'status')"
    ],
    'dramas' => [
        'idx_dramas_slug' => "(\"data\"->>'slug')",
        'idx_dramas_status' => "(\"data\"->>'status')"
    ],
    'seasons' => [
        'idx_seasons_dramaId' => "(\"data\"->>'dramaId')"
    ],
    'episodes' => [
        'idx_episodes_dramaId' => "(\"data\"->>'dramaId')",
        'idx_episodes_seasonId' => "(\"data\"->>'seasonId')"
    ],
    'articles' => [
        'idx_articles_slug' => "(\"data\"->>'slug')"
    ]
];

foreach ($pgsqlIndexes as $table => $tableIndexes) {
    foreach ($tableIndexes as $indexName => $expr) {
        $sql .= "CREATE INDEX IF NOT EXISTS \"{$indexName}\" ON \"{$table}\" ({$expr});\n";
    }
}
$sql .= "\n";

$sql .= "-- ==================================================================\n";
$sql .= "-- STEP 3: INSERT / SYNC ALL EXISTING DATA\n";
$sql .= "-- ==================================================================\n\n";
$totalRecords = 0;
foreach ($collections as $col) {
    $chk = $sqlite->query("SELECT 1 FROM sqlite_master WHERE type='table' AND name='{$col}' LIMIT 1");
    if (!$chk || $chk->fetch() === false) continue;

    $stmt = $sqlite->query("SELECT * FROM \"{$col}\"");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (empty($rows)) continue;

    $sql .= "-- Table: {$col} (" . count($rows) . " rows)\n";
    foreach ($rows as $row) {
        $id = "'" . addslashes($row['_id']) . "'";
        $dataJson = str_replace("'", "''", $row['data']);
        $created = "'" . addslashes($row['createdAt']) . "'";
        $updated = "'" . addslashes($row['updatedAt']) . "'";

        $sql .= "INSERT INTO \"{$col}\" (\"_id\", \"data\", \"createdAt\", \"updatedAt\") ";
        $sql .= "VALUES ({$id}, '{$dataJson}'::jsonb, {$created}, {$updated}) ";
        $sql .= "ON CONFLICT (\"_id\") DO UPDATE SET \"data\" = EXCLUDED.\"data\", \"updatedAt\" = EXCLUDED.\"updatedAt\";\n";
        $totalRecords++;
    }
    $sql .= "\n";
}

$sql .= "-- ==================================================================\n";
$sql .= "-- STEP 4: STORAGE BUCKET CREATION (FOR SUBTITLES & UPLOADS)\n";
$sql .= "-- ==================================================================\n\n";
$sql .= "INSERT INTO storage.buckets (id, name, public) VALUES ('Ksubzone', 'Ksubzone', true) ON CONFLICT (id) DO NOTHING;\n\n";

$sql .= "DROP POLICY IF EXISTS \"Public Read Subtitles\" ON storage.objects;\n";
$sql .= "CREATE POLICY \"Public Read Subtitles\" ON storage.objects FOR SELECT USING (bucket_id = 'Ksubzone');\n\n";

$sql .= "DROP POLICY IF EXISTS \"Service Role Manage Subtitles\" ON storage.objects;\n";
$sql .= "CREATE POLICY \"Service Role Manage Subtitles\" ON storage.objects FOR ALL TO service_role USING (bucket_id = 'Ksubzone');\n\n";

$sql .= "-- ==================================================================\n";
$sql .= "-- STEP 5: ROW LEVEL SECURITY (RLS) POLICIES\n";
$sql .= "-- ==================================================================\n\n";
foreach ($collections as $col) {
    $sql .= "ALTER TABLE IF EXISTS \"{$col}\" ENABLE ROW LEVEL SECURITY;\n";
    $sql .= "DROP POLICY IF EXISTS \"Public read {$col}\" ON \"{$col}\";\n";
    $sql .= "CREATE POLICY \"Public read {$col}\" ON \"{$col}\" FOR SELECT USING (true);\n";
    $sql .= "DROP POLICY IF EXISTS \"Service role full access {$col}\" ON \"{$col}\";\n";
    $sql .= "CREATE POLICY \"Service role full access {$col}\" ON \"{$col}\" FOR ALL TO service_role USING (true);\n\n";
}

file_put_contents($outputPath, $sql);
echo "SUCCESS: Generated {$outputPath} with {$totalRecords} records ready for Supabase!\n";
