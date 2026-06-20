// ============================================================
//  Mind That Piece — /api/chat.js
//  Secure Vercel Serverless Function
//  Browser → here → Anthropic API (key never reaches browser)
// ============================================================

export const config = {
  maxDuration: 30,
};

const ipWindows = new Map();

function checkRateLimit(key, isPro) {
  const now = Date.now();
  const WINDOW = 60_000;
  const MAX = isPro ? 60 : 10;
  const entry = ipWindows.get(key);
  if (!entry || now - entry.start > WINDOW) {
    ipWindows.set(key, { count: 1, start: now });
    return { limited: false, remaining: MAX - 1 };
  }
  if (entry.count >= MAX) {
    return { limited: true, resetIn: Math.ceil((WINDOW - (now - entry.start)) / 1000) };
  }
  entry.count++;
  return { limited: false, remaining: MAX - entry.count };
}

function validateRequest(body) {
  if (!body || typeof body !== "object") return "Invalid request body";
  if (!Array.isArray(body.messages) || body.messages.length === 0) return "messages must be a non-empty array";
  if (body.messages.length > 60) return "Too many messages (max 60)";
  for (const [i, msg] of body.messages.entries()) {
    if (!["user", "assistant"].includes(msg.role)) return `Invalid role at message ${i}`;
    if (typeof msg.content !== "string") return `Message ${i} content must be string`;
    if (msg.content.length > 12000) return `Message ${i} too long`;
  }
  if (body.system && typeof body.system !== "string") return "system must be a string";
  return null;
}

export default async function handler(req, res) {
  // Security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // CORS
  const origin = process.env.ALLOWED_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-User-Id, X-Pro-User");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // API key check
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY not set");
    return res.status(500).json({ error: "Server configuration error. Contact support." });
  }

  // Rate limit
  const ip = (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  const userId = req.headers["x-user-id"] || null;
  const isPro = req.headers["x-pro-user"] === "true";
  const rate = checkRateLimit(userId ? `user:${userId}` : `ip:${ip}`, isPro);

  if (rate.limited) {
    return res.status(429).json({
      error: `Too many requests. Please wait ${rate.resetIn} seconds.`,
      retryAfter: rate.resetIn,
    });
  }

  // Validate
  const err = validateRequest(req.body);
  if (err) return res.status(400).json({ error: err });

  const { messages, system = null, max_tokens = 1000 } = req.body;
  const safeTokens = Math.min(Math.max(parseInt(max_tokens) || 1000, 1), 2000);

  try {
    const body = {
      model: "claude-sonnet-4-20250514",
      max_tokens: safeTokens,
      messages,
    };
    if (system && system.trim()) body.system = system;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.json().catch(() => ({}));
      console.error("Anthropic error:", anthropicRes.status, errBody);
      const msgs = {
        429: "AI service busy. Try again in a moment.",
        401: "AI authentication failed. Contact support.",
        529: "AI service overloaded. Try again shortly.",
      };
      return res.status(502).json({ error: msgs[anthropicRes.status] || "AI service unavailable. Try again." });
    }

    const data = await anthropicRes.json();
    return res.status(200).json(data);

  } catch (e) {
    console.error("Handler error:", e.message);
    return res.status(503).json({ error: "Could not reach AI service. Check connection and try again." });
  }
}
