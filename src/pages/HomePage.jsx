import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Activity, Droplet, Flame, Trophy, MapPin, Briefcase } from 'lucide-react';

export default function HomePage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-12 max-w-4xl mx-auto"
    >
      {/* ── 1. HERO SECTION ────────────────────────────────────────── */}
      <section className="space-y-4 pt-4 sm:pt-8">
        <div className="flex items-center gap-2 text-xs font-mono font-semibold text-neutral-500 dark:text-neutral-400">
          <MapPin className="w-3.5 h-3.5 text-rose-500" />
          <span>12.9716° N, 77.5946° E • BENGALURU</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono font-bold tracking-wider uppercase text-neutral-600 dark:text-neutral-300">
          <span className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">IT Professional</span>
          <span>•</span>
          <span className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">Runner</span>
          <span>•</span>
          <span className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">Lifter</span>
          <span>•</span>
          <span className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">Explorer</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-neutral-900 dark:text-white leading-[1.08]">
          Hi, I'm Ravi <br />
          Teja <span className="text-rose-500">Bitra.</span>
        </h1>

        <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-300 max-w-2xl leading-relaxed">
          By day, I'm an IT professional. Outside work, I'm obsessed with seeing what this body and mind are capable of.
          Strength training. Long-distance running. Precision sports nutrition.
        </p>
      </section>

      {/* ── 2. QUICK ENGINE HUBS ─────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Hub 1: Fuel */}
        <Link to="/nutrition">
          <motion.div
            whileHover={{ y: -3 }}
            className="p-6 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm hover:shadow-md transition-all group space-y-3"
          >
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center text-lg">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center justify-between">
                <span>Fuel Engine</span>
                <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-rose-500 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Concentric Vitality Rings, protein recovery, and biological fuel tracking.
              </p>
            </div>
          </motion.div>
        </Link>

        {/* Hub 2: Hydro 4L */}
        <Link to="/water">
          <motion.div
            whileHover={{ y: -3 }}
            className="p-6 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm hover:shadow-md transition-all group space-y-3"
          >
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center text-lg">
              <Droplet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center justify-between">
                <span>Hydro 4L</span>
                <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-sky-500 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                4,000 ml water sanctuary with fluid wave animations and Telegram logging.
              </p>
            </div>
          </motion.div>
        </Link>

        {/* Hub 3: Engine */}
        <Link to="/tracker">
          <motion.div
            whileHover={{ y: -3 }}
            className="p-6 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm hover:shadow-md transition-all group space-y-3"
          >
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center text-lg">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center justify-between">
                <span>The Engine</span>
                <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Athletic budget, micronutrient supplement stack, and training metrics.
              </p>
            </div>
          </motion.div>
        </Link>
      </section>

      {/* ── 3. ATHLETIC JOURNEY ──────────────────────────────────────── */}
      <section className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Active Athletic Goals</h2>
        </div>
        <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
          Currently training for marathon distances (10 km to full 42.2 km), disciplined strength conditioning, and optimal 69 kg race weight maintenance. Powered by rigorous whole-food nutrition and daily hydration.
        </p>
      </section>
    </motion.div>
  );
}
