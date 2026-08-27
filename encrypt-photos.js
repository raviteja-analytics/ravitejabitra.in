const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const password = 'Riseabovehate#1817';

const rawDataPath = path.join(__dirname, 'photos-raw.json');
const photosHtmlPath = path.join(__dirname, 'photos.html');

try {
  // 1. Read the raw scraped JSON file
  const rawText = fs.readFileSync(rawDataPath, 'utf8');
  const rawItems = JSON.parse(rawText);
  
  const processedData = {
    running: [],
    explorer: []
  };

  // 2. Clean and classify links
  rawItems.forEach(item => {
    let url = item.url;
    
    // Extract raw Google Photos URL using regex
    const match = url.match(/(https?:\/\/[a-zA-Z0-9_\-]+\.googleusercontent\.com\/[a-zA-Z0-9_\-]+)/);
    if (match && match[1]) {
      const cleanUrl = match[1];
      
      // Exclude profile pics and utility icons (short tokens)
      if (!cleanUrl.includes('/ogw/') && !cleanUrl.includes('/photo.jpg') && cleanUrl.length > 150) {
        const finalUrl = cleanUrl + '=w1200';
        const date = item.date || 'Recent';
        
        // Simple heuristic classification:
        // We will classify this first photo as Explorer Log, user can rearrange later.
        processedData.explorer.push({
          url: finalUrl,
          caption: "Adventure Log",
          date: date
        });
      }
    }
  });

  // Seed default running photo if none exists yet, so the screen isn't empty
  if (processedData.running.length === 0) {
    processedData.running.push({
      url: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1200&q=80",
      caption: "Pacing the morning miles",
      date: "August 2026"
    });
  }

  const plaintext = JSON.stringify(processedData);

  // 3. Generate random crypto values
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);

  // 4. Encrypt data
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

  // 5. Update photos.html
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
  console.log("SUCCESS: Scraped photos successfully cleaned, categorized, encrypted, and written into photos.html!");
  
} catch (err) {
  console.error("ERROR running encryption:", err.message);
  process.exit(1);
}
