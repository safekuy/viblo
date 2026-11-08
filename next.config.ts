import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export — generates pure HTML/CSS/JS for GitHub Pages, Cloudflare Pages, etc.
  output: "export",
  reactStrictMode: false,
  // Disable image optimization (not supported in static export)
  images: { unoptimized: true },
  // Hide the Next.js dev tools overlay (segment explorer, issue badges, etc.)
  devIndicators: false,
};

export default nextConfig;
