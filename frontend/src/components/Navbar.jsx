import React, { useState, useEffect } from 'react';
import { Wind, Flame, ShieldAlert, HelpCircle, Menu, X, Clock, MessageSquare, BellRing } from 'lucide-react';
import NotificationBell from './NotificationBell';

function Navbar({ currentPage, setPage }) {
  const [time, setTime] = useState(new Date());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Wind },
    { id: 'smoke', label: 'Smoke Tracker', icon: Flame },
    { id: 'advice', label: 'Advice', icon: ShieldAlert },
    { id: 'alert-system', label: 'Alert System', icon: BellRing },
    { id: 'how-it-works', label: 'How It Works', icon: HelpCircle },
    { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  ];



  return (
    <nav className="sticky top-0 z-50 bg-[#0c1325]/90 backdrop-blur-md border-b border-gray-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center cursor-pointer" onClick={() => setPage('dashboard')}>
            <div className="p-2 bg-blue-600/20 rounded-lg text-blue-500 mr-2.5 animate-pulse">
              <Wind className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              AirSense Delhi
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setPage(item.id)}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-600/35'
                      : 'text-textSecondary hover:text-white hover:bg-gray-800/40'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Right Side Actions */}
          <div className="hidden lg:flex items-center space-x-4">
            <NotificationBell />
            <div className="flex items-center space-x-2 bg-gray-900/60 px-3.5 py-1.5 rounded-full border border-gray-800 text-xs text-textSecondary font-mono">
              <Clock className="h-3.5 w-3.5 text-blue-500 animate-spin-slow" style={{ animationDuration: '6s' }} />
              <span>{time.toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-textSecondary hover:text-white hover:bg-gray-800 focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-[#0a0f1e] border-b border-gray-800 animate-fadeIn">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setPage(item.id);
                    setIsOpen(false);
                  }}
                  className={`flex items-center w-full px-3 py-2.5 rounded-lg text-base font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-600/30'
                      : 'text-textSecondary hover:text-white hover:bg-gray-800/40'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.label}
                </button>
              );
            })}
            
            {/* Mobile Clock */}
            <div className="flex items-center justify-center space-x-2 pt-3 pb-1 text-xs text-textSecondary font-mono border-t border-gray-800">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>{time.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
