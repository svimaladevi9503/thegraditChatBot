'use client';

import React, { useState } from 'react';
import { TopNav } from '@/components/Dashboard/TopNav';
import { Sidebar } from '@/components/Dashboard/Sidebar';
import { MetricCards } from '@/components/Dashboard/MetricCards';
import { CoursesChart } from '@/components/Dashboard/CoursesChart';
import { PartnersCard } from '@/components/Dashboard/PartnersCard';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleOpenChat = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-gradit-chat'));
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F6FB] overflow-x-hidden">
      {/* Top Application Header */}
      <TopNav onOpenChat={handleOpenChat} />

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
    </div>
  );
}
