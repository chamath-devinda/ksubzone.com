const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function findPhp() {
  // 1. Try global PATH
  try {
    execSync('php -v', { stdio: 'ignore' });
    return 'php';
  } catch (e) {}

  // 2. Common Windows paths (including standard D: drive fallbacks)
  const commonPaths = [
    'C:\\xampp\\php\\php.exe',
    'D:\\xampp\\php\\php.exe',
    'C:\\Program Files\\PHP\\php.exe',
    'C:\\Program Files (x86)\\PHP\\php.exe',
  ];

  for (const p of commonPaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // 3. Laragon detection
  const laragonDir = 'C:\\laragon\\bin\\php';
  if (fs.existsSync(laragonDir)) {
    try {
      const subdirs = fs.readdirSync(laragonDir);
      for (const subdir of subdirs) {
        const phpPath = path.join(laragonDir, subdir, 'php.exe');
        if (fs.existsSync(phpPath)) {
          return phpPath;
        }
      }
    } catch (e) {}
  }

  // 4. WampServer detection
  const wampDir = 'C:\\wamp64\\bin\\php';
  if (fs.existsSync(wampDir)) {
    try {
      const subdirs = fs.readdirSync(wampDir);
      for (const subdir of subdirs) {
        const phpPath = path.join(wampDir, subdir, 'php.exe');
        if (fs.existsSync(phpPath)) {
          return phpPath;
        }
      }
    } catch (e) {}
  }

  return null;
}

const phpBin = findPhp();
if (!phpBin) {
  console.error('==================================================');
  console.error('ERROR: PHP was not found on your system.');
  console.error('Please install PHP (or XAMPP/Laragon) and add it to your PATH.');
  console.error('If you have XAMPP installed in a custom folder, please add it to your environment variables.');
  console.error('==================================================');
  process.exit(1);
}

console.log(`Starting PHP development server using: ${phpBin}`);
const server = spawn(phpBin, ['-S', '127.0.0.1:5000', 'server-php/index.php'], {
  shell: true
});

server.stdout.on('data', (data) => {
  const msg = data.toString();
  if (!msg.includes('Accepted') && !msg.includes('Closing')) {
    process.stdout.write(msg);
  }
});

server.stderr.on('data', (data) => {
  const msg = data.toString();
  if (!msg.includes('Accepted') && !msg.includes('Closing')) {
    process.stderr.write(msg);
  }
});

server.on('exit', (code) => {
  process.exit(code || 0);
});
