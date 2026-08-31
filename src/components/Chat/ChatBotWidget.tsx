'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Minus, 
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import { ChatMessageResponse } from '../../lib/chatEngine';
import { ChatMessage, MessageItem } from './ChatMessage';
import { ChatInput } from './ChatInput';

const SUGGESTIONS = [
  "Rahul's attendance",
  "Rahul's pending fee",
  "Overall attendance",
  "Total fees collected"
];

export const ChatBotWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<MessageItem[]>([]);
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

  // Global trigger listener (e.g. from TopNav AI button)
  useEffect(() => {
    const handleOpenChat = () => setIsOpen(true);
    window.addEventListener('open-gradit-chat', handleOpenChat);
    return () => window.removeEventListener('open-gradit-chat', handleOpenChat);
  }, []);

  const handleSendMessage = async (queryText: string) => {
    if (!queryText.trim() || isLoading) return;

    const userMessage: MessageItem = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: queryText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText }),
      });

      if (!res.ok) throw new Error('Network response not ok');

      const data: ChatMessageResponse = await res.json();

      const botMessage: MessageItem = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        content: data.text,
        response: data,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      const errorMessage: MessageItem = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        content: '⚠️ Unable to access student records right now.\n\nPlease try again in a moment.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        response: {
          success: false,
          text: '⚠️ Unable to access student records right now. Please try again in a moment.',
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
      {/* 🔴 PRIORITY 3 — Fixed Floating Launcher Button */}
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

      {/* 🔴 PRIORITY 4 — Fixed Floating Chat Window (380px x 560px) */}
      {isOpen && (
        <div
          role="dialog"
          aria-labelledby="chatbot-title"
          className="fixed z-[9999] bottom-[92px] right-6 w-[calc(100vw-24px)] sm:w-[380px] max-w-[calc(100vw-24px)] sm:max-w-[calc(100vw-48px)] h-[calc(100vh-110px)] sm:h-[560px] max-h-[calc(100vh-110px)] sm:max-h-[calc(100vh-120px)] rounded-[20px] border border-[#E8EEF5] bg-white shadow-[0_12px_32px_rgba(31,38,135,0.12),0_4px_12px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col font-sans animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Fixed Header */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-[#9C8EF7] to-[#7B61FF] text-white flex items-center justify-between shadow-xs select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shadow-2xs">
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

          {/* Scrollable Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto bg-[#F8FAFC] space-y-3.5">
            {/* Empty State (Shown when no conversation yet) */}
            {messages.length === 0 && (
              <div className="flex flex-col space-y-4 pt-1">
                <div className="bg-white rounded-2xl p-4 border border-[#E8EEF5] shadow-2xs text-xs text-gray-700 leading-relaxed space-y-2.5">
                  <p className="font-bold text-gray-900 text-[13px] flex items-center gap-1.5">
                    <span>👋</span> Hi! I&apos;m your GRADit Assistant.
                  </p>
                  <p className="text-gray-600">
                    I can help you find:
                  </p>
                  <ul className="space-y-1.5 pl-1 text-gray-600">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7B61FF]" />
                      <span>Student information</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7B61FF]" />
                      <span>Attendance details</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7B61FF]" />
                      <span>Fee status</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7B61FF]" />
                      <span>Overall attendance reports</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7B61FF]" />
                      <span>Fee collection summaries</span>
                    </li>
                  </ul>
                </div>

                {/* Clickable Quick Suggestion Chips */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-1">
                    Quick Questions
                  </span>
                  <div className="grid grid-cols-1 gap-1.5">
                    {SUGGESTIONS.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(suggestion)}
                        className="w-full text-left px-3.5 py-2.5 bg-white hover:bg-purple-50/70 border border-[#E8EEF5] hover:border-purple-200 rounded-xl text-xs font-medium text-gray-800 hover:text-purple-700 shadow-2xs transition-all flex items-center justify-between group active:scale-[0.98] cursor-pointer"
                      >
                        <span>{suggestion}</span>
                        <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-[#7B61FF] transition-transform group-hover:translate-x-0.5" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Conversation Messages */}
            {messages.map((msg) => (
              <ChatMessage 
                key={msg.id} 
                message={msg} 
                onQuickAction={(q) => handleSendMessage(q)} 
              />
            ))}

            {/* Loading Indicator State */}
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-gray-500 pl-1 animate-in fade-in duration-150">
                <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-[#7B61FF] animate-spin" />
                </div>
                <div className="bg-white px-3 py-2 rounded-xl border border-[#E8EEF5] shadow-2xs flex items-center gap-2">
                  <span className="text-[11px] text-gray-500 font-medium">GRADit Assistant is checking...</span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7B61FF] animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7B61FF] animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7B61FF] animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Fixed Input Area */}
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
      )}
    </>
  );
};
