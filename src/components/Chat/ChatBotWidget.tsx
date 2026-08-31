'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Bot, 
  User, 
  FileText, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { ChatMessageResponse, AgentType } from '@/lib/chatEngine';
import { AgentBadge } from './AgentBadge';
import { ExportAction } from './ExportAction';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  content: string;
  response?: ChatMessageResponse;
  timestamp: string;
}

interface ChatBotWidgetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChatBotWidget: React.FC<ChatBotWidgetProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      content: `👋 **Welcome to Technical Team College AI Router!**\n\nI am your deterministic campus assistant. Ask me questions regarding student fees, class attendance, or campus statistics.`,
      timestamp: 'Just now',
      response: {
        text: '',
        agent: 'ORCHESTRATOR',
        confidenceTier: 'TIER_1_REGEX',
        quickActions: [
          { label: "Rahul's Attendance 2025-26", query: "What is Rahul's attendance for 2025-26?" },
          { label: "My Pending Fee (PDF)", query: "What is my pending fee in pdf?" },
          { label: "Class-Wise Attendance Sheet", query: "Export class wise attendance as excel" },
          { label: "College Fee Aggregate", query: "Total fees collected this semester" }
        ]
      }
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: textToSend }),
      });

      if (!res.ok) throw new Error('Network error');

      const data: ChatMessageResponse = await res.json();

      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        content: data.text,
        response: data,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      const errorMessage: Message = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        content: '⚠️ Failed to connect to the agent service. Please retry.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        response: {
          text: '',
          agent: 'ORCHESTRATOR',
          confidenceTier: 'TIER_3_FALLBACK',
          error: true,
        }
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] bg-white shadow-2xl border-l border-gray-100 flex flex-col transition-all duration-300 animate-in slide-in-from-right font-sans">
      {/* Drawer Header */}
      <div className="p-4 bg-gradient-to-r from-[#7352FF] via-[#8565FF] to-[#603DE3] text-white flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-xs">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight">GRADit! AI Assistant</h2>
              <span className="px-1.5 py-0.5 bg-emerald-400/30 text-emerald-100 border border-emerald-300/40 rounded-full text-[9px] font-bold">
                Zero-LLM Cost
              </span>
            </div>
            <p className="text-[11px] text-purple-100/90 font-medium">
              Deterministic 3-Tier Multi-Agent Router
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Chat Messages Body */}
      <div className="flex-1 p-4 overflow-y-auto bg-[#F8FAFC] space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-start gap-2.5 max-w-[90%]">
              {msg.sender === 'bot' && (
                <div className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-1 shadow-xs border border-purple-200/50">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`rounded-2xl p-4 text-xs leading-relaxed shadow-xs ${
                  msg.sender === 'user'
                    ? 'bg-[#7352FF] text-white rounded-br-xs'
                    : 'bg-white text-gray-800 border border-gray-100 rounded-bl-xs'
                }`}
              >
                {/* Resolved Student Entity Pill */}
                {msg.response?.resolvedStudent && (
                  <div className="mb-2 px-2.5 py-1 bg-purple-50 border border-purple-200/80 rounded-lg text-[11px] text-purple-900 font-medium flex items-center justify-between">
                    <span>
                      🎯 Resolved Student: <strong>{msg.response.resolvedStudent.name}</strong>
                    </span>
                    <span className="text-[10px] text-purple-600 font-mono">
                      {msg.response.resolvedStudent.rollNumber}
                    </span>
                  </div>
                )}

                {/* Formatted Markdown-like text display */}
                <div className="whitespace-pre-line">
                  {msg.content}
                </div>

                {/* Agent Identity & Tier Badge */}
                {msg.response && (
                  <AgentBadge 
                    agent={msg.response.agent} 
                    confidenceTier={msg.response.confidenceTier} 
                  />
                )}

                {/* Export Action Card if PDF/XLSX/DOCS requested */}
                {msg.response?.exportPayload && (
                  <ExportAction 
                    payload={msg.response.exportPayload}
                    format={msg.response.exportFormat}
                    agentType={msg.response.agent}
                  />
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="w-7 h-7 rounded-xl bg-gray-200 text-gray-700 flex items-center justify-center shrink-0 mt-1 shadow-xs">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>

            <span className="text-[10px] text-gray-400 mt-1 px-9">
              {msg.timestamp}
            </span>

            {/* Quick Action Chips attached to response */}
            {msg.response?.quickActions && msg.response.quickActions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 pl-9">
                {msg.response.quickActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(action.query)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-purple-50 text-gray-700 hover:text-purple-700 rounded-lg text-[11px] font-medium border border-gray-200/80 shadow-2xs transition-all active:scale-95"
                  >
                    <span>{action.label}</span>
                    <ArrowRight className="w-2.5 h-2.5 opacity-60" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-gray-500 pl-2">
            <div className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-white px-3 py-2 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-600 animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-purple-600 animate-bounce delay-100" />
              <span className="w-2 h-2 rounded-full bg-purple-600 animate-bounce delay-200" />
              <span className="text-[11px] text-gray-400 font-medium ml-1">Routing to Agent...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Drawer Input Footer */}
      <div className="p-3.5 bg-white border-t border-gray-100">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about Rahul's attendance, fees in pdf, etc..."
            className="flex-1 bg-gray-50 border border-gray-200/90 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50 shadow-xs"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-2.5 bg-[#7352FF] hover:bg-[#5E3EE3] text-white rounded-xl transition-all shadow-xs disabled:opacity-40 active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="text-[10px] text-gray-400 text-center mt-2">
          Deterministic 3-Tier Layer: Regex ➔ PostgreSQL pg_trgm ➔ Contextual Fallback
        </p>
      </div>
    </div>
  );
};
