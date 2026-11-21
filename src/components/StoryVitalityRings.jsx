import React from 'react';
import { motion } from 'framer-motion';

export default function StoryVitalityRings({
  calories = { current: 751, target: 2250 },
  caloriesBurned = { current: 0, target: 500 },
  water = { current: 1.85, target: 4.0 },
  sleep = { current: 8.6, target: 8.0 },
  size = 160
}) {
  const strokeWidth = 9;
  const gap = 2.5;

  // 1. Calorie Intake (Outer - Red)
  const r1 = (size / 2) - (strokeWidth / 2);
  const circ1 = 2 * Math.PI * r1;
  const pct1 = Math.min(1, Math.max(0, calories.current / (calories.target || 1)));
  const offset1 = circ1 * (1 - pct1);

  // 2. Calories Burned (Middle-Outer - Orange)
  const r2 = r1 - strokeWidth - gap;
  const circ2 = 2 * Math.PI * r2;
  const pct2 = Math.min(1, Math.max(0, caloriesBurned.current / (caloriesBurned.target || 1)));
  const offset2 = circ2 * (1 - pct2);

  // 3. Water Intake (Middle-Inner - Blue/Cyan)
  const r3 = r2 - strokeWidth - gap;
  const circ3 = 2 * Math.PI * r3;
  const pct3 = Math.min(1, Math.max(0, water.current / (water.target || 1)));
  const offset3 = circ3 * (1 - pct3);

  // 4. Sleep Duration (Inner - Purple)
  const r4 = r3 - strokeWidth - gap;
  const circ4 = 2 * Math.PI * r4;
  const pct4 = Math.min(1, Math.max(0, sleep.current / (sleep.target || 1)));
  const offset4 = circ4 * (1 - pct4);

  const center = size / 2;

  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {/* Background Tracks */}
        <circle cx={center} cy={center} r={r1} stroke="#fa114f" strokeWidth={strokeWidth} strokeOpacity={0.18} fill="none" />
        <circle cx={center} cy={center} r={r2} stroke="#ff9500" strokeWidth={strokeWidth} strokeOpacity={0.18} fill="none" />
        <circle cx={center} cy={center} r={r3} stroke="#007aff" strokeWidth={strokeWidth} strokeOpacity={0.18} fill="none" />
        <circle cx={center} cy={center} r={r4} stroke="#af52de" strokeWidth={strokeWidth} strokeOpacity={0.18} fill="none" />

        {/* 1. Calorie Intake Ring */}
        <motion.circle
          cx={center}
          cy={center}
          r={r1}
          stroke="#fa114f"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circ1}
          initial={{ strokeDashoffset: circ1 }}
          animate={{ strokeDashoffset: offset1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* 2. Calories Burned Ring */}
        <motion.circle
          cx={center}
          cy={center}
          r={r2}
          stroke="#ff9500"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circ2}
          initial={{ strokeDashoffset: circ2 }}
          animate={{ strokeDashoffset: offset2 }}
          transition={{ duration: 1.3, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* 3. Water Intake Ring */}
        <motion.circle
          cx={center}
          cy={center}
          r={r3}
          stroke="#007aff"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circ3}
          initial={{ strokeDashoffset: circ3 }}
          animate={{ strokeDashoffset: offset3 }}
          transition={{ duration: 1.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* 4. Sleep Duration Ring */}
        <motion.circle
          cx={center}
          cy={center}
          r={r4}
          stroke="#af52de"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circ4}
          initial={{ strokeDashoffset: circ4 }}
          animate={{ strokeDashoffset: offset4 }}
          transition={{ duration: 1.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>

      {/* Center Runner Icon */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-xl select-none filter drop-shadow">🏃</span>
      </div>
    </div>
  );
}
