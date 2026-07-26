export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  const { url } = req.query;

  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: 'Missing or invalid URL query parameter' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const html = await response.text();

    // 1. Extract Event Title / Name
    let eventName = '';
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
    eventName = eventName.replace(/India\s*Running|BookMyShow|District|NovaRace/gi, '').trim();
    if (!eventName) eventName = 'New Event Registration';

    // 2. Extract City
    let city = 'Bengaluru';
    const lowerHtml = html.toLowerCase();
    if (lowerHtml.includes('bengaluru') || lowerHtml.includes('bangalore')) city = 'Bengaluru';
    else if (lowerHtml.includes('delhi') || lowerHtml.includes('noida') || lowerHtml.includes('gurugram')) city = 'Delhi';
    else if (lowerHtml.includes('goa')) city = 'Goa';
    else if (lowerHtml.includes('chennai')) city = 'Chennai';
    else if (lowerHtml.includes('hyderabad')) city = 'Hyderabad';
    else if (lowerHtml.includes('mumbai')) city = 'Mumbai';

    // 3. Extract Sport Category
    let sport = 'Running';
    if (lowerHtml.includes('cycl') || lowerHtml.includes('bike')) sport = 'Cycling';
    else if (lowerHtml.includes('hyrox') || lowerHtml.includes('fitness challenge') || lowerHtml.includes('crossfit')) sport = 'Hyrox';

    // 4. Extract Location
    let location = city;
    const locMatch = html.match(/(stadium|park|ground|road|plaza|complex|centre|center|ecr|hospitals|school|college)[^,<.]{2,30}/i);
    if (locMatch) {
      location = locMatch[0].trim();
    }

    // 5. Extract Event Date
    let date = 'TBD 2026';
    const dateMatch = html.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(st|nd|rd|th)?,\s*20\d{2}/i) ||
                      html.match(/\d{1,2}(st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+20\d{2}/i);
    if (dateMatch) {
      date = dateMatch[0].trim();
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
