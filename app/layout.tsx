// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter, Cairo } from 'next/font/google';
import './globals.css';


const cairo = Cairo({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cairo',
});

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'لوحة تحكم المشفى',
  description: 'لوحة تحكم متكاملة لإدارة المستشفى والأطباء',
};



export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.variable} ${inter.variable} font-sans`}>
        
        {children}
      </body>
    </html>
  );
}