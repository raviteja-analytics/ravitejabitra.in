export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

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

  // Master Google Sheet CSV URL (Sheet2)
  const masterSheetId = process.env.GOOGLE_SHEET_ID || "1HmwPdXpSD-NHgFYLQCebiyL15OGoPA2jGnGWtt__CrA";
  const sheetCsvUrl = `https://docs.google.com/spreadsheets/d/${masterSheetId}/gviz/tq?tqx=out:csv&sheet=Sheet2`;

  const shoeMap = new Map();

  try {
    const sheetRes = await fetch(sheetCsvUrl);
    if (sheetRes.ok) {
      const text = await sheetRes.text();
      const rows = parseCSV(text);

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length >= 3) {
          const rawName = row[0] || '';
          const dateStr = row[1] || '';
          const distStr = row[2] || '';

          // Look for shoe name or distance values
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
              if (dateStr) entry.latest_date = dateStr;
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
    });
  }

  return res.status(200).json({
    success: true,
    source: "GoogleSheets",
    total_shoes: shoesList.length,
    shoes: shoesList
  });
}
