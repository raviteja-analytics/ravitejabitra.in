import React from 'react';
import { motion } from 'framer-motion';

export default function VitalityRings({
  calories = { current: 2140, target: 2800 },
  protein = { current: 123, target: 150 },
  water = { current: 3.1, target: 4.0 },
  size = 140
}) {
  const strokeWidth = 11;
  const gap = 3;

  // Calorie ring (outer)
  const r1 = (size / 2) - (strokeWidth / 2);
  const circ1 = 2 * Math.PI * r1;
  const pct1 = Math.min(1, Math.max(0, calories.current / (calories.target || 1)));
  const offset1 = circ1 * (1 - pct1);

  // Protein ring (middle)
  const r2 = r1 - strokeWidth - gap;
  const circ2 = 2 * Math.PI * r2;
  const pct2 = Math.min(1, Math.max(0, protein.current / (protein.target || 1)));
  const offset2 = circ2 * (1 - pct2);

  // Water ring (inner)
  const r3 = r2 - strokeWidth - gap;
  const circ3 = 2 * Math.PI * r3;
  const pct3 = Math.min(1, Math.max(0, water.current / (water.target || 1)));
  const offset3 = circ3 * (1 - pct3);

  const center = size / 2;

  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {/* Background Tracks */}
        <circle cx={center} cy={center} r={r1} stroke="#fa114f" strokeWidth={strokeWidth} strokeOpacity={0.18} fill="none" />
        <circle cx={center} cy={center} r={r2} stroke="#34c759" strokeWidth={strokeWidth} strokeOpacity={0.18} fill="none" />
        <circle cx={center} cy={center} r={r3} stroke="#007aff" strokeWidth={strokeWidth} strokeOpacity={0.18} fill="none" />

        {/* Animated Progress Arcs */}
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

        <motion.circle
          cx={center}
          cy={center}
          r={r2}
          stroke="#34c759"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circ2}
          initial={{ strokeDashoffset: circ2 }}
          animate={{ strokeDashoffset: offset2 }}
          transition={{ duration: 1.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        />

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
          transition={{ duration: 1.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>

      {/* Center Runner Icon */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-xl select-none filter drop-shadow">🏃</span>
      </div>
    </div>
  );
}
