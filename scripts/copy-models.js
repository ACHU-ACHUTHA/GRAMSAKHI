const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'ml', 'models');
const destDir = path.join(__dirname, '..', 'api', 'models');

if (fs.existsSync(srcDir)) {
  fs.mkdirSync(destDir, { recursive: true });
  const files = fs.readdirSync(srcDir);
  files.forEach(file => {
    const srcFile = path.join(srcDir, file);
    const destFile = path.join(destDir, file);
    if (fs.statSync(srcFile).isFile()) {
      fs.copyFileSync(srcFile, destFile);
      console.log(`[copy-models] Copied ${file} -> api/models/`);
    }
  });
} else {
  console.log('[copy-models] ml/models directory does not exist, skipping.');
}
