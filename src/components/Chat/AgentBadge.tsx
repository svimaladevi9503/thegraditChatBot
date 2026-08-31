'use client';

import React from 'react';
import { AgentType } from '../../lib/chatEngine';

interface AgentBadgeProps {
  agent: AgentType;
  confidenceTier?: 'TIER_1_REGEX' | 'TIER_2_FUZZY' | 'TIER_3_FALLBACK';
}

export const AgentBadge: React.FC<AgentBadgeProps> = ({ agent, confidenceTier }) => {
  const getBadgeConfig = () => {
    switch (agent) {
      case 'FEE':
        return {
          label: 'Fee Agent',
          bgColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dotColor: 'bg-emerald-500',
          icon: '💳'
        };
      case 'ATTENDANCE':
        return {
          label: 'Attendance Agent',
          bgColor: 'bg-blue-50 text-blue-700 border-blue-200',
          dotColor: 'bg-blue-500',
          icon: '📋'
        };
      case 'MISC':
        return {
          label: 'Master Agent',
          bgColor: 'bg-amber-50 text-amber-700 border-amber-200',
          dotColor: 'bg-amber-500',
          icon: '🏛️'
        };
      default:
        return {
          label: 'Orchestrator',
          bgColor: 'bg-purple-50 text-purple-700 border-purple-200',
          dotColor: 'bg-purple-500',
          icon: '⚡'
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${config.bgColor}`}>
        <span>{config.icon}</span>
        <span>{config.label}</span>
      </span>
      {confidenceTier && (
        <span className="text-[9px] text-gray-400 font-mono tracking-tight">
          [{confidenceTier === 'TIER_1_REGEX' ? 'L1: Regex' : confidenceTier === 'TIER_2_FUZZY' ? 'L2: Fuzzy' : 'L3: Fallback'}]
        </span>
      )}
    </div>
  );
};

export default AgentBadge;

