import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import AccessGate from './components/AccessGate';
import HomePage from './pages/HomePage';
import FuelPage from './pages/FuelPage';
import WaterPage from './pages/WaterPage';
import TrackerPage from './pages/TrackerPage';

function ProtectedRoute({ unlocked, onUnlock, children }) {
  if (!unlocked) {
    return <AccessGate onUnlock={onUnlock} />;
  }
  return children;
}

export default function App() {
  const [unlocked, setUnlocked] = useState(() => {
    try {
      return localStorage.getItem('bold_engine_unlocked') === 'true';
    } catch (_) {
      return false;
    }
  });

  const handleUnlock = () => {
    try {
      localStorage.setItem('bold_engine_unlocked', 'true');
    } catch (_) {}
    setUnlocked(true);
  };

  const handleLock = () => {
    try {
      localStorage.removeItem('bold_engine_unlocked');
    } catch (_) {}
    setUnlocked(false);
  };

  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="min-h-screen transition-colors duration-300 bg-[#f2f2f7] dark:bg-[#000000] text-neutral-900 dark:text-neutral-100 flex flex-col font-sans">
          <Navbar onLock={unlocked ? handleLock : null} />

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-24 pb-16">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route
                path="/nutrition"
                element={
                  <ProtectedRoute unlocked={unlocked} onUnlock={handleUnlock}>
                    <FuelPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/water"
                element={
                  <ProtectedRoute unlocked={unlocked} onUnlock={handleUnlock}>
                    <WaterPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tracker"
                element={
                  <ProtectedRoute unlocked={unlocked} onUnlock={handleUnlock}>
                    <TrackerPage />
                  </ProtectedRoute>
                }
              />
              {/* Fallback to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}
