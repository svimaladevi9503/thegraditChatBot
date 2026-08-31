'use client';

import React from 'react';
import { Sparkles, Sun, Briefcase, Award, Zap } from 'lucide-react';

export const PartnersCard: React.FC = () => {
  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100/90 shadow-sm flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <h3 className="text-base font-bold text-gray-900 leading-tight">
            Featured Partners
          </h3>
        </div>
      </div>

      <p className="text-xs text-gray-400 font-medium -mt-2 mb-4">
        Exclusive institutional benefits
      </p>

      {/* Partner 1: Solar Power (As in updated screenshot) */}
      <div className="relative rounded-2xl p-5 bg-gradient-to-br from-amber-50/70 via-orange-50/50 to-purple-50/50 border border-amber-100/80 shadow-xs mb-4">
        <span className="absolute top-3 right-3 px-2 py-0.5 bg-white text-purple-600 rounded-full text-[10px] font-bold border border-purple-100 shadow-xs">
          New
        </span>

        <div className="flex items-start gap-3.5 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 shadow-xs">
            <Sun className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900">
              Power the Future, Today
            </h4>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              Solar Panels — turning rooftops into revenue. Clean energy that pays for itself, crafted by experts for years.
            </p>
          </div>
        </div>

        {/* Feature Badges */}
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/90 text-purple-700 rounded-lg text-[10px] font-bold border border-purple-100 shadow-xs">
            <Zap className="w-3 h-3 text-purple-600" /> 50+ MW Installed
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/90 text-purple-700 rounded-lg text-[10px] font-bold border border-purple-100 shadow-xs">
            <Award className="w-3 h-3 text-purple-600" /> 500+ Projects
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/90 text-purple-700 rounded-lg text-[10px] font-bold border border-purple-100 shadow-xs">
            7+ Years Exp
          </span>
        </div>
      </div>

      {/* Partner 2: Gradit Placements */}
      <div className="rounded-2xl p-5 bg-gradient-to-br from-purple-50/60 to-indigo-50/60 border border-purple-100/70 shadow-xs">
        <div className="flex items-start gap-3.5 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 shadow-xs">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900">
              Gradit Placements
            </h4>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              AI-driven placement management — streamline student profiles, recruiter connect and job matching.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <span className="px-2.5 py-1 bg-white/90 text-purple-700 rounded-lg text-[10px] font-bold border border-purple-100 shadow-xs">
            AI Resume
          </span>
          <span className="px-2.5 py-1 bg-white/90 text-purple-700 rounded-lg text-[10px] font-bold border border-purple-100 shadow-xs">
            Smart Data
          </span>
          <span className="px-2.5 py-1 bg-white/90 text-purple-700 rounded-lg text-[10px] font-bold border border-purple-100 shadow-xs">
            HR Portals
          </span>
          <span className="px-2.5 py-1 bg-white/90 text-purple-700 rounded-lg text-[10px] font-bold border border-purple-100 shadow-xs">
            Candidate Profiles
          </span>
        </div>
      </div>
    </div>
  );
};
