export default async function handler(req, res) {
  // Set CORS headers for security/access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  const client_id = process.env.STRAVA_CLIENT_ID;
  const client_secret = process.env.STRAVA_CLIENT_SECRET;
  const refresh_token = process.env.STRAVA_REFRESH_TOKEN;
  const athlete_id = '204295405';

  if (!client_id || !client_secret || !refresh_token) {
    return res.status(500).json({ error: 'Missing Strava environment variables on Vercel.' });
  }

  try {
    // 1. Get fresh access token from Strava using the refresh token
    const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id,
        client_secret,
        refresh_token,
        grant_type: 'refresh_token'
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      return res.status(tokenResponse.status).json({ error: `Failed to refresh token: ${errorText}` });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch athlete stats (all-time totals)
    const statsResponse = await fetch(`https://www.strava.com/api/v3/athletes/${athlete_id}/stats`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    // 3. Fetch recent activities (pull 10 to filter for runs)
    const activitiesResponse = await fetch(`https://www.strava.com/api/v3/athlete/activities?per_page=15`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    let stats = {};
    if (statsResponse.ok) {
      stats = await statsResponse.json();
    } else {
      console.error('Strava stats request failed:', await statsResponse.text());
    }

    let activities = [];
    if (activitiesResponse.ok) {
      const allActivities = await activitiesResponse.json();
      // Filter strictly for Running activities (Run, TrailRun, VirtualRun)
      const runTypes = ['Run', 'TrailRun', 'VirtualRun'];
      activities = allActivities
        .filter(act => runTypes.includes(act.type) || runTypes.includes(act.sport_type))
        .slice(0, 3)
        .map(act => ({
          name: act.name,
          distance: act.distance, // in meters
          moving_time: act.moving_time, // in seconds
          start_date: act.start_date,
          total_elevation_gain: act.total_elevation_gain
        }));
    } else {
      console.error('Strava activities request failed:', await activitiesResponse.text());
    }

    // Return aggregated clean stats to the frontend
    return res.status(200).json({
      stats: {
        all_run_totals: stats.all_run_totals || { count: 0, distance: 0, moving_time: 0 },
        ytd_run_totals: stats.ytd_run_totals || { count: 0, distance: 0, moving_time: 0 }
      },
      recent_runs: activities
    });

  } catch (error) {
    console.error('Serverless function error:', error);
    return res.status(500).json({ error: error.message });
  }
}
