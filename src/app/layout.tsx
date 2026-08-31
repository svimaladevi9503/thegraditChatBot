import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GRADit! - Technical Team College Dashboard & AI Assistant",
  description: "Enterprise multi-agent college management suite with zero-LLM-cost deterministic router chatbot for fees, attendance, and campus intelligence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#F4F6FB] min-h-screen">
        {children}
      </body>
    </html>
  );
}
