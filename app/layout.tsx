import type { Metadata, Viewport } from "next";
import { Fraunces, Public_Sans } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--fraunces",
  weight: ["600", "700"],
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--public-sans",
});

export const metadata: Metadata = {
  title: "Study Group Attendance",
  description: "Scan the day's code to mark your attendance.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${publicSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
