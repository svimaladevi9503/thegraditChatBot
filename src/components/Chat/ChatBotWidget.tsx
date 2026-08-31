'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Minus, 
  Send, 
  Bot, 
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import { ChatMessageResponse } from '../../lib/chatEngine';
import { AgentBadge } from './AgentBadge';
import { ExportAction } from './ExportAction';

export interface Message {
  id: string;
  sender: 'user' | 'bot';
  content: string;
  response?: ChatMessageResponse;
  timestamp: string;
}

const SUGGESTIONS = [
  "Rahul's attendance",
  "Show pending fees",
  "Overall attendance",
  "Fee collection summary"
];

export const ChatBotWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
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
  }, [messages, isOpen, isLoading]);

  // Listen for custom global event to open chat (e.g. from TopNav AI button)
  useEffect(() => {
    const handleOpenChat = () => setIsOpen(true);
    window.addEventListener('open-gradit-chat', handleOpenChat);
    return () => window.removeEventListener('open-gradit-chat', handleOpenChat);
  }, []);

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
        content: 'Unable to fetch the requested information.\n\nPlease try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        response: {
          text: 'Unable to fetch the requested information. Please try again.',
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

  return (
    <>
      {/* 🔴 Floating Chatbot Trigger Button (Fixed Bottom-Right) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open GRADit Assistant"
          className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full border border-white/20 shadow-[0_8px_24px_rgba(138,124,251,0.35),0_2px_6px_rgba(0,0,0,0.08)] bg-gradient-to-br from-[#9C8EF7] to-[#7B61FF] text-white flex items-center justify-center cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95 group focus:outline-none"
        >
          <MessageSquare className="w-6 h-6 text-white transition-transform group-hover:scale-110" />
          <span className="sr-only">Open Chat</span>
        </button>
      )}

      {/* 🔴 Floating Chat Window (Fixed 380px x 560px) */}
      {isOpen && (
        <div
          role="dialog"
          aria-labelledby="chatbot-title"
          className="fixed z-[9999] bottom-[92px] right-6 sm:right-6 w-[calc(100vw-24px)] sm:w-[380px] max-w-[calc(100vw-24px)] sm:max-w-[calc(100vw-48px)] h-[calc(100vh-110px)] sm:h-[560px] max-h-[calc(100vh-110px)] sm:max-h-[calc(100vh-120px)] rounded-[20px] border border-[#E8EEF5] bg-white shadow-[0_12px_32px_rgba(31,38,135,0.12),0_4px_12px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col font-sans animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Header */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-[#9C8EF7] to-[#7B61FF] text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shadow-xs">
                <Sparkles className="w-4 h-4 text-amber-200" />
              </div>
              <div className="flex flex-col">
                <h2 id="chatbot-title" className="text-sm font-bold tracking-tight text-white leading-tight">
                  GRADit Assistant
                </h2>
                <p className="text-[11px] text-purple-100 font-medium">
                  Student • Attendance • Fees
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Minimize Chat"
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
                title="Minimize"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close Chat"
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto bg-[#F8FAFC] space-y-3.5">
            {/* Empty State (When no conversation yet) */}
            {messages.length === 0 && (
              <div className="flex flex-col space-y-4 pt-2">
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs text-xs text-gray-700 leading-relaxed space-y-2.5">
                  <p className="font-bold text-gray-900 text-[13px] flex items-center gap-1.5">
                    <span>👋</span> Hi! I&apos;m your GRADit Assistant.
                  </p>
                  <p className="text-gray-600">
                    I can help you find:
                  </p>
                  <ul className="space-y-1 pl-1 text-gray-600">
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7B61FF]" />
                      <span>Student information</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7B61FF]" />
                      <span>Attendance details</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7B61FF]" />
                      <span>Fee status</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7B61FF]" />
                      <span>Overall attendance reports</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7B61FF]" />
                      <span>Pending fee summaries</span>
                    </li>
                  </ul>
                </div>

                {/* Clickable Suggestion Chips */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-1">
                    Quick Questions
                  </span>
                  <div className="grid grid-cols-1 gap-1.5">
                    {SUGGESTIONS.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(suggestion)}
                        className="w-full text-left px-3.5 py-2.5 bg-white hover:bg-purple-50/70 border border-gray-200/80 hover:border-purple-200 rounded-xl text-xs font-medium text-gray-800 hover:text-purple-700 shadow-2xs transition-all flex items-center justify-between group active:scale-[0.98]"
                      >
                        <span>{suggestion}</span>
                        <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-purple-600 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Render Messages */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-purple-100 text-purple-950 px-3.5 py-2.5 rounded-2xl rounded-tr-xs shadow-2xs font-medium'
                      : 'bg-white text-gray-800 px-4 py-3 rounded-2xl rounded-tl-xs border border-gray-100 shadow-2xs'
                  }`}
                >
                  {/* Resolved Student Entity Badge */}
                  {msg.response?.resolvedStudent && (
                    <div className="mb-2 px-2.5 py-1 bg-purple-50 border border-purple-200/70 rounded-lg text-[11px] text-purple-900 font-medium flex items-center justify-between gap-2">
                      <span className="truncate">
                        🎯 <strong>{msg.response.resolvedStudent.name}</strong>
                      </span>
                      <span className="text-[10px] text-purple-600 font-mono shrink-0">
                        {msg.response.resolvedStudent.rollNumber}
                      </span>
                    </div>
                  )}

                  {/* Message Content */}
                  <div className="whitespace-pre-line">
                    {msg.content}
                  </div>

                  {/* Agent Identity Badge */}
                  {msg.response && (
                    <div className="mt-2 pt-2 border-t border-gray-50">
                      <AgentBadge 
                        agent={msg.response.agent} 
                        confidenceTier={msg.response.confidenceTier} 
                      />
                    </div>
                  )}

                  {/* Export Action Card */}
                  {msg.response?.exportPayload && (
                    <div className="mt-2">
                      <ExportAction 
                        payload={msg.response.exportPayload}
                        format={msg.response.exportFormat}
                        agentType={msg.response.agent}
                      />
                    </div>
                  )}
                </div>

                <span className="text-[10px] text-gray-400 mt-1 px-1">
                  {msg.timestamp}
                </span>

                {/* Quick Actions (e.g. Disambiguation choices or follow-ups) */}
                {msg.response?.quickActions && msg.response.quickActions.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5 max-w-[90%]">
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

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-gray-500 pl-1">
                <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-white px-3 py-2 rounded-xl border border-gray-100 shadow-2xs flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7B61FF] animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7B61FF] animate-bounce delay-150" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7B61FF] animate-bounce delay-300" />
                  <span className="text-[11px] text-gray-400 font-medium ml-1">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input */}
          <div className="p-3 bg-white border-t border-gray-100">
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
                placeholder="Type your question..."
                className="flex-1 bg-gray-50 border border-gray-200/90 rounded-xl px-3 py-2.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50 shadow-2xs"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-3.5 py-2.5 bg-gradient-to-r from-[#9C8EF7] to-[#7B61FF] hover:opacity-95 text-white rounded-xl transition-all shadow-2xs disabled:opacity-40 active:scale-95 flex items-center gap-1 text-xs font-semibold"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
