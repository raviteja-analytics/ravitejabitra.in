import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Lock, Menu, X } from 'lucide-react';

export default function Navbar({ onLock }) {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { label: 'Registrations', path: '/links' },
    { label: 'About', path: '/#chapter' },
    { label: 'Hydro 4L', path: '/water', color: '#007aff' },
    { label: 'Fuel ⚡', path: '/nutrition', color: '#34c759' },
    { label: 'Engine', path: '/tracker' },
    { label: 'Connect', path: '/#connect' }
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 transition-colors duration-300 bg-white/80 dark:bg-[#000000]/80 backdrop-blur-2xl border-b border-black/[0.06] dark:border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Brand / Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <span className="font-extrabold text-lg tracking-tight text-neutral-900 dark:text-white transition-colors">
            Ravi<span className="text-rose-500">.</span>
          </span>
          <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-neutral-200/60 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-400 font-semibold">
            Athletic Journal
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                style={link.color ? { color: link.color } : {}}
                className={`text-xs font-semibold tracking-wide uppercase transition-colors relative py-1 ${
                  isActive
                    ? 'text-neutral-950 dark:text-white font-bold'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
                }`}
              >
                {link.label}
                {isActive && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-rose-500 rounded-full"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Action Controls: Theme Switcher + Lock */}
        <div className="flex items-center gap-3">
          
          {/* Theme Toggle Button */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            className="p-2 rounded-xl transition-colors bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 flex items-center gap-1.5 text-xs font-medium"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-neutral-700" />
                <span className="hidden sm:inline">Dark</span>
              </>
            )}
          </motion.button>

          {/* Discreet Lock Button */}
          {onLock && (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={onLock}
              title="Lock private health engines"
              className="p-2 rounded-xl text-neutral-500 hover:text-rose-500 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 transition-colors"
            >
              <Lock className="w-4 h-4" />
            </motion.button>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-black/95 backdrop-blur-2xl px-6 py-4 space-y-3"
          >
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className="block text-sm font-semibold tracking-wide uppercase py-2 text-neutral-700 dark:text-neutral-300 hover:text-rose-500"
              >
                {link.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
