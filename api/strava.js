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

    // 3. Fetch all activities from starting across pages (up to 1,000 activities)
    let allActivities = [];
    let page = 1;
    while (page <= 5) {
      const pageRes = await fetch(`https://www.strava.com/api/v3/athlete/activities?per_page=200&page=${page}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (!pageRes.ok) break;
      const pageData = await pageRes.json();
      if (!Array.isArray(pageData) || pageData.length === 0) break;
      allActivities.push(...pageData);
      if (pageData.length < 200) break; // Last page reached
      page++;
    }

    let stats = {};
    if (statsResponse.ok) {
      stats = await statsResponse.json();
    } else {
      console.error('Strava stats request failed:', await statsResponse.text());
    }

    let runs = [];
    let workouts = [];
    let allWorkouts = [];
    
    const runTypes = ['Run', 'TrailRun', 'VirtualRun'];
    const workoutTypes = ['WeightTraining', 'Workout', 'Crossfit', 'Elliptical'];

    runs = allActivities
      .filter(act => runTypes.includes(act.type) || runTypes.includes(act.sport_type))
      .slice(0, 3)
      .map(act => ({
        name: act.name,
        distance: act.distance,
        moving_time: act.moving_time,
        start_date: act.start_date,
        total_elevation_gain: act.total_elevation_gain
      }));

    allWorkouts = allActivities
      .filter(act => workoutTypes.includes(act.type) || workoutTypes.includes(act.sport_type));

    workouts = allWorkouts
      .slice(0, 10)
      .map(act => ({
        name: act.name,
        moving_time: act.moving_time,
        start_date: act.start_date,
        kudos_count: act.kudos_count || 0
      }));

    const totalWorkoutTime = allWorkouts.reduce((acc, curr) => acc + (curr.moving_time || 0), 0);

    return res.status(200).json({
      stats: {
        all_run_totals: stats.all_run_totals || { count: 0, distance: 0, moving_time: 0 },
        ytd_run_totals: stats.ytd_run_totals || { count: 0, distance: 0, moving_time: 0 }
      },
      recent_runs: runs,
      strength_stats: {
        total_sessions: allWorkouts.length,
        total_time_seconds: totalWorkoutTime
      },
      recent_workouts: workouts
    });

  } catch (error) {
    console.error('Serverless function error:', error);
    return res.status(500).json({ error: error.message });
  }
}
