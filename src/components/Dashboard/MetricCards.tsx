'use client';

import React from 'react';
import { Users, GraduationCap, User, UserX } from 'lucide-react';
import { COLLEGE_METRICS } from '../../lib/mockDatabase';

export const MetricCards: React.FC = () => {
  const cards = [
    {
      id: 'staff',
      count: COLLEGE_METRICS.totalStaff,
      label: 'Total Staff',
      icon: Users,
      bgGradient: 'from-[#FFEBF0] to-[#FFF5F7]',
      border: 'border-[#FFD6DF]',
      textColor: 'text-[#FF4A70]',
      iconBg: 'bg-[#FF4A70]',
      shadow: 'shadow-pink-100/50',
    },
    {
      id: 'students',
      count: COLLEGE_METRICS.totalStudents,
      label: 'Total Students',
      icon: GraduationCap,
      bgGradient: 'from-[#EBF3FF] to-[#F5F8FF]',
      border: 'border-[#D1E4FF]',
      textColor: 'text-[#3E7BFA]',
      iconBg: 'bg-[#3E7BFA]',
      shadow: 'shadow-blue-100/50',
    },
    {
      id: 'boys',
      count: COLLEGE_METRICS.totalBoys,
      label: 'Total Boys',
      icon: User,
      bgGradient: 'from-[#FFF8EB] to-[#FFFAF2]',
      border: 'border-[#FFE6B8]',
      textColor: 'text-[#F5A623]',
      iconBg: 'bg-[#F5A623]',
      shadow: 'shadow-amber-100/50',
      badge: '♂',
    },
    {
      id: 'girls',
      count: COLLEGE_METRICS.totalGirls,
      label: 'Total Girls',
      icon: User,
      bgGradient: 'from-[#EBFBF3] to-[#F5FCF8]',
      border: 'border-[#C2F4DA]',
      textColor: 'text-[#10B981]',
      iconBg: 'bg-[#10B981]',
      shadow: 'shadow-emerald-100/50',
    },
    {
      id: 'not-specified',
      count: COLLEGE_METRICS.notSpecified,
      label: 'Not Specified',
      icon: UserX,
      bgGradient: 'from-[#FFEBEF] to-[#FFF5F7]',
      border: 'border-[#FFD1DA]',
      textColor: 'text-[#F43F5E]',
      iconBg: 'bg-[#F43F5E]',
      shadow: 'shadow-rose-100/50',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className={`relative rounded-3xl p-5 bg-gradient-to-b ${card.bgGradient} border ${card.border} shadow-sm ${card.shadow} transition-all duration-300 hover:-translate-y-1 hover:shadow-md flex items-center gap-4`}
          >
            {/* Left Icon Pill */}
            <div className={`w-12 h-12 rounded-2xl ${card.iconBg} flex items-center justify-center text-white shadow-xs`}>
              <Icon className="w-6 h-6" />
            </div>

            {/* Right Metric Details */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-2xl font-black tracking-tight text-gray-900">
                  {card.count}
                </span>
                {card.badge && (
                  <span className="text-xs text-amber-500 font-bold -mt-3">
                    {card.badge}
                  </span>
                )}
              </div>
              <span className={`text-xs font-semibold ${card.textColor}`}>
                {card.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
