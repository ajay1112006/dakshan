import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dakshan AI - Conversational AI Assistant',
  description:
    'Intelligent conversational AI powered by Gemini. Ask questions, brainstorm, write code, and explore sustainable living with live AI guidance.',
  keywords: [
    'gemini ai',
    'conversational chatbot',
    'ai assistant',
    'waste management',
    'recycling chatbot',
    'dakshan AI',
  ],
  authors: [{ name: 'Dakshan AI Team' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#070c10',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
