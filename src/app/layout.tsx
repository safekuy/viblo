import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "XTUBS Player Pro — Video Player & Generator",
  description:
    "Full-screen video player with anti bom-click, anti bot, anti adblock, auto-pause with continue banner. Generator outputs player URL and 4-button landing page with auto-rotate.",
  keywords: [
    "xtubs",
    "video player",
    "anti bot",
    "anti adblock",
    "anti bom click",
    "auto pause",
    "video generator",
  ],
  authors: [{ name: "XTUBS" }],
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0f1a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://cdn.videy.co" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn2.videy.co" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.aceimg.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://video.twimg.com" crossOrigin="anonymous" />
      </head>
      <body
        className="bg-[#0b0f1a] text-slate-200 antialiased"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
