'use client';

import React, { useState } from 'react';
import { 
  Scale, 
  Layers, 
  Network, 
  Contact, 
  Send, 
  Users, 
  Search, 
  ChevronRight, 
  ChevronLeft 
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Scale, hasChildren: false },
    { id: 'manage-master', label: 'Manage Master', icon: Layers, hasChildren: true },
    { id: 'allocations', label: 'Allocations', icon: Network, hasChildren: true },
    { id: 'id-card', label: 'ID Card Detail Generator', icon: Contact, hasChildren: true },
    { id: 'communication', label: 'Communication', icon: Send, hasChildren: true },
    { id: 'attendance', label: 'Attendance', icon: Users, hasChildren: true },
  ];

  return (
    <aside 
      className={`relative bg-[#F7F8FC] border-r border-gray-100/90 h-[calc(100vh-61px)] flex flex-col transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white shadow-xs border border-gray-100 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-indigo-600" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          {!collapsed && (
            <span className="font-extrabold tracking-widest text-sm text-gray-800 uppercase">
              SAVYASASY
            </span>
          )}
        </div>
      </div>

      {/* Admin Profile Card */}
      <div className="px-4 mb-4">
        <div className="bg-white rounded-2xl p-3 border border-gray-100/80 shadow-xs flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-amber-100 border-2 border-white shadow-xs overflow-hidden flex items-center justify-center">
              <img
                src="https://api.dicebear.com/7.x/bottts/svg?seed=tech"
                alt="Tech Admin"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-gray-900 leading-tight">tech</span>
              <span className="text-xs text-gray-400 font-medium">College Admin</span>
            </div>
          )}
        </div>
      </div>

      {/* Menu Search Input */}
      {!collapsed && (
        <div className="px-4 mb-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search menu..."
              className="w-full bg-white border border-gray-100/90 rounded-xl pl-9 pr-3 py-2 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50 shadow-xs"
            />
          </div>
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-[#9D84FF] text-white shadow-md shadow-purple-200'
                  : 'text-gray-600 hover:bg-white/80 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-1 rounded-lg ${isActive ? 'text-white' : 'text-gray-500'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                {!collapsed && <span>{item.label}</span>}
              </div>

              {!collapsed && item.hasChildren && (
                <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse Toggle Pill */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-purple-600 z-20"
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>
    </aside>
  );
};
