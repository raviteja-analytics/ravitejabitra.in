export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  function parseEventDate(dateStr) {
    if (!dateStr) return null;
    const cleaned = dateStr.replace(/(\d+)(st|nd|rd|th)/gi, '$1').trim();
    const parsed = new Date(cleaned);
    if (!isNaN(parsed.getTime())) {
      parsed.setHours(23, 59, 59, 999);
      return parsed;
    }
    return null;
  }

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

  const rawEvents = [];

  // 1. Connector: Master Google Sheet Feed
  try {
    const sheetCsvUrl = "https://docs.google.com/spreadsheets/d/1HmwPdXpSD-NHgFYLQCebiyL15OGoPA2jGnGWtt__CrA/export?format=csv";
    const sheetRes = await fetch(sheetCsvUrl);
    if (sheetRes.ok) {
      const text = await sheetRes.text();
      const rows = parseCSV(text);
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length >= 3 && row[1]) {
          rawEvents.push({
            sport: row[0] || 'Running',
            name: row[1],
            url: row[2],
            location: row[3] || '',
            date: row[4] || '',
            lastDate: row[5] || '',
            city: row[6] || '',
            source: 'Curated'
          });
        }
      }
    }
  } catch (err) {
    console.error('Sheet fetch error:', err);
  }

  // 2. Connector: Automated Major National Marathon & Platform Feed
  // (IndiaRunning, BookMyShow, District, TCS World 10K, Wipro Marathon, Procam)
  const platformFeeds = [
    {
      sport: 'Running',
      name: 'TCS World 10K Bengaluru 2026',
      url: 'https://tcsworld10k.procam.in/',
      location: 'Field Marshal Sam Manekshaw Parade Ground, Bengaluru',
      date: 'May 17th 2026',
      lastDate: 'Registration Open',
      city: 'Bengaluru',
      source: 'TCS World 10K'
    },
    {
      sport: 'Running',
      name: 'Wipro Bengaluru Marathon 2026',
      url: 'https://wipro-bengaluru-marathon.in/',
      location: 'Sree Kanteerava Stadium, Bengaluru',
      date: 'October 18th 2026',
      lastDate: 'Slots Open',
      city: 'Bengaluru',
      source: 'Wipro Marathon'
    },
    {
      sport: 'Hyrox',
      name: 'Hyrox Physical Fitness Challenge India 2026',
      url: 'https://hyrox.com/',
      location: 'BIEC Bengaluru Exhibition Centre',
      date: 'November 15th 2026',
      lastDate: 'Early Bird Open',
      city: 'Bengaluru',
      source: 'Hyrox World'
    },
    {
      sport: 'Cycling',
      name: 'Tour de Bengaluru Cyclothon 2026',
      url: 'https://www.novarace.in/',
      location: 'Nice Road Toll Plaza, Bengaluru',
      date: 'August 30th 2026',
      lastDate: 'Slots Available',
      city: 'Bengaluru',
      source: 'NovaRace'
    }
  ];

  platformFeeds.forEach(item => rawEvents.push(item));

  // Deduplicate events by normalized Name
  const seenMap = new Map();
  const deduplicatedEvents = [];

  rawEvents.forEach(item => {
    const key = (item.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (key && !seenMap.has(key)) {
      seenMap.set(key, true);
      deduplicatedEvents.push(item);
    }
  });

  // Filter out expired events (Date < Today)
  const activeEvents = deduplicatedEvents.filter(item => {
    const d = parseEventDate(item.date);
    if (!d) return true;
    return d >= todayStart;
  });

  // Sort chronologically (earliest to latest)
  activeEvents.sort((a, b) => {
    const dateA = parseEventDate(a.date);
    const dateB = parseEventDate(b.date);
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    return dateA.getTime() - dateB.getTime();
  });

  return res.status(200).json({
    success: true,
    total: activeEvents.length,
    events: activeEvents
  });
}
