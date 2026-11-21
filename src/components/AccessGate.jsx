import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function AccessGate({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pin.trim()) return;
    setLoading(true);
    setError('');

    // Default PIN: 170397 or backend verified
    if (pin.trim() === '170397') {
      try {
        localStorage.setItem('bold_engine_unlocked', 'true');
      } catch (_) {}
      setLoading(false);
      onUnlock();
      return;
    }

    // Check with backend API if custom password configured
    try {
      const res = await fetch(`/api/telegram-fuel?action=verify_pin&pin=${encodeURIComponent(pin.trim())}`);
      const data = await res.json();
      if (data.valid) {
        try {
          localStorage.setItem('bold_engine_unlocked', 'true');
        } catch (_) {}
        setLoading(false);
        onUnlock();
        return;
      }
    } catch (_) {}

    setLoading(false);
    setError('Incorrect PIN or password. Please try again.');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-3xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="w-full max-w-md p-8 rounded-3xl bg-white dark:bg-[#1c1c1e] text-neutral-900 dark:text-white shadow-2xl border border-black/10 dark:border-white/10 text-center relative overflow-hidden"
      >
        {/* Subtle accent glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center text-2xl shadow-inner">
          <Lock className="w-7 h-7" />
        </div>

        <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-rose-500 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20 inline-block mb-2">
          Private Engine Access
        </span>

        <h2 className="text-xl font-bold tracking-tight">Restricted Vault</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 mb-6 leading-relaxed">
          Closed athletic testing phase. Enter your access PIN or password to unlock.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="ENTER PIN OR PASSWORD"
              autoFocus
              className="w-full px-4 py-3.5 pr-12 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 text-center font-mono text-sm tracking-widest font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all uppercase"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-white"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{loading ? 'Verifying...' : 'Unlock Engine'}</span>
          </motion.button>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs text-rose-500 font-semibold"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </form>

        <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-400">
          Default Testing PIN: <b>170397</b>
        </div>
      </motion.div>
    </div>
  );
}
