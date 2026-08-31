import type { Metadata } from "next";
import "./globals.css";
import { ChatBotWidget } from "@/components/Chat/ChatBotWidget";

export const metadata: Metadata = {
  title: "GRADit! - Technical Team College Dashboard & AI Assistant",
  description: "Enterprise college management suite with zero-LLM-cost deterministic router chatbot for fees, attendance, and campus intelligence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#F4F6FB] min-h-screen relative">
        {/* Main Application Pages */}
        {children}

        {/* 🔴 Globally Mounted Floating ChatBot Widget */}
        <ChatBotWidget />
      </body>
    </html>
  );
}
