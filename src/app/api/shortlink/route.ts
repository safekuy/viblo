// Shortlink API route — ONLY works in dev mode (npm run dev).
// In static export (GitHub Pages), this route doesn't exist (404) and
// the client falls back to direct API → PHP proxy.
//
// This route makes shortlinks work immediately in the preview panel
// without needing to upload twig_cors.php first.

// Kept in sync with src/lib/player/config.ts (production endpoints)
const SHORTLINK_API = "https://brightdailyhub.my.id/safe/twig_safe.php";
const SHORTLINK_DOMAIN = "https://twig.biz.id";

function generateCode(): string {
  return Math.random().toString(36).substring(2, 7);
}

async function apiRequest(
  api: string,
  action: string,
  body?: Record<string, unknown>
) {
  try {
    const res = await fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    });
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
    return await res.json();
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const targetUrl: string = body.url;
    if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
      return Response.json({ error: "Valid URL required" }, { status: 400 });
    }

    // Output domain, paired API endpoint + .mp4 option (mirror of the /gen
    // page switches). Defaults: twig.biz.id / twig_safe.php / WITH .mp4.
    const domain: string =
      typeof body.domain === "string" && body.domain.trim()
        ? body.domain.trim().replace(/\/+$/, "")
        : SHORTLINK_DOMAIN;
    // API endpoint paired with the selected output domain:
    //   twig.biz.id → twig_safe.php   |   lnkgo.biz.id → lnkgo_safe.php
    const api: string =
      typeof body.api === "string" && /^https?:\/\//i.test(body.api.trim())
        ? body.api.trim()
        : SHORTLINK_API;
    const useMp4: boolean = body.useMp4 !== false;
    const ext = useMp4 ? ".mp4" : "";

    // Generate unique code (up to 10 attempts)
    let code = "";
    for (let i = 0; i < 10; i++) {
      const candidate = generateCode();
      const check = await apiRequest(api, "is_code_unique", { code: candidate });
      if (check.success && check.data === true) {
        code = candidate;
        break;
      }
    }
    if (!code) {
      return Response.json({ error: "Failed to generate unique code" }, { status: 500 });
    }

    // Create the link
    const create = await apiRequest(api, "create_link", { code, url: targetUrl });
    if (!create.success || !create.data) {
      return Response.json({ error: create.error || "Failed to create" }, { status: 500 });
    }

    return Response.json({
      shortlink: `${domain}/${code}${ext}`,
      code,
      original: targetUrl,
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
