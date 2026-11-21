import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Droplet, Volume2, VolumeX, Plus, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function WaterPage() {
  const [waterMl, setWaterMl] = useState(3100);
  const targetMl = 4000;
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [pourNotice, setPourNotice] = useState('');

  const pct = Math.min(100, Math.round((waterMl / targetMl) * 100));

  const playDropSound = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (_) {}
  };

  const handlePour = (amount) => {
    setWaterMl(prev => Math.min(targetMl + 500, prev + amount));
    playDropSound();
    setPourNotice(`+${amount} ml added to today's hydration!`);
    setTimeout(() => setPourNotice(''), 3000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 max-w-4xl mx-auto"
    >
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-sky-500 bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/20 mb-2">
            <span>💧</span> 4,000 ML HYDRATION ENGINE
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            Hydro 4L Sanctuary
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Real-time daily fluid tracking synced with <code>@raviteja_water_bot</code> on Telegram.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-2 ${
              soundEnabled
                ? 'bg-sky-500/10 text-sky-500 border-sky-500/20'
                : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-400 border-neutral-200 dark:border-neutral-800'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{soundEnabled ? 'Sound ON' : 'Muted'}</span>
          </button>
        </div>
      </div>

      {/* Main Hydration Card with Fluid Sphere */}
      <div className="p-8 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
        
        {/* Animated Fluid Sphere */}
        <div className="relative w-44 h-44 rounded-full p-2 border-2 border-sky-500/20 flex items-center justify-center overflow-hidden flex-shrink-0 bg-sky-500/5 shadow-inner">
          {/* Wave fill */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-sky-600 via-sky-500 to-cyan-400 opacity-80"
            initial={{ height: 0 }}
            animate={{ height: `${pct}%` }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          />

          <div className="relative z-10 text-center">
            <span className="text-3xl font-extrabold font-mono text-white drop-shadow">
              {pct}%
            </span>
            <span className="text-xs text-white/90 font-mono block drop-shadow">
              {(waterMl / 1000).toFixed(1)} / 4.0L
            </span>
          </div>
        </div>

        {/* Status & Quick Pour Controls */}
        <div className="space-y-4 flex-1">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-500">Intracellular & Blood Plasma Hydration</span>
            <h2 className="text-3xl font-extrabold text-neutral-900 dark:text-white mt-1">
              {waterMl.toLocaleString()} ml <span className="text-sm font-normal text-neutral-400">/ 4,000 ml</span>
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {waterMl >= targetMl
                ? '🎉 4,000 ml target achieved! Full athletic fluid saturation.'
                : `${Math.max(0, targetMl - waterMl)} ml remaining to hit your daily endurance target.`}
            </p>
          </div>

          {/* Quick Add Pills */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => handlePour(250)}
              className="px-4 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-sky-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+250 ml (Glass)</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => handlePour(500)}
              className="px-4 py-2.5 rounded-2xl bg-neutral-100 dark:bg-neutral-900 hover:bg-sky-500/10 text-neutral-900 dark:text-white hover:text-sky-500 font-bold text-xs border border-neutral-200 dark:border-neutral-800 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+500 ml (Bottle)</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => handlePour(1000)}
              className="px-4 py-2.5 rounded-2xl bg-neutral-100 dark:bg-neutral-900 hover:bg-sky-500/10 text-neutral-900 dark:text-white hover:text-sky-500 font-bold text-xs border border-neutral-200 dark:border-neutral-800 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+1,000 ml (Flask)</span>
            </motion.button>
          </div>

          {pourNotice && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs font-semibold text-emerald-500"
            >
              {pourNotice}
            </motion.p>
          )}
        </div>
      </div>

      {/* Hydration Milestone Schedule */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm space-y-4">
        <h3 className="text-base font-bold text-neutral-900 dark:text-white">
          Daily Hydration Milestones
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
            <span className="text-[10px] font-mono text-neutral-400 block uppercase">Morning (Wake Up)</span>
            <span className="font-extrabold text-sm text-sky-500 mt-1 block">750 ml</span>
            <span className="text-[11px] text-emerald-500 font-medium mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Completed
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
            <span className="text-[10px] font-mono text-neutral-400 block uppercase">Pre & Mid Run</span>
            <span className="font-extrabold text-sm text-sky-500 mt-1 block">1,250 ml</span>
            <span className="text-[11px] text-emerald-500 font-medium mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Completed
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
            <span className="text-[10px] font-mono text-neutral-400 block uppercase">Afternoon Recharge</span>
            <span className="font-extrabold text-sm text-sky-500 mt-1 block">1,100 ml</span>
            <span className="text-[11px] text-emerald-500 font-medium mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Completed
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
            <span className="text-[10px] font-mono text-neutral-400 block uppercase">Evening / Dinner</span>
            <span className="font-extrabold text-sm text-neutral-900 dark:text-white mt-1 block">900 ml</span>
            <span className="text-[11px] text-neutral-400 font-medium mt-1 block">
              In progress
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
