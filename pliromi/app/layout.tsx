import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ChatWidgetLoader from "@/components/ChatWidgetLoader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pliromi - Store & Treasury Management",
  description: "Payment and treasury management powered by Open Wallet Standard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ChatWidgetLoader />
      </body>
    </html>
  );
}
