export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  // Disable all caching to ensure instant updates
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  function parseCSV(text) {
    const lines = [];
    let row = [];
    let inQuotes = false;
    let currentVal = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentVal += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(currentVal.trim());
        currentVal = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') i++;
        row.push(currentVal.trim());
        if (row.some(field => field.length > 0)) {
          lines.push(row);
        }
        row = [];
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    if (currentVal || row.length > 0) {
      row.push(currentVal.trim());
      lines.push(row);
    }
    return lines;
  }

  // Master Google Sheet CSV URL (Sheet2) - append cache buster timestamp
  const masterSheetId = process.env.GOOGLE_SHEET_ID || "1HmwPdXpSD-NHgFYLQCebiyL15OGoPA2jGnGWtt__CrA";
  const timestamp = Date.now();
  const sheetCsvUrl = `https://docs.google.com/spreadsheets/d/${masterSheetId}/gviz/tq?tqx=out:csv&sheet=Sheet2&t=${timestamp}`;

  const shoeMap = new Map();

  try {
    const sheetRes = await fetch(sheetCsvUrl, { cache: 'no-store' });
    if (sheetRes.ok) {
      const text = await sheetRes.text();
      const rows = parseCSV(text);

      if (rows.length > 0) {
        const headers = rows[0].map(h => h.toLowerCase().trim());
        
        // Dynamically find index of required columns
        let shoeNameIdx = headers.findIndex(h => h.includes('shoe name') || h.includes('shoe'));
        let dateIdx = headers.findIndex(h => h.includes('date'));
        let distanceIdx = headers.findIndex(h => h.includes('distance') || h.includes('km'));

        // Fallback to defaults if headers match failed
        if (shoeNameIdx === -1) shoeNameIdx = 0;
        if (dateIdx === -1) dateIdx = 1;
        if (distanceIdx === -1) distanceIdx = 2;

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row.length > Math.max(shoeNameIdx, distanceIdx)) {
            const rawName = row[shoeNameIdx] || '';
            const dateStr = row[dateIdx] || '';
            const distStr = row[distanceIdx] || '';

            if (rawName && distStr) {
              const cleanDist = parseFloat(distStr.replace(/[^0-9.]/g, ''));
              if (!isNaN(cleanDist) && cleanDist > 0) {
                const nameKey = rawName.trim();
                if (!shoeMap.has(nameKey)) {
                  shoeMap.set(nameKey, {
                    name: nameKey,
                    total_distance_km: 0,
                    latest_date: dateStr,
                    goal_km: 700,
                    entries_count: 0
                  });
                }
                const entry = shoeMap.get(nameKey);
                entry.total_distance_km += cleanDist;
                entry.entries_count += 1;
                // Update latest date string if valid
                if (dateStr) {
                  entry.latest_date = dateStr;
                }
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Google Sheet shoes fetch error:', err);
  }

  const shoesList = Array.from(shoeMap.values());

  // Fallback default if sheet has no shoes rows yet
  if (shoesList.length === 0) {
    shoesList.push({
      name: "Puma Deviate Nitro 3 Ekiden",
      total_distance_km: 87.2,
      latest_date: "Till Aug 14th 2026",
      goal_km: 700,
      entries_count: 1
    }, {
      name: "Asics GT-2000 13",
      total_distance_km: 0.0,
      latest_date: "Aug 17th 2026",
      goal_km: 700,
      entries_count: 1
    });
  }

  return res.status(200).json({
    success: true,
    source: "GoogleSheets",
    total_shoes: shoesList.length,
    shoes: shoesList
  });
}
