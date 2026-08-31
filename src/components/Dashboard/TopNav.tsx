'use client';

import React from 'react';
import { Sparkles, LogOut, GraduationCap, ChevronDown } from 'lucide-react';

interface TopNavProps {
  onOpenChat?: () => void;
  chatOpen?: boolean;
}

export const TopNav: React.FC<TopNavProps> = ({ onOpenChat, chatOpen = false }) => {
  return (
    <header className="bg-white border-b border-gray-100/80 px-6 py-3 flex items-center justify-between shadow-sm sticky top-0 z-30">
      {/* Left side: Logo & College Name */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            {/* Mortarboard icon with GRADit! text */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-sm mr-1.5">
              <GraduationCap className="w-5 h-5 -rotate-12" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-gray-900 font-sans">
              GRAD<span className="text-red-500 italic">it!</span>
            </span>
          </div>
        </div>

        <div className="hidden md:block h-6 w-px bg-gray-200" />

        <h1 className="text-xl font-bold text-gray-800 tracking-tight">
          Technical Team College
        </h1>
      </div>

      {/* Right side: Sem Badge, Logout, and Ask Gemini Button */}
      <div className="flex items-center gap-3.5">
        {/* Current Sem Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50/80 border border-blue-200/80 rounded-xl text-blue-700 text-xs font-semibold shadow-xs">
          <span>Current Sem :</span>
          <span className="text-blue-600 font-bold">Odd</span>
        </div>

        {/* Logout Button */}
        <button className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-red-200/70 hover:bg-red-50/50 text-red-500 rounded-xl text-xs font-semibold transition-all shadow-xs active:scale-95">
          <span>Logout</span>
          <LogOut className="w-3.5 h-3.5" />
        </button>

        {/* Ask Gemini / AI Assistant Trigger */}
        <button
          onClick={onOpenChat}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 ${
            chatOpen
              ? 'bg-purple-600 text-white shadow-purple-200'
              : 'bg-gradient-to-r from-amber-100/90 via-orange-100/90 to-purple-100/90 hover:from-amber-200 hover:to-purple-200 text-gray-800 border border-amber-200/60 shadow-xs'
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
          <span>Ask Gemini</span>
        </button>

        {/* User avatar small */}
        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-purple-200 shadow-xs">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
            alt="Profile"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </header>
  );
};
