'use client';

import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { BarChart3, Radio } from 'lucide-react';
import { COURSES_DATA } from '../../lib/mockDatabase';

export const CoursesChart: React.FC = () => {
  const chartData = COURSES_DATA.map(course => ({
    name: course.name,
    shortName: course.name.length > 14 ? course.name.substring(0, 12) + '...' : course.name,
    students: course.studentsCount,
    color: course.color,
  }));

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100/90 shadow-sm flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 leading-tight">
              Courses Overview
            </h2>
            <p className="text-xs text-gray-400 font-medium">
              Student distribution across courses
            </p>
          </div>
        </div>

        {/* Live Indicator */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200/80 rounded-full text-emerald-600 text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Live</span>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 items-center">
        <div className="w-full lg:w-3/4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 65 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F2F5" />
              <XAxis 
                dataKey="shortName" 
                interval={0} 
                angle={-90} 
                textAnchor="end" 
                tick={{ fontSize: 10, fill: '#64748B', fontWeight: 500 }}
                height={80}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: '#94A3B8' }} 
                axisLine={false} 
                tickLine={false} 
              />
              <Tooltip 
                cursor={{ fill: '#F8FAFC' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-gray-900 text-white p-2.5 rounded-xl shadow-lg text-xs font-sans">
                        <p className="font-bold">{data.name}</p>
                        <p className="text-gray-300">Enrolled Students: <span className="font-bold text-white">{data.students}</span></p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="students" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend Right Side */}
        <div className="w-full lg:w-1/4 flex flex-col gap-2 pl-2 border-t lg:border-t-0 lg:border-l border-gray-100 max-h-72 overflow-y-auto">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Courses
          </span>
          {COURSES_DATA.map((course) => (
            <div key={course.id} className="flex items-center gap-2 text-xs">
              <span 
                className="w-3 h-3 rounded-md shrink-0" 
                style={{ backgroundColor: course.color }}
              />
              <span className="text-gray-700 font-medium truncate" title={course.name}>
                {course.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
