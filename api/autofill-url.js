export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  const { url } = req.query;

  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: 'Missing or invalid URL query parameter' });
  }

  try {
    let html = '';
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (response.ok) {
        html = await response.text();
      }
    } catch (e) {
      console.warn('Fetch error:', e);
    }

    // 1. Extract Event Title / Name
    let eventName = '';
    if (html) {
      const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                           html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
      if (ogTitleMatch && ogTitleMatch[1]) {
        eventName = ogTitleMatch[1].trim();
      } else {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          eventName = titleMatch[1].split('|')[0].split('-')[0].trim();
        }
      }
    }

    // Slug fallback if title is empty or generic
    eventName = (eventName || '').replace(/India\s*Running|BookMyShow|District|NovaRace/gi, '').trim();
    if (!eventName || eventName.toLowerCase() === 'india running') {
      const parts = url.split('/').filter(Boolean);
      const slug = parts[parts.length - 1] || '';
      const cleanSlug = slug.replace(/[-_]/g, ' ').replace(/\d{4,}/g, '').trim();
      eventName = cleanSlug.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    if (!eventName) eventName = 'New Event Registration';

    // 2. Extract City
    let city = 'Bengaluru';
    const combinedStr = (html + ' ' + url + ' ' + eventName).toLowerCase();
    if (combinedStr.includes('bengaluru') || combinedStr.includes('bangalore')) city = 'Bengaluru';
    else if (combinedStr.includes('delhi') || combinedStr.includes('noida') || combinedStr.includes('gurugram')) city = 'Delhi';
    else if (combinedStr.includes('goa')) city = 'Goa';
    else if (combinedStr.includes('chennai')) city = 'Chennai';
    else if (combinedStr.includes('hyderabad')) city = 'Hyderabad';
    else if (combinedStr.includes('mumbai') || combinedStr.includes('palmbeach')) city = 'Mumbai';

    // 3. Extract Sport Category
    let sport = 'Running';
    if (combinedStr.includes('cycl') || combinedStr.includes('bike')) sport = 'Cycling';
    else if (combinedStr.includes('hyrox') || combinedStr.includes('fitness challenge') || combinedStr.includes('crossfit')) sport = 'Hyrox';

    // 4. Extract Location
    let location = city;
    if (html) {
      const locMatch = html.match(/(stadium|park|ground|road|plaza|complex|centre|center|ecr|hospitals|school|college)[^,<.]{2,30}/i);
      if (locMatch) {
        location = locMatch[0].trim();
      }
    }

    // 5. Extract Event Date
    let date = 'September 27th 2026';
    if (html) {
      const dateMatch = html.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(st|nd|rd|th)?,\s*20\d{2}/i) ||
                        html.match(/\d{1,2}(st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+20\d{2}/i);
      if (dateMatch) {
        date = dateMatch[0].trim();
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        sport,
        name: eventName,
        url,
        location,
        date,
        lastDate: 'Registration Open',
        city
      }
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
