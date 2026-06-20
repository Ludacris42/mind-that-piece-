// /api/health — visit this URL to confirm backend is running
export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const configured = !!process.env.ANTHROPIC_API_KEY;
  return res.status(200).json({
    status: configured ? "ok" : "degraded",
    service: "Mind That Piece API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    apiKeyConfigured: configured,
    message: configured
      ? "✅ Backend running. AI features active."
      : "⚠️ ANTHROPIC_API_KEY not set. Add it in Vercel → Settings → Environment Variables.",
  });
}
