const fs = require('fs');
const path = require('path');

async function crawl() {
  console.log('Starting automated event crawler...');

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

  // 1. Google Sheet CSV Sync
  try {
    const sheetCsvUrl = "https://docs.google.com/spreadsheets/d/1HmwPdXpSD-NHgFYLQCebiyL15OGoPA2jGnGWtt__CrA/export?format=csv";
    const res = await fetch(sheetCsvUrl);
    if (res.ok) {
      const text = await res.text();
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
            source: 'Curated Feed'
          });
        }
      }
    }
  } catch (e) {
    console.error('Sheet fetch error:', e.message);
  }

  // 2. Multi-Platform Curated Crawler Stream (TCS 10K, Wipro Marathon, Hyrox, HCL Cyclothon)
  const platformStreams = [
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
    },
    {
      sport: 'Cycling',
      name: 'HCL Cyclothon Chennai Edition 2026',
      url: 'https://hclcyclothon.com/chennai-edition/',
      location: 'Mayajaal Multiplex, ECR, Chennai.',
      date: 'October 4th 2026',
      lastDate: 'Registrations yet to be open',
      city: 'Chennai',
      source: 'HCL Cyclothon'
    },
    {
      sport: 'Cycling',
      name: 'HCL Cyclothon Hyderabad Edition 2026',
      url: 'https://hclcyclothon.com/hyderabad-edition/',
      location: 'To be announced.',
      date: 'November 15th 2026',
      lastDate: 'Registrations yet to be open',
      city: 'Hyderabad',
      source: 'HCL Cyclothon'
    }
  ];

  platformStreams.forEach(p => rawEvents.push(p));

  // Deduplicate
  const seenMap = new Map();
  const deduplicatedEvents = [];

  rawEvents.forEach(item => {
    const key = (item.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (key && !seenMap.has(key)) {
      seenMap.set(key, true);
      deduplicatedEvents.push(item);
    }
  });

  const targetPath = path.join(__dirname, '..', 'data', 'events.json');
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, JSON.stringify(deduplicatedEvents, null, 2), 'utf8');

  console.log(`Successfully written ${deduplicatedEvents.length} events to data/events.json!`);
}

crawl();
