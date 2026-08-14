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
    let rides = [];
    let swims = [];
    let workouts = [];
    let allWorkouts = [];
    
    const runTypes = ['Run', 'TrailRun', 'VirtualRun'];
    const rideTypes = ['Ride', 'VirtualRide', 'EBikeRide', 'GravelRide', 'MountainBikeRide', 'Handcycle'];
    const swimTypes = ['Swim'];
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

    rides = allActivities
      .filter(act => rideTypes.includes(act.type) || rideTypes.includes(act.sport_type))
      .slice(0, 3)
      .map(act => ({
        name: act.name,
        distance: act.distance,
        moving_time: act.moving_time,
        start_date: act.start_date,
        total_elevation_gain: act.total_elevation_gain
      }));

    swims = allActivities
      .filter(act => swimTypes.includes(act.type) || swimTypes.includes(act.sport_type))
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

    // Compute Running Personal Records (PRs)
    const allRuns = allActivities.filter(act => runTypes.includes(act.type) || runTypes.includes(act.sport_type));
    let longestRunSecs = 0;
    let longestRunDist = 0;
    let best5kSecs = null;
    let best10kSecs = null;
    let bestHalfSecs = null;
    let bestMarathonSecs = null;

    allRuns.forEach(act => {
      const dist = act.distance || 0;
      const time = act.moving_time || 0;

      if (time > longestRunSecs) {
        longestRunSecs = time;
        longestRunDist = dist;
      }

      if (dist >= 4900) {
        const time5k = Math.round(time * (5000 / dist));
        if (best5kSecs === null || time5k < best5kSecs) best5kSecs = time5k;
      }
      if (dist >= 9800) {
        const time10k = Math.round(time * (10000 / dist));
        if (best10kSecs === null || time10k < best10kSecs) best10kSecs = time10k;
      }
      if (dist >= 20900) {
        const timeHalf = Math.round(time * (21097.5 / dist));
        if (bestHalfSecs === null || timeHalf < bestHalfSecs) bestHalfSecs = timeHalf;
      }
      if (dist >= 42000) {
        const timeMarathon = Math.round(time * (42195 / dist));
        if (bestMarathonSecs === null || timeMarathon < bestMarathonSecs) bestMarathonSecs = timeMarathon;
      }
    });

    // Calculate total running distance since July 8th, 2026 for Deviate Nitro 3 Ekiden Version
    const july8_2026 = new Date('2026-07-08T00:00:00Z');
    const runsSinceJuly8 = allActivities.filter(act => {
      const isRun = runTypes.includes(act.type) || runTypes.includes(act.sport_type);
      const actDate = new Date(act.start_date);
      return isRun && actDate >= july8_2026;
    });

    const deviateNitro3DistanceMeters = runsSinceJuly8.reduce((sum, act) => sum + (act.distance || 0), 0);
    const deviateNitro3Km = parseFloat((deviateNitro3DistanceMeters / 1000).toFixed(1));

    return res.status(200).json({
      stats: {
        all_run_totals: stats.all_run_totals || { count: 0, distance: 0, moving_time: 0 },
        ytd_run_totals: stats.ytd_run_totals || { count: 0, distance: 0, moving_time: 0 },
        all_ride_totals: stats.all_ride_totals || { count: 0, distance: 0, moving_time: 0 },
        ytd_ride_totals: stats.ytd_ride_totals || { count: 0, distance: 0, moving_time: 0 },
        all_swim_totals: stats.all_swim_totals || { count: 0, distance: 0, moving_time: 0 },
        ytd_swim_totals: stats.ytd_swim_totals || { count: 0, distance: 0, moving_time: 0 }
      },
      run_records: {
        longest_run_seconds: longestRunSecs,
        longest_run_distance: longestRunDist,
        best_5k_seconds: best5kSecs,
        best_10k_seconds: best10kSecs,
        best_half_seconds: bestHalfSecs,
        best_marathon_seconds: bestMarathonSecs
      },
      recent_runs: runs,
      recent_rides: rides,
      recent_swims: swims,
      strength_stats: {
        total_sessions: allWorkouts.length,
        total_time_seconds: totalWorkoutTime
      },
      shoes_stats: {
        deviate_nitro_3_distance_meters: deviateNitro3DistanceMeters,
        deviate_nitro_3_km: deviateNitro3Km,
        deviate_nitro_3_runs_count: runsSinceJuly8.length
      },
      recent_workouts: workouts
    });

  } catch (error) {
    console.error('Serverless function error:', error);
    return res.status(500).json({ error: error.message });
  }
}
