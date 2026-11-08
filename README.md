# XTUBS Player Pro v2.0

Full-screen video player with anti bom-click, anti bot, anti adblock, auto-pause (2x), and shortlink generator using your own `twinhd.biz.id` domain.

**Static site — deploys to GitHub Pages, Cloudflare Pages, or any static host.**

## Features

- **Anti Bom-Click** — Sliding-window rate limiter (3 clicks/sec + 800ms cooldown)
- **Anti Bot** — Detects WebDriver, headless Chrome, PhantomJS, automation markers
- **Anti Adblock** — Bait-div detection with warning overlay
- **Full-Screen Player** — 100vw × 100vh, responsive across PC/laptop/mobile
- **Auto-Pause (2x Max)** — Pauses at 30s and 60s, then plays to end
- **Continue Banner** — Opens Telegram/custom URL in new tab (no page navigation)
- **Floating Telegram Button** — Centered bottom, full-width on mobile
- **3 Shortlink Outputs** — Player URL, Landing Page URL, Smartlink (all shortlinked via twinhd.biz.id)
- **4-Button Landing Page** — Auto-rotated destinations, Videy.co-style design
- **CDN Source Detection** — Auto-detects Videy, Aceling, Slicedrive, Xfollow, Xfree, Twimg
- **referrerPolicy="no-referrer"** — Bypasses CDN cross-origin blocks

## Tech Stack

- Next.js 16 (App Router, **static export** — no server needed)
- TypeScript 5
- Tailwind CSS 4
- React 19

## Quick Start — GitHub Pages

### Step 1: Push to GitHub

1. Unzip this package
2. Create a new GitHub repo (e.g. `xtubs-player-pro`)
3. Push all files to the repo:
   ```bash
   cd xtubs-player-pro
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<username>/xtubs-player-pro.git
   git push -u origin main
   ```

### Step 2: Enable GitHub Pages

1. Go to your repo → **Settings** → **Pages**
2. Under **Build and deployment**:
   - Source: **GitHub Actions**
3. The workflow in `.github/workflows/deploy.yml` will automatically build and deploy on every push to `main`.
4. Your site will be live at `https://<username>.github.io/xtubs-player-pro/`

### Step 3: Add CORS to your twinhd_safe.php (REQUIRED for shortlinks)

Your `twinhd_safe.php` only allows CORS from `twinhd.biz.id`. To use shortlinks from `viblo.biz.id`, GitHub Pages, or any other domain, add these **4 lines** to the TOP of your `twinhd_safe.php` (right after `<?php`):

```php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
if ($_SERVER['REQUEST_METHOD']=='OPTIONS'){http_response_code(200);exit(0);}
```

That's it. Save the file. Shortlinks will now work from any domain.

> Without these 4 lines, shortlinks won't work — the browser blocks the API call.
> The player and landing page work regardless.

## Configuration

Edit `src/lib/player/config.ts` to change:

- `smartlink1`, `smartlink2` — Your smartlink URLs
- `continueUrl` — Telegram/custom URL for continue banner
- `facebookGroup` — Facebook group URL
- `pauseIntervalMs` — Auto-pause interval (default: 30000 = 30 seconds)
- `maxPauses` — Max auto-pause count (default: 2)
- `getpageTitle`, `getpageDescription`, `getpageFooter` — Landing page branding

## Shortlink API

The shortlink logic runs **client-side** (in the browser). It calls your twinhd.biz.id safelink API directly:
- **API endpoint**: `https://brightdailyhub.my.id/safe/twinhd_safe.php`
- **Domain**: `https://twinhd.biz.id`
- **Format**: `https://twinhd.biz.id/#<5-char-code>`

To use a different shortlink service, edit `createShortlink()` in `src/lib/player/utils.ts`.

## Routes (Hash Router)

- `/#/` — Home page
- `/#/gen` — Generator (2 shortlink outputs)
- `/#/v?id=<video-url>` — Video player
- `/#/get?id=<video-url>` — 4-button landing page

## Project Structure

```
src/
├── app/
│   ├── layout.tsx                # Root layout (dark theme, referrer policy)
│   ├── page.tsx                  # Hash router (loads App with ssr:false)
│   └── globals.css               # Global styles
├── components/
│   ├── player/
│   │   ├── App.tsx               # Hash router (home/gen/v/get)
│   │   ├── HomePage.tsx          # Landing page
│   │   ├── GeneratePage.tsx      # Generator with 3 shortlink outputs
│   │   ├── VideoPlayerPage.tsx   # Full-screen player with all anti features
│   │   └── GetPage.tsx           # 4-button landing page (Videy.co style)
│   └── ui/                       # shadcn/ui components
├── lib/
│   └── player/
│       ├── config.ts             # All configuration (edit this!)
│       └── utils.ts              # Encoding, anti-bot, anti-adblock, shortlink
.github/
└── workflows/
    └── deploy.yml                # GitHub Pages auto-deploy workflow
```

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`

> **Note**: Shortlink creation won't work from `localhost` because the twinhd API only allows CORS from `twinhd.biz.id`. Test shortlinks after deploying to GitHub Pages (with CORS setup above).

## Alternative Deployment (Cloudflare Pages)

1. Push to GitHub
2. Go to [pages.cloudflare.com](https://pages.cloudflare.com) → Create project → Connect to Git
3. Build command: `npm run build`
4. Output directory: `out`
5. Deploy

## License

Private — © 2026 XTUBS
