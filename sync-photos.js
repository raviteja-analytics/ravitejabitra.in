const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const heicConvert = require('heic-convert');

const password = 'Riseabovehate#1817';

const googleDriveBase = 'G:\\My Drive';
const runSourceDir = path.join(googleDriveBase, 'Running');
const expSourceDir = path.join(googleDriveBase, 'Explorer');

const assetsBase = path.join(__dirname, 'assets', 'photos');
const runDestDir = path.join(assetsBase, 'running');
const expDestDir = path.join(assetsBase, 'explorer');

const photosHtmlPath = path.join(__dirname, 'photos.html');

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function processDirectory(sourceDir, destDir, webPathPrefix) {
  const list = [];
  if (!fs.existsSync(sourceDir)) {
    return list;
  }

  await ensureDir(destDir);
  const files = fs.readdirSync(sourceDir);

  for (const file of files) {
    const filePath = path.join(sourceDir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isFile()) {
      const ext = path.extname(file).toLowerCase();
      const baseName = path.basename(file, ext);
      
      // Target file name on the website
      let targetFileName = file;
      let targetPath = path.join(destDir, targetFileName);

      // Check if HEIC
      if (ext === '.heic') {
        targetFileName = baseName + '.jpg';
        targetPath = path.join(destDir, targetFileName);
        
        // Convert if not already converted
        if (!fs.existsSync(targetPath)) {
          console.log(`Converting ${file} to JPEG...`);
          try {
            const inputBuffer = fs.readFileSync(filePath);
            const outputBuffer = await heicConvert({
              buffer: inputBuffer,
              format: 'JPEG',
              quality: 0.85
            });
            fs.writeFileSync(targetPath, outputBuffer);
          } catch (e) {
            console.error(`Failed to convert ${file}:`, e.message);
            continue;
          }
        }
      } else if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
        // Copy normal images if not already in assets
        if (!fs.existsSync(targetPath)) {
          console.log(`Copying ${file} to assets...`);
          fs.copyFileSync(filePath, targetPath);
        }
      } else {
        // Skip non-image files
        continue;
      }

      // Add to list with formatted date from file metadata
      const mtime = stat.mtime;
      const dateString = mtime.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      list.push({
        url: `${webPathPrefix}/${targetFileName}`,
        caption: baseName.replace(/[-_]/g, ' '),
        date: dateString
      });
    }
  }
  return list;
}

async function run() {
  try {
    console.log("Scanning Google Drive folders...");
    
    const runningPhotos = await processDirectory(runSourceDir, runDestDir, 'assets/photos/running');
    const explorerPhotos = await processDirectory(expSourceDir, expDestDir, 'assets/photos/explorer');

    console.log(`Processed: ${runningPhotos.length} Running photos, ${explorerPhotos.length} Explorer photos.`);

    const processedData = {
      running: runningPhotos,
      explorer: explorerPhotos
    };

    // Fallback placeholder arrays if directories are empty
    if (processedData.running.length === 0) {
      processedData.running.push({
        url: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1200&q=80",
        caption: "Pacing the morning miles",
        date: "August 2026"
      });
    }
    if (processedData.explorer.length === 0) {
      processedData.explorer.push({
        url: "https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&w=1200&q=80",
        caption: "High altitude camp trails",
        date: "July 2026"
      });
    }

    const plaintext = JSON.stringify(processedData);

    // Generate random crypto values
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);

    // Encrypt data
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');

    const newConfig = {
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      ciphertext: ciphertext,
      tag: tag
    };

    // Update photos.html
    let html = fs.readFileSync(photosHtmlPath, 'utf8');
    
    const startMarker = '// AES-256-GCM Secure payload generated via node crypto';
    const startIndex = html.indexOf(startMarker);
    if (startIndex === -1) {
      throw new Error("Could not find crypto configuration markers in photos.html");
    }

    const configBlockStart = html.indexOf('const cryptoConfig = {', startIndex);
    const configBlockEnd = html.indexOf('};', configBlockStart);
    
    if (configBlockStart === -1 || configBlockEnd === -1) {
      throw new Error("Could not parse cryptoConfig block structure in photos.html");
    }

    const configString = `const cryptoConfig = {\n      salt: "${newConfig.salt}",\n      iv: "${newConfig.iv}",\n      ciphertext: "${newConfig.ciphertext}",\n      tag: "${newConfig.tag}"\n    `;
    
    const updatedHtml = html.substring(0, configBlockStart) + configString + html.substring(configBlockEnd);
    
    fs.writeFileSync(photosHtmlPath, updatedHtml, 'utf8');
    console.log("SUCCESS: Photos synchronized, HEIC converted, encrypted and saved to photos.html!");

  } catch (err) {
    console.error("ERROR:", err.message);
    process.exit(1);
  }
}

run();
