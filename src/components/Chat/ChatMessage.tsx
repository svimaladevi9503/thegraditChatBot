'use client';

import React from 'react';
import { ArrowRight, User, PlusCircle } from 'lucide-react';
import { ChatMessageResponse } from '../../lib/chatEngine';
import { AgentBadge } from './AgentBadge';
import { ExportAction } from './ExportAction';

export interface MessageItem {
  id: string;
  sender: 'user' | 'bot';
  content: string;
  response?: ChatMessageResponse;
  timestamp: string;
}

interface ChatMessageProps {
  message: MessageItem;
  onQuickAction?: (query: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onQuickAction }) => {
  const isUser = message.sender === 'user';

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}>
      <div
        className={`text-xs leading-relaxed max-w-[85%] ${
          isUser
            ? 'bg-[#EDE9FE] text-[#3B2896] px-3.5 py-2.5 rounded-2xl rounded-tr-xs shadow-2xs font-medium'
            : 'bg-white text-gray-800 px-4 py-3 rounded-2xl rounded-tl-xs border border-[#E8EEF5] shadow-2xs'
        }`}
      >
        {/* Resolved Student Entity Pill */}
        {!isUser && message.response?.resolvedStudent && (
          <div className="mb-2 px-2.5 py-1 bg-purple-50/90 border border-purple-200/70 rounded-lg text-[11px] text-purple-900 font-medium flex items-center justify-between gap-2">
            <span className="truncate flex items-center gap-1.5">
              <User className="w-3 h-3 text-purple-600" />
              <strong>{message.response.resolvedStudent.name}</strong>
            </span>
            <span className="text-[10px] text-purple-600 font-mono shrink-0 font-bold">
              {message.response.resolvedStudent.rollNumber}
            </span>
          </div>
        )}

        {/* Message Content with Markdown Linebreak Support */}
        <div className="whitespace-pre-line text-gray-800">
          {message.content}
        </div>

        {/* Agent Metadata Badge */}
        {!isUser && message.response && (
          <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between">
            <AgentBadge 
              agent={message.response.agent} 
              confidenceTier={message.response.confidenceTier} 
            />
          </div>
        )}

        {/* Document Export Action */}
        {!isUser && message.response?.exportPayload && (
          <div className="mt-2">
            <ExportAction 
              payload={message.response.exportPayload}
              format={message.response.exportFormat}
              agentType={message.response.agent}
            />
          </div>
        )}
      </div>

      {/* Timestamp */}
      <span className="text-[10px] text-gray-400 px-1 font-sans">
        {message.timestamp}
      </span>

      {/* Quick Action Suggestion Chips */}
      {!isUser && message.response?.quickActions && message.response.quickActions.length > 0 && onQuickAction && (
        <div className="mt-1 flex flex-wrap gap-1.5 max-w-[90%]">
          {message.response.quickActions.map((action, idx) => {
            const isShowMore = action.label.toLowerCase().includes('show more');
            return (
              <button
                key={idx}
                onClick={() => onQuickAction(action.query)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium border shadow-2xs transition-all active:scale-95 cursor-pointer ${
                  isShowMore
                    ? 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
                    : 'bg-white hover:bg-purple-50/70 text-gray-700 hover:text-purple-700 border-[#E8EEF5]'
                }`}
              >
                {isShowMore ? (
                  <PlusCircle className="w-3 h-3 text-purple-600" />
                ) : (
                  <User className="w-3 h-3 text-gray-400" />
                )}
                <span>{action.label}</span>
                <ArrowRight className="w-2.5 h-2.5 opacity-50" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
