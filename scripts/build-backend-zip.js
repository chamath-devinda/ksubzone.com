const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'server-php');
const tempDir = path.join(root, 'temp-backend-stage');
const zipFile = path.join(root, 'backend-update.zip');

if (fs.existsSync(zipFile)) fs.unlinkSync(zipFile);
if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
fs.mkdirSync(tempDir, { recursive: true });

const excludeFiles = new Set([
  '.env',
  '.env.local',
  '.env.production',
  'ksubzone.sqlite',
  'ksubzone.sqlite-shm',
  'ksubzone.sqlite-wal',
  'debug-log.php',
  'check-db.php',
  'test-db.php',
  'test-show.php',
  'install_mongo.ps1',
  'run-server.js'
]);
const excludeDirs = new Set(['uploads', 'temp', '.git', 'node_modules']);

function copyRecursive(src, dst) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const ent of entries) {
    if (ent.isDirectory()) {
      if (excludeDirs.has(ent.name)) continue;
      const subDst = path.join(dst, ent.name);
      fs.mkdirSync(subDst, { recursive: true });
      copyRecursive(path.join(src, ent.name), subDst);
    } else {
      if (excludeFiles.has(ent.name)) continue;
      if (ent.name.endsWith('.sqlite') || ent.name.startsWith('.db_initialized_')) continue;
      fs.copyFileSync(path.join(src, ent.name), path.join(dst, ent.name));
    }
  }
}

copyRecursive(srcDir, tempDir);

execSync('tar.exe -a -c -f "' + zipFile + '" *', { cwd: tempDir });
fs.rmSync(tempDir, { recursive: true, force: true });

const stats = fs.statSync(zipFile);
console.log('SUCCESS: backend-update.zip created!');
console.log('Size:', (stats.size / 1024).toFixed(2), 'KB');

const zipCheck = execSync('tar.exe -tf "' + zipFile + '"').toString();
const entries = zipCheck.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
console.log('Total entries in zip:', entries.length);
console.log('Any .env files?:', entries.filter(e => e.includes('.env')));
console.log('Any sqlite files?:', entries.filter(e => e.includes('.sqlite')));
console.log('Any test/debug scripts?:', entries.filter(e => /debug|check-db|test-|run-server|install_mongo/i.test(e)));
console.log('Core files included:', entries.filter(e => e === 'index.php' || e === '.htaccess' || e === 'bot-seo.php'));
