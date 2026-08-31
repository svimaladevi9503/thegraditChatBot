'use client';

import React, { useState } from 'react';
import { TopNav } from '@/components/Dashboard/TopNav';
import { Sidebar } from '@/components/Dashboard/Sidebar';
import { MetricCards } from '@/components/Dashboard/MetricCards';
import { CoursesChart } from '@/components/Dashboard/CoursesChart';
import { PartnersCard } from '@/components/Dashboard/PartnersCard';
import { ChatBotWidget } from '@/components/Chat/ChatBotWidget';
import { Sparkles, MessageSquare } from 'lucide-react';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F6FB] overflow-x-hidden">
      {/* Top Application Header */}
      <TopNav onOpenChat={() => setIsChatOpen(true)} chatOpen={isChatOpen} />

      {/* Main Layout Body */}
      <div className="flex-1 flex">
        {/* Left Navigation Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Dashboard Main View Area */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6 max-w-[1600px]">
          {/* Top Metric Cards */}
          <MetricCards />

          {/* Middle Analytics & Partners Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* Courses Overview Bar Chart (2 columns on desktop) */}
            <div className="lg:col-span-2">
              <CoursesChart />
            </div>

            {/* Featured Partners & Placements (1 column on desktop) */}
            <div className="lg:col-span-1">
              <PartnersCard />
            </div>
          </div>
        </main>
      </div>

      {/* Floating Action Button for AI Assistant if closed */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-[#7352FF] to-[#5E3EE3] hover:from-[#5E3EE3] hover:to-[#4C2ECC] text-white px-5 py-3.5 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2.5 font-sans font-bold text-xs active:scale-95 group"
        >
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          <span>Ask Gemini</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </button>
      )}

      {/* Multi-Agent Chat Widget Drawer */}
      <ChatBotWidget isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}
