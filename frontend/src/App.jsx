import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import SmokeTracker from './pages/SmokeTracker';
import Advice from './pages/Advice';
import HowItWorks from './pages/HowItWorks';
import Feedback from './pages/Feedback';

function App() {
  const [page, setPage] = useState('dashboard');

  return (
    <div className="min-h-screen bg-darkBg text-textPrimary flex flex-col font-sans">
      <Navbar currentPage={page} setPage={setPage} />
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {page === 'dashboard' && <Dashboard />}
        {page === 'smoke' && <SmokeTracker />}
        {page === 'advice' && <Advice />}
        {page === 'how-it-works' && <HowItWorks />}
        {page === 'feedback' && <Feedback />}
      </main>
      <footer className="border-t border-gray-800 bg-[#070b16] py-6 text-center text-sm text-textSecondary">
        <p>© 2026 AirSense Delhi. Real-time Air Quality Forecasting & Stubble Burning Analysis.</p>
        <p className="mt-1 text-xs text-gray-600">CPCB / NASA FIRMS / Open-Meteo Integrated Systems.</p>
      </footer>
    </div>
  );
}

export default App;
