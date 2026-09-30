import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'E-Track — 大学生四六级与雅思英语学习平台',
  description: 'E 代表 English。E-Track 面向大学生，将四级、六级与雅思的练习、记录和复盘连接起来，为英语学习保驾护航。',
};

export const viewport: Viewport = {
  themeColor: '#faf7f2',
  colorScheme: 'light dark',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
