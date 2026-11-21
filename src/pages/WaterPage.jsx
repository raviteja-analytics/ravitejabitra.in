import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Droplet, Volume2, VolumeX, Plus, RefreshCw, CheckCircle2, History, Calendar } from 'lucide-react';

export default function WaterPage() {
  const [waterMl, setWaterMl] = useState(0);
  const [targetMl, setTargetMl] = useState(4000);
  const [logs, setLogs] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [pourNotice, setPourNotice] = useState('');

  const pct = Math.min(100, Math.round((waterMl / (targetMl || 4000)) * 100));

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

  const fetchWater = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/water-data');
      if (res.ok) {
        const json = await res.json();
        setWaterMl(Number(json.todayTotal) || 0);
        setTargetMl(Number(json.goal) || 4000);
        setLogs(json.todayLogs || []);
        setHistory(json.dayWiseHistory || []);
      }
    } catch (err) {
      console.error("Failed to load water data:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchWater();
  }, []);

  const handlePour = (amount) => {
    setWaterMl(prev => Math.min(targetMl + 500, prev + amount));
    playDropSound();
    setPourNotice(`+${amount} ml added locally! Log permanently via @raviteja_water_bot on Telegram.`);
    setTimeout(() => setPourNotice(''), 4000);
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

          <button
            onClick={fetchWater}
            disabled={loading}
            className="p-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-500' : ''}`} />
            <span>{loading ? 'Syncing...' : 'Sync'}</span>
          </button>
        </div>
      </div>

      {pourNotice && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-mono font-bold flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{pourNotice}</span>
        </motion.div>
      )}

      {/* ── 1. MAIN HYDRATION BOWL ─────────────────────────────────── */}
      <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm flex flex-col items-center justify-center text-center space-y-8">
        
        {/* Circular Fluid Gauge */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full p-2 bg-neutral-100 dark:bg-neutral-900 border-4 border-sky-500/20 shadow-inner flex items-center justify-center overflow-hidden">
          
          {/* Animated Wave Backdrop */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-sky-600 to-sky-400 transition-all duration-1000 ease-out opacity-80"
            style={{ height: `${pct}%` }}
          />

          {/* Central Telemetry */}
          <div className="relative z-10 flex flex-col items-center space-y-1">
            <Droplet className="w-8 h-8 text-white drop-shadow-md animate-pulse" />
            <h2 className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white drop-shadow">
              {waterMl.toLocaleString()}
            </h2>
            <span className="text-xs font-bold uppercase tracking-wider text-white/90 drop-shadow">
              of {targetMl.toLocaleString()} ml target
            </span>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-black/30 backdrop-blur-sm text-white mt-1">
              {pct}% Completed
            </span>
          </div>
        </div>

        {/* Quick Pour Action Pods */}
        <div className="space-y-3 w-full max-w-md">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
            Quick Log Hydration Sips
          </span>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handlePour(250)}
              className="py-3 px-4 rounded-2xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-500 border border-sky-500/20 font-bold font-mono text-sm transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>250 ml</span>
            </button>

            <button
              onClick={() => handlePour(500)}
              className="py-3 px-4 rounded-2xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-500 border border-sky-500/20 font-bold font-mono text-sm transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>500 ml</span>
            </button>

            <button
              onClick={() => handlePour(1000)}
              className="py-3 px-4 rounded-2xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-500 border border-sky-500/20 font-bold font-mono text-sm transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>1.0 L</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. TODAY'S SIPS TIMELINE ───────────────────────────────── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-sky-500" />
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Today's Hydration Sips (Logged via Telegram)
            </h3>
          </div>
          <span className="text-xs font-mono text-sky-500 font-bold">
            {logs.length} {logs.length === 1 ? 'sip' : 'sips'} recorded
          </span>
        </div>

        {logs.length === 0 ? (
          <div className="p-6 text-center text-neutral-400 text-sm">
            Waiting for your first sip today! Text <code>300 ml</code> to <code>@raviteja_water_bot</code> on Telegram.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {logs.map((log, idx) => (
              <div
                key={log.id || idx}
                className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
                    <Droplet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-neutral-900 dark:text-white">
                      +{log.amount} ml
                    </span>
                    <span className="text-xs text-neutral-400 font-mono block">
                      {log.time || 'Logged'}
                    </span>
                  </div>
                </div>

                <span className="text-xs font-mono font-bold text-sky-500 px-2 py-1 rounded-lg bg-sky-500/10">
                  Confirmed
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 3. WEEKLY HISTORY ───────────────────────────────────────── */}
      {history.length > 0 && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-neutral-100 dark:border-neutral-800">
            <Calendar className="w-4 h-4 text-purple-500" />
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Recent Hydration History
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {history.slice(0, 4).map((day) => (
              <div
                key={day.date}
                className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 text-center space-y-1"
              >
                <span className="text-xs font-mono text-neutral-400 uppercase block">{day.dayName}</span>
                <span className="text-lg font-black font-mono text-neutral-900 dark:text-white block">
                  {(day.total / 1000).toFixed(1)} L
                </span>
                <span className={`text-[11px] font-mono font-bold block ${day.metGoal ? 'text-emerald-500' : 'text-neutral-400'}`}>
                  {day.pct}% {day.metGoal ? '✓' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
