"use client";
import { useState, useCallback, useEffect, useRef } from "react";

// ============================================================
// MIND THAT PIECE — Finance & Health Suite
// © 2026 Mind That Piece. All Rights Reserved.
// ============================================================

const C = {
  bg: "#0A0E1A", surface: "#111827", surfaceAlt: "#1A2236",
  border: "#1E2D45", accent: "#00D4FF", gold: "#F5A623",
  green: "#00E096", red: "#FF4D6D", purple: "#A78BFA",
  text: "#E8F0FE", muted: "#6B7FA3", dim: "#3A4F6E",
};

// ── API call — auto-detects environment ──────────────────────────
// • Claude.ai artifact sandbox  → calls Anthropic directly (sandbox handles auth)
// • Your Vercel production site → calls /api/chat  (your secure backend, key hidden)
const IS_PREVIEW = typeof window !== "undefined" && (
  window.location.hostname === "claude.ai" ||
  window.location.hostname.includes("anthropic") ||
  window.location.hostname === "localhost" ||
  window.location.protocol === "blob:"
);

async function callBackend(messages, system = null, maxTokens = 1000) {
  if (IS_PREVIEW) {
    // SANDBOX / PREVIEW: call Anthropic directly
    const body = { model: "claude-sonnet-4-20250514", max_tokens: maxTokens, messages };
    if (system) body.system = system;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) { const e = await res.json().catch(()=>({})); console.error("API error:", e); throw new Error("api_error"); }
    const data = await res.json();
    return data.content?.map((b) => b.text || "").join("") || "";
  } else {
    // PRODUCTION: call your secure Vercel serverless function
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, system, max_tokens: maxTokens }),
    });
    if (res.status === 429) throw new Error("rate_limit");
    if (!res.ok) throw new Error("api_error");
    const data = await res.json();
    return data.content?.map((b) => b.text || "").join("") || "";
  }
}

// ── Memory store ──────────────────────────────────────────────
const maxMemory = {
  userName: null, interactions: 0,
  topicsDiscussed: [], lastTab: "salary",
  preferences: {}, notes: [],
};

// ============================================================
// CSS
// ============================================================
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:${C.bg};color:${C.text};font-family:'Space Grotesk',sans-serif;min-height:100vh;}

  @keyframes bubbleIn{from{opacity:0;transform:scale(.85) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}
  @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes slideDown{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}

  /* ── LAYOUT ── */
  .site-wrap{display:flex;flex-direction:column;min-height:100vh;}
  .suite-wrap{max-width:1160px;margin:0 auto;padding:24px 16px 40px;flex:1;}

  /* ── TOPBAR ── */
  .topbar{background:${C.surface};border-bottom:1px solid ${C.border};padding:0 24px;display:flex;align-items:center;justify-content:space-between;height:58px;position:sticky;top:0;z-index:200;}
  .topbar-brand{display:flex;align-items:center;gap:10px;}
  .topbar-logo{width:32px;height:32px;}
  .topbar-name{font-size:1.05rem;font-weight:700;background:linear-gradient(135deg,${C.accent},${C.purple});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:-0.01em;}
  .topbar-links{display:flex;gap:4px;}
  .topbar-link{background:transparent;border:none;color:${C.muted};font-family:'Space Grotesk',sans-serif;font-size:0.78rem;font-weight:500;cursor:pointer;padding:6px 12px;border-radius:8px;transition:all .2s;}
  .topbar-link:hover{color:${C.accent};background:rgba(0,212,255,.08);}
  @media(max-width:520px){.topbar-links{display:none;}}

  /* ── HEADER ── */
  .suite-header{text-align:center;margin-bottom:32px;padding-top:8px;}
  .suite-header h1{font-size:clamp(1.4rem,4vw,2.3rem);font-weight:700;letter-spacing:-.02em;background:linear-gradient(135deg,${C.accent},${C.purple});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:6px;}
  .suite-header p{color:${C.muted};font-size:.88rem;}

  /* ── NAV ── */
  .nav-tabs{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px;justify-content:center;}
  .nav-tab{padding:8px 17px;border-radius:100px;border:1px solid ${C.border};background:transparent;color:${C.muted};font-family:'Space Grotesk',sans-serif;font-size:.8rem;font-weight:500;cursor:pointer;transition:all .2s;}
  .nav-tab:hover{border-color:${C.accent};color:${C.accent};}
  .nav-tab.active{background:${C.accent};border-color:${C.accent};color:${C.bg};font-weight:600;}
  .nav-tab.health.active{background:${C.red};border-color:${C.red};}

  /* ── PANEL ── */
  .panel{background:${C.surface};border:1px solid ${C.border};border-radius:16px;padding:24px;}
  .health-panel{border-color:rgba(255,77,109,.3);}
  .panel-title{font-size:1.1rem;font-weight:600;margin-bottom:20px;display:flex;align-items:center;gap:10px;}

  /* ── GRID / FIELDS ── */
  .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:13px;}
  .grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:13px;}
  @media(max-width:600px){.grid-2,.grid-3{grid-template-columns:1fr;}}
  .field{display:flex;flex-direction:column;gap:5px;}
  .field label{font-size:.74rem;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:.08em;}
  .field input,.field select{background:${C.surfaceAlt};border:1px solid ${C.border};border-radius:8px;color:${C.text};font-family:'JetBrains Mono',monospace;font-size:.92rem;padding:10px 12px;outline:none;transition:border-color .2s;width:100%;}
  .field input:focus,.field select:focus{border-color:${C.accent};}
  .field select option{background:${C.surface};}

  /* ── BUTTONS ── */
  .btn{padding:11px 22px;border-radius:10px;border:none;font-family:'Space Grotesk',sans-serif;font-size:.87rem;font-weight:600;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:8px;}
  .btn-primary{background:${C.accent};color:${C.bg};}
  .btn-primary:hover{background:#33DDFF;transform:translateY(-1px);}
  .btn-danger{background:${C.red};color:white;}
  .btn-danger:hover{background:#FF6B85;transform:translateY(-1px);}
  .btn-ghost{background:transparent;border:1px solid ${C.border};color:${C.muted};}
  .btn-ghost:hover{border-color:${C.accent};color:${C.accent};}
  .btn-full{width:100%;justify-content:center;margin-top:13px;}

  /* ── RESULTS ── */
  .results-box{margin-top:20px;background:${C.surfaceAlt};border:1px solid ${C.border};border-radius:12px;padding:16px;}
  .result-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid ${C.border};}
  .result-row:last-child{border-bottom:none;}
  .result-label{color:${C.muted};font-size:.85rem;}
  .result-value{font-family:'JetBrains Mono',monospace;font-size:.95rem;font-weight:600;color:${C.green};}
  .result-value.neg{color:${C.red};}
  .result-value.neu{color:${C.accent};}
  .result-value.gld{color:${C.gold};}
  .big-result{text-align:center;padding:16px;background:linear-gradient(135deg,rgba(0,212,255,.08),rgba(167,139,250,.08));border:1px solid rgba(0,212,255,.22);border-radius:12px;margin-bottom:13px;}
  .big-result .amount{font-family:'JetBrains Mono',monospace;font-size:clamp(1.4rem,5vw,2.5rem);font-weight:700;color:${C.accent};}
  .big-result .lbl{font-size:.74rem;color:${C.muted};margin-top:4px;text-transform:uppercase;letter-spacing:.06em;}

  /* ── MISC ── */
  .divider{height:1px;background:${C.border};margin:16px 0;}
  .section-sub{font-size:.74rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:${C.muted};margin-bottom:9px;margin-top:16px;}
  .budget-bar-bg{height:6px;background:${C.bg};border-radius:99px;overflow:hidden;}
  .budget-bar-fill{height:100%;border-radius:99px;transition:width .4s ease;}
  .budget-item{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid ${C.border};gap:8px;}
  .budget-item-left{display:flex;align-items:center;gap:9px;flex:1;}
  .budget-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0;}
  .budget-name{font-size:.87rem;}
  .risk-badge{display:inline-block;padding:3px 11px;border-radius:99px;font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;}
  .risk-critical{background:rgba(255,77,109,.2);color:${C.red};border:1px solid rgba(255,77,109,.4);}
  .risk-high{background:rgba(245,166,35,.2);color:${C.gold};border:1px solid rgba(245,166,35,.4);}
  .risk-moderate{background:rgba(0,212,255,.12);color:${C.accent};border:1px solid rgba(0,212,255,.3);}
  .risk-low{background:rgba(0,224,150,.12);color:${C.green};border:1px solid rgba(0,224,150,.3);}
  .timeline-block{border-left:2px solid ${C.border};padding-left:16px;margin-bottom:13px;position:relative;}
  .timeline-block::before{content:'';position:absolute;left:-5px;top:6px;width:8px;height:8px;border-radius:50%;background:${C.accent};}
  .timeline-title{font-size:.76rem;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px;}
  .timeline-content{font-size:.85rem;color:${C.text};line-height:1.55;}
  .outcome-split{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;}
  @media(max-width:540px){.outcome-split{grid-template-columns:1fr;}}
  .outcome-card{border-radius:10px;padding:12px;}
  .outcome-treated{background:rgba(0,224,150,.06);border:1px solid rgba(0,224,150,.2);}
  .outcome-untreated{background:rgba(255,77,109,.06);border:1px solid rgba(255,77,109,.2);}
  .outcome-card h4{font-size:.74rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;}
  .outcome-treated h4{color:${C.green};}
  .outcome-untreated h4{color:${C.red};}
  .outcome-card p{font-size:.83rem;line-height:1.57;color:${C.muted};}
  .category-pills{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:13px;}
  .category-pill{padding:4px 12px;border-radius:99px;font-size:.74rem;font-weight:600;background:${C.surfaceAlt};border:1px solid ${C.border};color:${C.muted};cursor:pointer;transition:all .2s;}
  .category-pill.active{background:rgba(255,77,109,.12);border-color:rgba(255,77,109,.35);color:${C.red};}
  .stat-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;}
  .stat-chip{background:${C.surfaceAlt};border:1px solid ${C.border};border-radius:8px;padding:6px 10px;font-size:.76rem;}
  .stat-chip span{display:block;color:${C.muted};font-size:.66rem;margin-bottom:2px;}
  .stat-chip strong{font-family:'JetBrains Mono',monospace;color:${C.accent};}
  .disclaimer-box{background:rgba(245,166,35,.07);border:1px solid rgba(245,166,35,.2);border-radius:9px;padding:11px 13px;font-size:.78rem;color:${C.muted};margin-top:16px;line-height:1.55;}
  .disclaimer-box strong{color:${C.gold};}

  /* ── GP REFERRAL CARD — always visible after any health result ── */
  .gp-referral-card{
    margin-top:18px;
    background:linear-gradient(135deg,rgba(0,212,255,.07),rgba(167,139,250,.07));
    border:2px solid rgba(0,212,255,.35);
    border-radius:14px;
    padding:18px 20px;
    display:flex;
    gap:14px;
    align-items:flex-start;
  }
  .gp-referral-icon{font-size:2rem;flex-shrink:0;line-height:1;}
  .gp-referral-body{}
  .gp-referral-title{font-size:.92rem;font-weight:700;color:${C.text};margin-bottom:5px;}
  .gp-referral-text{font-size:.82rem;color:${C.muted};line-height:1.65;margin-bottom:10px;}
  .gp-referral-links{display:flex;flex-wrap:wrap;gap:7px;}
  .gp-referral-link{display:inline-flex;align-items:center;gap:5px;font-size:.76rem;font-weight:600;padding:5px 12px;border-radius:99px;text-decoration:none;transition:all .2s;cursor:pointer;border:none;font-family:inherit;}
  .gp-referral-link.primary{background:${C.accent};color:${C.bg};}
  .gp-referral-link.primary:hover{background:#33DDFF;}
  .gp-referral-link.secondary{background:transparent;border:1px solid ${C.border};color:${C.muted};}
  .gp-referral-link.secondary:hover{border-color:${C.accent};color:${C.accent};}
  .gp-urgent-banner{
    margin-top:12px;
    background:rgba(255,77,109,.1);
    border:1px solid rgba(255,77,109,.35);
    border-radius:9px;
    padding:10px 14px;
    font-size:.8rem;
    color:${C.red};
    font-weight:600;
    display:flex;
    align-items:center;
    gap:8px;
    line-height:1.5;
  }
  .tabs-inner{display:flex;gap:4px;background:${C.surfaceAlt};padding:4px;border-radius:10px;margin-bottom:16px;}
  .tab-inner{flex:1;padding:7px;border-radius:7px;border:none;background:transparent;font-family:'Space Grotesk',sans-serif;font-size:.77rem;font-weight:500;color:${C.muted};cursor:pointer;text-align:center;transition:all .2s;}
  .tab-inner.active{background:${C.surface};color:${C.text};font-weight:600;}
  .loading-spinner{display:flex;align-items:center;justify-content:center;gap:10px;padding:26px;color:${C.muted};font-size:.87rem;}
  .spinner{width:18px;height:18px;border:2px solid ${C.border};border-top-color:${C.accent};border-radius:50%;animation:spin .7s linear infinite;}

  /* ── COOKIE BANNER ── */
  .cookie-banner{position:fixed;bottom:0;left:0;right:0;background:${C.surface};border-top:1px solid ${C.border};padding:16px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;z-index:999;animation:slideUp .3s ease;box-shadow:0 -4px 24px rgba(0,0,0,.4);}
  .cookie-text{font-size:.82rem;color:${C.muted};flex:1;min-width:200px;line-height:1.5;}
  .cookie-text a{color:${C.accent};cursor:pointer;text-decoration:underline;}
  .cookie-btns{display:flex;gap:8px;flex-shrink:0;}

  /* ── MODAL OVERLAY ── */
  .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:500;display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn .2s ease;}
  .modal-box{background:${C.surface};border:1px solid ${C.border};border-radius:16px;width:100%;max-width:720px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 16px 64px rgba(0,0,0,.6);}
  .modal-header{padding:20px 24px 16px;border-bottom:1px solid ${C.border};display:flex;justify-content:space-between;align-items:center;}
  .modal-title{font-size:1.1rem;font-weight:700;color:${C.text};}
  .modal-close{background:rgba(255,77,109,.12);border:1px solid rgba(255,77,109,.25);color:${C.red};border-radius:8px;width:32px;height:32px;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;}
  .modal-body{padding:20px 24px;overflow-y:auto;flex:1;line-height:1.7;font-size:.86rem;color:${C.muted};}
  .modal-body h2{font-size:1rem;font-weight:700;color:${C.text};margin:20px 0 8px;}
  .modal-body h3{font-size:.88rem;font-weight:600;color:${C.accent};margin:14px 0 6px;}
  .modal-body p{margin-bottom:10px;}
  .modal-body ul{margin:6px 0 12px 20px;}
  .modal-body li{margin-bottom:4px;}
  .modal-body strong{color:${C.text};}
  .modal-footer{padding:14px 24px;border-top:1px solid ${C.border};font-size:.74rem;color:${C.dim};text-align:center;}

  /* ── ABOUT / CONTACT pages ── */
  .page-wrap{max-width:720px;margin:0 auto;padding:32px 16px;}
  .page-wrap h1{font-size:1.6rem;font-weight:700;color:${C.text};margin-bottom:6px;}
  .page-wrap .sub{color:${C.muted};font-size:.88rem;margin-bottom:28px;}
  .page-wrap h2{font-size:1rem;font-weight:600;color:${C.accent};margin:24px 0 8px;}
  .page-wrap p{color:${C.muted};font-size:.88rem;line-height:1.7;margin-bottom:12px;}
  .page-wrap ul{margin:6px 0 14px 20px;color:${C.muted};font-size:.88rem;line-height:1.7;}
  .contact-card{background:${C.surfaceAlt};border:1px solid ${C.border};border-radius:12px;padding:20px;margin-bottom:16px;}
  .contact-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid ${C.border};font-size:.87rem;}
  .contact-row:last-child{border-bottom:none;}
  .contact-icon{font-size:1.2rem;width:28px;text-align:center;}

  /* ── PRICING PAGE ── */
  .pricing-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:24px;}
  @media(max-width:560px){.pricing-grid{grid-template-columns:1fr;}}
  .pricing-card{background:${C.surfaceAlt};border:1px solid ${C.border};border-radius:14px;padding:22px;position:relative;}
  .pricing-card.pro{border-color:rgba(0,212,255,.4);background:linear-gradient(135deg,rgba(0,212,255,.06),rgba(167,139,250,.06));}
  .pricing-badge{position:absolute;top:-10px;right:16px;background:${C.accent};color:${C.bg};font-size:.68rem;font-weight:700;padding:3px 10px;border-radius:99px;text-transform:uppercase;letter-spacing:.06em;}
  .pricing-name{font-size:1rem;font-weight:700;margin-bottom:4px;}
  .pricing-price{font-family:'JetBrains Mono',monospace;font-size:1.9rem;font-weight:700;color:${C.accent};margin-bottom:4px;}
  .pricing-price span{font-size:.85rem;color:${C.muted};font-weight:400;}
  .pricing-desc{font-size:.8rem;color:${C.muted};margin-bottom:16px;line-height:1.5;}
  .pricing-feature{font-size:.8rem;padding:6px 0;border-bottom:1px solid ${C.border};display:flex;align-items:center;gap:8px;color:${C.muted};}
  .pricing-feature:last-child{border-bottom:none;}
  .pricing-feature .tick{color:${C.green};font-size:.9rem;}
  .pricing-feature .cross{color:${C.dim};font-size:.9rem;}

  /* ── FOOTER ── */
  .site-footer{background:${C.surface};border-top:1px solid ${C.border};padding:24px;margin-top:auto;}
  .footer-inner{max-width:1160px;margin:0 auto;}
  .footer-top{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:20px;margin-bottom:20px;}
  .footer-brand{}
  .footer-brand-name{font-size:1rem;font-weight:700;background:linear-gradient(135deg,${C.accent},${C.purple});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:5px;}
  .footer-brand-desc{font-size:.75rem;color:${C.dim};max-width:220px;line-height:1.5;}
  .footer-links{display:flex;gap:6px;flex-wrap:wrap;}
  .footer-link{background:transparent;border:none;color:${C.dim};font-family:'Space Grotesk',sans-serif;font-size:.75rem;cursor:pointer;padding:3px 6px;transition:color .2s;}
  .footer-link:hover{color:${C.accent};}
  .footer-divider{height:1px;background:${C.border};margin-bottom:14px;}
  .footer-bottom{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;}
  .footer-copy{font-size:.74rem;color:${C.dim};}
  .footer-legal{font-size:.72rem;color:${C.dim};font-style:italic;}

  /* ── MAX CHAT ── */
  .max-fab{position:fixed;bottom:24px;right:24px;display:flex;flex-direction:column;align-items:flex-end;gap:8px;z-index:300;}
  .max-circle{cursor:pointer;background:linear-gradient(135deg,#0f1a30,#1a2a4a);border:2px solid ${C.accent};border-radius:50%;width:78px;height:78px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 24px rgba(0,212,255,.32);overflow:hidden;transition:transform .2s;}
  .max-circle:hover{transform:scale(1.1);}
  .max-label{background:${C.accent};color:${C.bg};font-size:.7rem;font-weight:700;padding:3px 10px;border-radius:99px;text-align:center;letter-spacing:.04em;}
  .max-tip{background:linear-gradient(135deg,#1a2a4a,#0f1a30);border:1px solid ${C.accent};border-radius:12px;padding:10px 13px;font-size:.78rem;color:${C.text};max-width:210px;box-shadow:0 4px 20px rgba(0,212,255,.18);line-height:1.5;animation:bubbleIn .3s ease;}
  .max-panel{position:fixed;bottom:20px;right:20px;width:min(410px,calc(100vw - 32px));height:min(580px,calc(100vh - 40px));background:${C.surface};border:1px solid ${C.border};border-radius:20px;display:flex;flex-direction:column;z-index:300;box-shadow:0 8px 48px rgba(0,0,0,.6),0 0 30px rgba(0,212,255,.1);overflow:hidden;animation:slideUp .3s ease;}
  .max-panel-header{background:linear-gradient(135deg,#0f1a30,#1a2a4a);border-bottom:1px solid ${C.border};padding:11px 14px;display:flex;align-items:center;gap:11px;}
  .max-panel-messages{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:11px;scrollbar-width:thin;scrollbar-color:${C.border} transparent;}
  .max-msg{display:flex;flex-direction:row;align-items:flex-end;gap:7px;}
  .max-msg.user{flex-direction:row-reverse;}
  .max-bubble{max-width:83%;background:${C.surfaceAlt};border:1px solid ${C.border};border-radius:14px;border-bottom-left-radius:4px;padding:9px 13px;font-size:.84rem;line-height:1.58;color:${C.text};white-space:pre-wrap;}
  .max-bubble.user{background:linear-gradient(135deg,rgba(0,212,255,.18),rgba(167,139,250,.18));border-color:rgba(0,212,255,.28);border-bottom-left-radius:14px;border-bottom-right-radius:4px;}
  .max-quick{padding:7px 11px;display:flex;gap:5px;flex-wrap:wrap;border-top:1px solid ${C.border};background:${C.surfaceAlt};}
  .max-quick-btn{background:transparent;border:1px solid ${C.border};border-radius:99px;color:${C.muted};font-size:.7rem;padding:3px 9px;cursor:pointer;font-family:inherit;transition:all .15s;white-space:nowrap;}
  .max-quick-btn:hover{border-color:${C.accent};color:${C.accent};}
  .max-input-row{padding:11px;border-top:1px solid ${C.border};display:flex;gap:7px;}
  .max-input{flex:1;background:${C.surfaceAlt};border:1px solid ${C.border};border-radius:9px;color:${C.text};font-family:inherit;font-size:.86rem;padding:9px 12px;outline:none;transition:border-color .2s;}
  .max-input:focus{border-color:${C.accent};}
  .max-send{background:${C.accent};border:none;border-radius:9px;color:${C.bg};cursor:pointer;padding:9px 14px;font-size:1rem;transition:all .2s;}
  .max-send:disabled{background:${C.surfaceAlt};color:${C.dim};cursor:not-allowed;}
  .max-memory-bar{padding:5px 11px;background:rgba(167,139,250,.07);border-top:1px solid rgba(167,139,250,.12);font-size:.68rem;color:${C.purple};display:flex;align-items:center;gap:4px;}
`;

// ============================================================
// MAX CHARACTER SVG
// ============================================================
function MaxCharacter({ mood = "idle", size = 120, onClick }) {
  const eyeY = mood === "thinking" ? 52 : 50;
  const mouthPath = mood === "happy" ? "M 68 72 Q 76 80 84 72"
    : mood === "alert" ? "M 68 76 L 84 76"
    : mood === "thinking" ? "M 70 74 Q 73 70 76 74"
    : "M 68 74 Q 76 80 84 74";
  const browOffset = mood === "alert" ? -3 : mood === "happy" ? 2 : 0;
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 150 195"
      style={{ cursor: onClick ? "pointer" : "default", filter: "drop-shadow(0 4px 16px rgba(0,212,255,0.18))" }}
      onClick={onClick}>
      <rect x="55" y="148" width="16" height="42" rx="4" fill="#1a1a2e" />
      <rect x="79" y="148" width="16" height="42" rx="4" fill="#1a1a2e" />
      <ellipse cx="63" cy="191" rx="12" ry="5" fill="#111" />
      <ellipse cx="87" cy="191" rx="12" ry="5" fill="#111" />
      <path d="M 35 105 Q 30 145 40 162 L 110 162 Q 120 145 115 105 L 95 95 L 75 100 L 55 95 Z" fill="#2a2a4a" />
      <path d="M 75 100 L 55 95 L 50 112 L 68 115 Z" fill="#222244" />
      <path d="M 75 100 L 95 95 L 100 112 L 82 115 Z" fill="#222244" />
      <path d="M 68 115 L 82 115 L 80 145 L 70 145 Z" fill="#e8f0fe" />
      <path d="M 73 112 L 77 112 L 80 135 L 75 140 L 70 135 Z" fill="#cc2244" />
      <path d="M 73 112 L 77 112 L 75 118 Z" fill="#991133" />
      <line x1="74" y1="120" x2="76" y2="130" stroke="#ff4466" strokeWidth="1.5" />
      <g transform={`rotate(${mood === "waving" ? -25 : 5}, 45, 115)`}>
        <path d="M 48 105 Q 28 120 32 138" stroke="#2a2a4a" strokeWidth="18" fill="none" strokeLinecap="round" />
        <ellipse cx="31" cy="140" rx="8" ry="7" fill="#f4c5a0" />
      </g>
      <g transform={`rotate(${mood === "waving" ? 30 : -5}, 105, 115)`}>
        <path d="M 102 105 Q 122 120 118 138" stroke="#2a2a4a" strokeWidth="18" fill="none" strokeLinecap="round" />
        <ellipse cx="119" cy="140" rx="8" ry="7" fill="#f4c5a0" />
        {mood === "waving" && (<>
          <line x1="119" y1="133" x2="115" y2="125" stroke="#f4c5a0" strokeWidth="4" strokeLinecap="round" />
          <line x1="119" y1="133" x2="121" y2="124" stroke="#f4c5a0" strokeWidth="4" strokeLinecap="round" />
          <line x1="119" y1="133" x2="126" y2="127" stroke="#f4c5a0" strokeWidth="4" strokeLinecap="round" />
        </>)}
      </g>
      <rect x="68" y="78" width="14" height="18" rx="4" fill="#f4c5a0" />
      <ellipse cx="76" cy="55" rx="30" ry="32" fill="#f4c5a0" />
      <ellipse cx="46" cy="55" rx="5" ry="7" fill="#e8b090" />
      <ellipse cx="106" cy="55" rx="5" ry="7" fill="#e8b090" />
      <path d="M 48 40 Q 52 22 76 20 Q 100 22 104 40 Q 96 28 76 27 Q 56 28 48 40 Z" fill="#3a2a1a" />
      <rect x="50" y="46" width="19" height="14" rx="5" fill="none" stroke="#333" strokeWidth="2.2" />
      <rect x="82" y="46" width="19" height="14" rx="5" fill="none" stroke="#333" strokeWidth="2.2" />
      <line x1="69" y1="52" x2="82" y2="52" stroke="#333" strokeWidth="2" />
      <line x1="46" y1="52" x2="50" y2="52" stroke="#333" strokeWidth="2" />
      <line x1="101" y1="52" x2="106" y2="52" stroke="#333" strokeWidth="2" />
      <rect x="51" y="47" width="17" height="12" rx="4" fill="rgba(100,180,255,0.12)" />
      <rect x="83" y="47" width="17" height="12" rx="4" fill="rgba(100,180,255,0.12)" />
      <ellipse cx="59" cy={eyeY} rx="4.5" ry={mood === "thinking" ? 3 : 4.5} fill="#2a1a0a" />
      <ellipse cx="91" cy={eyeY} rx="4.5" ry={mood === "thinking" ? 3 : 4.5} fill="#2a1a0a" />
      <circle cx="61" cy={eyeY - 1.5} r="1.4" fill="white" />
      <circle cx="93" cy={eyeY - 1.5} r="1.4" fill="white" />
      <path d={`M 53 ${42+browOffset} Q 59 ${38+browOffset} 65 ${42+browOffset}`} stroke="#3a2a1a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d={`M 85 ${42+browOffset} Q 91 ${38+browOffset} 97 ${42+browOffset}`} stroke="#3a2a1a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d={mouthPath} stroke="#8a4a3a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {mood === "happy" && (<>
        <ellipse cx="54" cy="62" rx="6" ry="4" fill="rgba(255,150,150,0.28)" />
        <ellipse cx="98" cy="62" rx="6" ry="4" fill="rgba(255,150,150,0.28)" />
      </>)}
      {mood === "thinking" && (<>
        <circle cx="108" cy="30" r="3" fill={C.accent} opacity="0.9"><animate attributeName="opacity" values="0.9;0.2;0.9" dur="1.2s" repeatCount="indefinite" /></circle>
        <circle cx="118" cy="22" r="4" fill={C.accent} opacity="0.7"><animate attributeName="opacity" values="0.7;0.15;0.7" dur="1.2s" begin="0.3s" repeatCount="indefinite" /></circle>
        <circle cx="130" cy="14" r="5" fill={C.accent} opacity="0.5"><animate attributeName="opacity" values="0.5;0.1;0.5" dur="1.2s" begin="0.6s" repeatCount="indefinite" /></circle>
      </>)}
      {mood === "talking" && (
        <circle cx="76" cy="55" r="34" fill="none" stroke={C.accent} strokeWidth="1.5" opacity="0.5">
          <animate attributeName="r" values="34;44;34" dur="1s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0;0.5" dur="1s" repeatCount="indefinite" />
        </circle>
      )}
      {mood === "idle" && <animateTransform attributeName="transform" type="translate" values="0 0;0 -2;0 0" dur="3s" repeatCount="indefinite" additive="sum" />}
    </svg>
  );
}

// ============================================================
// COOKIE CONSENT BANNER
// ============================================================
function CookieBanner({ onAccept, onReject, onLearnMore }) {
  return (
    <div className="cookie-banner">
      <p className="cookie-text">
        🍪 This website uses cookies to improve user experience, analyse traffic, and display personalised advertisements.
        By continuing to use this site, you consent to our use of cookies.{" "}
        <a onClick={onLearnMore}>Learn More</a>
      </p>
      <div className="cookie-btns">
        <button className="btn btn-ghost" style={{ padding: "8px 16px", fontSize: ".8rem" }} onClick={onReject}>Reject</button>
        <button className="btn btn-primary" style={{ padding: "8px 16px", fontSize: ".8rem" }} onClick={onAccept}>Accept</button>
      </div>
    </div>
  );
}

// ============================================================
// MODAL (reusable)
// ============================================================
function Modal({ title, children, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">© 2026 Mind That Piece — All Rights Reserved. Educational purposes only. Not financial or medical advice.</div>
      </div>
    </div>
  );
}

// ============================================================
// LEGAL PAGE CONTENT
// ============================================================
function DisclaimerContent() {
  return (<>
    <p><strong>Last Updated: June 2026</strong></p>
    <p>Welcome to <strong>Mind That Piece – Finance & Health Suite</strong>. The information, calculators, tools, AI-generated responses, and educational content provided on this website are for general informational and educational purposes only.</p>
    <p>While we strive to provide accurate and up-to-date information, we make no guarantees regarding accuracy, completeness, reliability, suitability, or availability of any content on this website. Any reliance you place on such information is strictly at your own risk.</p>
    <h2>Financial Disclaimer</h2>
    <p>This website does not provide financial, investment, legal, tax, mortgage, insurance, or accounting advice. The calculators and AI-generated responses are estimates only and may not reflect current laws, tax regulations, government policies, market conditions, or personal financial circumstances. You should always consult a qualified professional before making financial decisions.</p>
    <h2>Medical & Health Disclaimer</h2>
    <p>The health prediction tools, AI-generated health analysis, and medical information on this website are <strong>not medical advice</strong> and should never replace consultation with qualified healthcare professionals. This website does not diagnose conditions, prescribe treatments, or provide emergency medical services.</p>
    <p><strong>If you believe you may have a medical emergency, contact your doctor or emergency services immediately.</strong></p>
    <h2>AI-Generated Content Disclaimer</h2>
    <p>Some content on this website is generated using artificial intelligence technologies. AI-generated responses may contain inaccuracies, become outdated, produce incomplete information, or misunderstand context. Users should independently verify any important information.</p>
    <h2>Affiliate Disclosure</h2>
    <p>This website may contain affiliate links. If you click certain links and make a purchase, we may earn a commission at no additional cost to you. We only promote products or services we believe may provide value to users.</p>
    <h2>Advertising Disclaimer</h2>
    <p>This website may display advertisements from third-party advertising networks including Google AdSense, affiliate programs, and sponsored content providers. We are not responsible for the content, accuracy, or practices of third-party advertisers.</p>
    <h2>External Links Disclaimer</h2>
    <p>Our website may contain links to external websites not provided or maintained by us. We do not guarantee the accuracy or reliability of information on external sites.</p>
    <h2>Limitation of Liability</h2>
    <p>Under no circumstances shall Mind That Piece or its owners be liable for any loss or damage arising from use of the website, reliance on website content, technical interruptions, AI-generated responses, or calculator inaccuracies.</p>
    <h2>Copyright Notice</h2>
    <p>© 2026 Mind That Piece. All rights reserved. All content on this website including text, branding, graphics, calculators, code, logos, AI assistant characters, designs, and layouts is protected by copyright and intellectual property laws. No part of this website may be copied, reproduced, distributed, or republished without written permission.</p>
  </>);
}

function PrivacyContent() {
  return (<>
    <p><strong>Last Updated: June 2026</strong></p>
    <p>Mind That Piece respects your privacy. This policy explains what information we collect and how we use it.</p>
    <h2>Information We May Collect</h2>
    <ul><li>Email addresses (if you sign up or contact us)</li><li>Analytics data and usage patterns</li><li>Cookies and similar tracking technologies</li><li>IP addresses and device/browser information</li><li>Optional user-submitted information entered into calculators</li></ul>
    <h2>How We Use Information</h2>
    <ul><li>To improve website functionality and user experience</li><li>To analyse traffic and understand how tools are used</li><li>To personalise content and display relevant advertisements</li><li>To send newsletters where you have opted in</li></ul>
    <h2>Financial & Health Input Data</h2>
    <p>Data you enter into our calculators is used in real-time to generate your results. It is <strong>not stored on our servers</strong> by default, is not sold or shared with third parties for marketing, and is transmitted securely over HTTPS.</p>
    <h2>Cookies</h2>
    <p>This website uses cookies for analytics, advertising, user preferences, and performance monitoring. You can disable cookies in your browser settings or use our cookie consent controls.</p>
    <h2>Third-Party Services</h2>
    <p>We may use Google Analytics, Google AdSense, affiliate tracking software, AI APIs (Anthropic), and email marketing providers. These services may collect data according to their own privacy policies.</p>
    <h2>Data Security</h2>
    <p>We take reasonable measures to protect user information but cannot guarantee absolute security of any data transmitted over the internet.</p>
    <h2>Your Rights (UK GDPR)</h2>
    <p>You have the right to access, rectify, erase, and port your personal data. To exercise these rights, contact us at support@mindthatpiece.com.</p>
    <h2>Children's Privacy</h2>
    <p>This website is not intended for users under 13 years of age.</p>
    <h2>Contact</h2>
    <p>For privacy concerns contact: <strong>support@mindthatpiece.com</strong></p>
  </>);
}

function TermsContent() {
  return (<>
    <p><strong>Last Updated: June 2026</strong></p>
    <p>By using Mind That Piece – Finance & Health Suite, you agree to these Terms of Service. Please read them carefully.</p>
    <h2>Acceptance of Terms</h2>
    <p>By accessing or using this website, you confirm you are at least 18 years of age and agree to be bound by these terms.</p>
    <h2>Acceptable Use</h2>
    <p>By using this website you agree to:</p>
    <ul><li>Use the website lawfully and in good faith</li><li>Not abuse calculators, AI systems, or server resources</li><li>Not attempt hacking, scraping, or reverse engineering</li><li>Not reproduce, copy, or republish proprietary content without permission</li><li>Not use the service to harass, harm, or defraud others</li></ul>
    <h2>Our Rights</h2>
    <p>We reserve the right to modify content, suspend services, block abusive users, and remove content without notice. All services are provided "as is" without warranties of any kind.</p>
    <h2>Intellectual Property</h2>
    <p>All content, branding, code, AI assistant characters (including Max™), calculator designs, and creative works are the intellectual property of Mind That Piece and protected by copyright law.</p>
    <h2>Subscriptions</h2>
    <p>Pro subscription fees are billed in advance. Cancellation takes effect at the end of the billing period. A 14-day money-back guarantee applies to new Pro subscribers (first payment only).</p>
    <h2>Limitation of Liability</h2>
    <p>Mind That Piece shall not be liable for any direct, indirect, incidental, or consequential damages arising from use of this service. See our full Disclaimer for details.</p>
    <h2>Governing Law</h2>
    <p>These Terms are governed by the laws of England and Wales.</p>
    <h2>Contact</h2>
    <p>For enquiries: <strong>support@mindthatpiece.com</strong></p>
  </>);
}

function CookieContent() {
  return (<>
    <p><strong>Last Updated: June 2026</strong></p>
    <p>This website uses cookies and similar technologies to provide, improve, and protect our services.</p>
    <h2>What Are Cookies?</h2>
    <p>Cookies are small text files stored on your device when you visit a website. They help us remember your preferences and understand how our site is used.</p>
    <h2>Types of Cookies We Use</h2>
    <h3>Essential Cookies</h3>
    <p>Required for the website to function. Cannot be disabled. Includes session management and security cookies.</p>
    <h3>Analytics Cookies</h3>
    <p>Help us understand how visitors use the site (e.g. Google Analytics). Data is anonymised where possible.</p>
    <h3>Advertising Cookies</h3>
    <p>Used to display relevant advertisements (e.g. Google AdSense). Only activated with your consent.</p>
    <h3>Preference Cookies</h3>
    <p>Remember your settings and preferences across visits.</p>
    <h2>Managing Cookies</h2>
    <p>You can control cookies through your browser settings or using the Accept/Reject buttons in our cookie banner. Note that disabling certain cookies may affect website functionality.</p>
    <h2>Third-Party Cookies</h2>
    <p>Google AdSense, Google Analytics, and affiliate networks may set their own cookies. Please refer to their respective privacy policies for details.</p>
  </>);
}

// ============================================================
// ABOUT PAGE
// ============================================================
function AboutPage({ onClose }) {
  return (
    <Modal title="About Mind That Piece" onClose={onClose}>
      <p><strong>Mind That Piece – Finance & Health Suite</strong> is a free-to-use financial and health intelligence platform built to give everyday people access to powerful calculators and AI-driven insights — all in one place.</p>
      <h2>What We Offer</h2>
      <ul>
        <li>💷 <strong>Salary & Tax Calculator</strong> — UK and US take-home pay, tax bands, NI</li>
        <li>🏛️ <strong>Benefits Estimator</strong> — Universal Credit, PIP, Child Benefit, Housing Benefit</li>
        <li>📊 <strong>Budget Planner</strong> — Monthly income vs expense breakdown with visual charts</li>
        <li>💱 <strong>Currency & Inflation</strong> — Live-rate converter and inflation purchasing power tool</li>
        <li>🧬 <strong>Health Predictor</strong> — AI-powered condition trajectory analysis based on epidemiological data</li>
        <li>🤖 <strong>Max AI Assistant</strong> — Your personal finance and health advisor, available 24/7</li>
      </ul>
      <h2>Our Mission</h2>
      <p>Financial and health literacy shouldn't be gatekept by expensive professionals or confusing government websites. We built Mind That Piece to make this information accessible, understandable, and actionable for everyone.</p>
      <h2>Important Note</h2>
      <p>All tools are for educational purposes only. Nothing on this site constitutes financial, legal, or medical advice. Always consult qualified professionals for personal decisions.</p>
      <h2>Technology</h2>
      <p>Mind That Piece is built with React, Next.js, and the Anthropic Claude AI API. Max's AI responses are powered by Claude Sonnet.</p>
      <p style={{marginTop:"16px",fontSize:".78rem",color:C.dim}}>© 2026 Mind That Piece. All Rights Reserved.</p>
    </Modal>
  );
}

// ============================================================
// CONTACT PAGE
// ============================================================
function ContactPage({ onClose }) {
  return (
    <Modal title="Contact Us" onClose={onClose}>
      <p>We'd love to hear from you. Whether you have a question, found a bug, want to advertise, or just want to say hello — reach out below.</p>
      <div className="contact-card">
        <div className="contact-row">
          <span className="contact-icon">📧</span>
          <div><strong style={{color:C.text,display:"block",fontSize:".85rem"}}>General Enquiries</strong><span style={{fontSize:".82rem"}}>support@mindthatpiece.com</span></div>
        </div>
        <div className="contact-row">
          <span className="contact-icon">💼</span>
          <div><strong style={{color:C.text,display:"block",fontSize:".85rem"}}>Business & Partnerships</strong><span style={{fontSize:".82rem"}}>business@mindthatpiece.com</span></div>
        </div>
        <div className="contact-row">
          <span className="contact-icon">📣</span>
          <div><strong style={{color:C.text,display:"block",fontSize:".85rem"}}>Advertising</strong><span style={{fontSize:".82rem"}}>ads@mindthatpiece.com</span></div>
        </div>
        <div className="contact-row">
          <span className="contact-icon">🔒</span>
          <div><strong style={{color:C.text,display:"block",fontSize:".85rem"}}>Privacy & Data Requests</strong><span style={{fontSize:".82rem"}}>privacy@mindthatpiece.com</span></div>
        </div>
        <div className="contact-row">
          <span className="contact-icon">🐛</span>
          <div><strong style={{color:C.text,display:"block",fontSize:".85rem"}}>Bug Reports</strong><span style={{fontSize:".82rem"}}>bugs@mindthatpiece.com</span></div>
        </div>
      </div>
      <p style={{fontSize:".8rem",color:C.dim}}>We aim to respond to all enquiries within 2 business days.</p>
    </Modal>
  );
}

// ============================================================
// PRICING PAGE
// ============================================================
function PricingPage({ onClose }) {
  const PRO_FEATURES = [
    ["All calculators (Tax, Benefits, Budget, Currency, Inflation)", true, true],
    ["Max AI Assistant", "10 queries/day", "Unlimited"],
    ["Health Predictor", "3 analyses/day", "Unlimited"],
    ["Save & export results (PDF/CSV)", false, true],
    ["Max AI — advanced memory & personalisation", false, true],
    ["Comparison mode (up to 5 scenarios)", false, true],
    ["Custom budget categories", false, true],
    ["Salary history & trends tracking", false, true],
    ["Priority API response speed", false, true],
    ["Ad-free experience", false, true],
    ["Priority email support", false, true],
  ];
  return (
    <Modal title="Plans & Pricing" onClose={onClose}>
      <p style={{marginBottom:"4px"}}>Start free. Upgrade when you need more power.</p>
      <div className="pricing-grid">
        <div className="pricing-card">
          <div className="pricing-name">Basic</div>
          <div className="pricing-price">Free <span>forever</span></div>
          <div className="pricing-desc">All core tools, limited AI access. Perfect for occasional use.</div>
          {PRO_FEATURES.map(([feat, basic], i) => (
            <div className="pricing-feature" key={i}>
              <span className={basic ? "tick" : "cross"}>{basic ? "✓" : "—"}</span>
              <span>{typeof basic === "string" ? `${feat}: ${basic}` : feat}</span>
            </div>
          ))}
        </div>
        <div className="pricing-card pro">
          <div className="pricing-badge">Most Popular</div>
          <div className="pricing-name" style={{color:C.accent}}>Pro</div>
          <div className="pricing-price">£9.99 <span>/month</span></div>
          <div className="pricing-desc">£89/year (save 26%). Unlimited AI, no ads, advanced features.</div>
          {PRO_FEATURES.map(([feat, , pro], i) => (
            <div className="pricing-feature" key={i}>
              <span className="tick">✓</span>
              <span>{typeof pro === "string" ? `${feat}: ${pro}` : feat}</span>
            </div>
          ))}
          <button className="btn btn-primary btn-full" style={{marginTop:"16px"}}>Upgrade to Pro</button>
        </div>
      </div>
      <p style={{fontSize:".76rem",color:C.dim,marginTop:"14px",textAlign:"center"}}>14-day money-back guarantee · Cancel anytime · Secure payments via Stripe</p>
    </Modal>
  );
}

// ============================================================
// CALCULATORS
// ============================================================
const fmt = (n, d=2) => new Intl.NumberFormat("en-GB",{minimumFractionDigits:d,maximumFractionDigits:d}).format(n);
const fmtC = (n, cur="GBP") => new Intl.NumberFormat("en-GB",{style:"currency",currency:cur,minimumFractionDigits:0,maximumFractionDigits:0}).format(n);
const fmtP = (n) => `${fmt(n,1)}%`;

function calcUKTax(g) {
  let tax=0,ni=0;
  if(g>12570) tax+=Math.min(g-12570,50270-12570)*0.2;
  if(g>50270) tax+=Math.min(g-50270,125140-50270)*0.4;
  if(g>125140) tax+=(g-125140)*0.45;
  if(g>12570) ni+=Math.min(g-12570,50270-12570)*0.08;
  if(g>50270) ni+=(g-50270)*0.02;
  return {tax,ni,net:g-tax-ni,eff:((tax+ni)/g)*100};
}
function calcUSTax(g, state) {
  const br=[[11600,.1],[47150,.12],[100525,.22],[191950,.24],[243725,.32],[609350,.35],[Infinity,.37]];
  let tax=0,prev=0;
  for(const [lim,r] of br){if(g<=prev)break;tax+=(Math.min(g,lim)-prev)*r;prev=lim;}
  const fica=Math.min(g,160200)*0.062+g*0.0145;
  const st=state==="CA"?g*0.093:state==="TX"?0:g*0.05;
  return {tax,fica,st,net:g-tax-fica-st,eff:((tax+fica+st)/g)*100};
}

function SalaryTaxCalculator() {
  const [country,setCountry]=useState("UK");
  const [gross,setGross]=useState(45000);
  const [usState,setUsState]=useState("CA");
  const [res,setRes]=useState(null);
  const calc=()=>{const g=parseFloat(gross)||0;setRes(country==="UK"?{...calcUKTax(g),country:"UK",g}:{...calcUSTax(g,usState),country:"US",g});};
  return (<div>
    <div className="tabs-inner">
      {["UK","US"].map(c=><button key={c} className={`tab-inner ${country===c?"active":""}`} onClick={()=>setCountry(c)}>{c==="UK"?"🇬🇧 United Kingdom":"🇺🇸 United States"}</button>)}
    </div>
    <div className="grid-2">
      <div className="field"><label>Annual Gross ({country==="UK"?"£":"$"})</label><input type="number" value={gross} onChange={e=>setGross(e.target.value)} /></div>
      {country==="US" && <div className="field"><label>State</label><select value={usState} onChange={e=>setUsState(e.target.value)}><option value="CA">California (9.3%)</option><option value="TX">Texas (0%)</option><option value="NY">New York (~5%)</option><option value="FL">Florida (0%)</option></select></div>}
    </div>
    <button className="btn btn-primary btn-full" onClick={calc}>Calculate Take-Home Pay</button>
    {res && (<div className="results-box">
      <div className="big-result"><div className="amount">{res.country==="UK"?fmtC(res.net):`$${fmt(res.net,0)}`}</div><div className="lbl">Annual Net · {res.country==="UK"?fmtC(res.net/12):`$${fmt(res.net/12,0)}`}/month</div></div>
      {res.country==="UK"?<>
        <div className="result-row"><span className="result-label">Gross</span><span className="result-value neu">{fmtC(res.g)}</span></div>
        <div className="result-row"><span className="result-label">Income Tax</span><span className="result-value neg">-{fmtC(res.tax)}</span></div>
        <div className="result-row"><span className="result-label">National Insurance</span><span className="result-value neg">-{fmtC(res.ni)}</span></div>
        <div className="result-row"><span className="result-label">Effective Rate</span><span className="result-value gld">{fmtP(res.eff)}</span></div>
        <div className="result-row"><span className="result-label">Weekly Take-Home</span><span className="result-value">{fmtC(res.net/52)}</span></div>
      </>:<>
        <div className="result-row"><span className="result-label">Gross</span><span className="result-value neu">${fmt(res.g,0)}</span></div>
        <div className="result-row"><span className="result-label">Federal Tax</span><span className="result-value neg">-${fmt(res.tax,0)}</span></div>
        <div className="result-row"><span className="result-label">FICA</span><span className="result-value neg">-${fmt(res.fica,0)}</span></div>
        <div className="result-row"><span className="result-label">State Tax</span><span className="result-value neg">-${fmt(res.st,0)}</span></div>
        <div className="result-row"><span className="result-label">Effective Rate</span><span className="result-value gld">{fmtP(res.eff)}</span></div>
      </>}
      <div className="disclaimer-box"><strong>ℹ️ Note:</strong> These are estimates only. Tax laws change frequently. Consult a qualified tax professional for your personal situation. Not financial advice.</div>
    </div>)}
  </div>);
}

function BenefitsCalculator() {
  const [income,setIncome]=useState(0);const [children,setChildren]=useState(0);
  const [savings,setSavings]=useState(0);const [rent,setRent]=useState(0);
  const [disabled,setDisabled]=useState("none");const [res,setRes]=useState(null);
  const calc=()=>{
    const ai=parseFloat(income)||0,mi=ai/12,ch=parseInt(children)||0,sav=parseFloat(savings)||0,r=parseFloat(rent)||0;
    let uc=393.45+ch*269.58;
    if(mi>673) uc-=(mi-673)*0.55;
    if(sav>16000) uc=0; else if(sav>6000) uc-=((sav-6000)/250)*(4.35/4);
    uc=Math.max(0,uc);
    const hb=Math.max(0,Math.min(r,1200)*(1-ai/26000));
    const cb=ch>0?(25.6+(ch-1)*16.95)*(52/12):0;
    const cbLoss=ai>60000?cb*Math.min(1,(ai-60000)/20000):0;
    const pip=disabled==="standard"?290:disabled==="enhanced"?627.15:0;
    setRes({uc,hb,cb:cb-cbLoss,pip,total:uc+hb+(cb-cbLoss)+pip});
  };
  return (<div>
    <p style={{fontSize:".79rem",color:C.muted,marginBottom:"16px"}}>UK Benefits estimate based on 2024/25 rates. Indicative only — always verify with gov.uk or Citizens Advice.</p>
    <div className="grid-2">
      <div className="field"><label>Annual Income (£)</label><input type="number" value={income} onChange={e=>setIncome(e.target.value)} /></div>
      <div className="field"><label>Children</label><input type="number" min="0" max="10" value={children} onChange={e=>setChildren(e.target.value)} /></div>
      <div className="field"><label>Monthly Rent (£)</label><input type="number" value={rent} onChange={e=>setRent(e.target.value)} /></div>
      <div className="field"><label>Savings (£)</label><input type="number" value={savings} onChange={e=>setSavings(e.target.value)} /></div>
      <div className="field"><label>PIP / Disability</label>
        <select value={disabled} onChange={e=>setDisabled(e.target.value)}>
          <option value="none">None</option><option value="standard">Standard Rate (£290/mo)</option><option value="enhanced">Enhanced Rate (£627/mo)</option>
        </select>
      </div>
    </div>
    <button className="btn btn-primary btn-full" onClick={calc}>Estimate Benefits</button>
    {res && (<div className="results-box">
      <div className="big-result"><div className="amount">{fmtC(res.total)}</div><div className="lbl">Total Monthly Benefits (estimate)</div></div>
      <div className="result-row"><span className="result-label">Universal Credit</span><span className="result-value">{fmtC(res.uc)}/mo</span></div>
      <div className="result-row"><span className="result-label">Housing Benefit</span><span className="result-value">{fmtC(res.hb)}/mo</span></div>
      <div className="result-row"><span className="result-label">Child Benefit (net)</span><span className="result-value">{fmtC(res.cb)}/mo</span></div>
      <div className="result-row"><span className="result-label">PIP Payment</span><span className="result-value">{fmtC(res.pip)}/mo</span></div>
      <div className="result-row"><span className="result-label">Annual Total</span><span className="result-value gld">{fmtC(res.total*12)}/yr</span></div>
      <div className="disclaimer-box"><strong>ℹ️ Note:</strong> These figures are indicative estimates based on simplified benefit rules. Actual entitlements depend on your full circumstances. Always check via <strong>gov.uk/benefits-calculators</strong> or speak to Citizens Advice.</div>
    </div>)}
  </div>);
}

const BCOLS=["#00D4FF","#A78BFA","#00E096","#F5A623","#FF4D6D","#60A5FA","#F472B6","#34D399"];
const BCATS=["Housing","Food & Groceries","Transport","Utilities","Entertainment","Clothing","Healthcare","Savings"];
const BDEFS=[900,350,200,150,150,100,80,300];

function BudgetPlanner() {
  const [income,setIncome]=useState(3000);
  const [items,setItems]=useState(BCATS.map((cat,i)=>({cat,amount:BDEFS[i]})));
  const total=items.reduce((s,i)=>s+(parseFloat(i.amount)||0),0);
  const surplus=income-total;
  return (<div>
    <div className="field" style={{marginBottom:"16px"}}><label>Monthly Net Income (£)</label><input type="number" value={income} onChange={e=>setIncome(parseFloat(e.target.value)||0)} /></div>
    <div className="section-sub">Monthly Expenses</div>
    {items.map((item,idx)=>(
      <div key={idx} className="budget-item">
        <div className="budget-item-left"><div className="budget-dot" style={{background:BCOLS[idx%BCOLS.length]}} /><span className="budget-name">{item.cat}</span></div>
        <input type="number" style={{background:C.surfaceAlt,border:`1px solid ${C.border}`,borderRadius:"6px",color:C.text,fontFamily:"'JetBrains Mono',monospace",fontSize:".84rem",padding:"4px 8px",width:"86px",outline:"none",textAlign:"right"}}
          value={item.amount} onChange={e=>{const n=[...items];n[idx]={...item,amount:parseFloat(e.target.value)||0};setItems(n);}} />
      </div>
    ))}
    <div className="results-box" style={{marginTop:"16px"}}>
      <div className="big-result" style={surplus<0?{background:"rgba(255,77,109,.07)",borderColor:"rgba(255,77,109,.26)"}:{}}>
        <div className="amount" style={{color:surplus<0?C.red:C.green}}>{fmtC(Math.abs(surplus))}</div>
        <div className="lbl">{surplus>=0?"Monthly Surplus":"Monthly Deficit"}</div>
      </div>
      {items.map((item,idx)=>{const pct=income>0?(item.amount/income)*100:0;return(
        <div key={idx} style={{padding:"6px 0"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px"}}>
            <span style={{fontSize:".83rem"}}>{item.cat}</span>
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".83rem",color:BCOLS[idx%BCOLS.length]}}>{fmtC(item.amount)} · {fmtP(pct)}</span>
          </div>
          <div className="budget-bar-bg"><div className="budget-bar-fill" style={{width:`${Math.min(100,pct)}%`,background:BCOLS[idx%BCOLS.length]}} /></div>
        </div>
      );})}
      <div className="divider" />
      <div className="result-row"><span className="result-label">Total Income</span><span className="result-value neu">{fmtC(income)}</span></div>
      <div className="result-row"><span className="result-label">Total Expenses</span><span className="result-value neg">{fmtC(total)}</span></div>
      <div className="result-row"><span className="result-label">Savings Rate</span><span className="result-value gld">{fmtP(income>0?(surplus/income)*100:0)}</span></div>
    </div>
  </div>);
}

const RATES={GBP:1,USD:.789,EUR:.854,JPY:.0052,CAD:.583,AUD:.517,CHF:.881,CNY:.109,INR:.0094,MXN:.046,BRL:.157,KRW:.00058,SGD:.584,NOK:.074,SEK:.073,AED:.215,ZAR:.042};

function CurrencyInflation() {
  const [tab,setTab]=useState("currency");
  const [amt,setAmt]=useState(1000);const [from,setFrom]=useState("USD");const [to,setTo]=useState("EUR");const [conv,setConv]=useState(null);
  const [sAmt,setSAmt]=useState(1000);const [sY,setSY]=useState(2000);const [eY,setEY]=useState(2024);const [ir,setIr]=useState(2.5);const [infl,setInfl]=useState(null);
  const convert=()=>setConv((parseFloat(amt)*RATES[from])/RATES[to]);
  const calcInfl=()=>{const yrs=(parseInt(eY)||2024)-(parseInt(sY)||2000),r=(parseFloat(ir)||2.5)/100;const fv=parseFloat(sAmt)*Math.pow(1+r,yrs),pp=parseFloat(sAmt)/Math.pow(1+r,yrs);setInfl({fv,pp,yrs,ti:(fv/parseFloat(sAmt)-1)*100});};
  return (<div>
    <div className="tabs-inner">
      <button className={`tab-inner ${tab==="currency"?"active":""}`} onClick={()=>setTab("currency")}>💱 Currency Converter</button>
      <button className={`tab-inner ${tab==="inflation"?"active":""}`} onClick={()=>setTab("inflation")}>📈 Inflation Calculator</button>
    </div>
    {tab==="currency" && (<div>
      <p style={{fontSize:".77rem",color:C.muted,marginBottom:"13px"}}>Indicative rates (GBP baseline, June 2025)</p>
      <div className="grid-3">
        <div className="field"><label>Amount</label><input type="number" value={amt} onChange={e=>setAmt(e.target.value)} /></div>
        <div className="field"><label>From</label><select value={from} onChange={e=>setFrom(e.target.value)}>{Object.keys(RATES).map(c=><option key={c}>{c}</option>)}</select></div>
        <div className="field"><label>To</label><select value={to} onChange={e=>setTo(e.target.value)}>{Object.keys(RATES).map(c=><option key={c}>{c}</option>)}</select></div>
      </div>
      <button className="btn btn-primary btn-full" onClick={convert}>Convert</button>
      {conv!==null && (<div className="results-box">
        <div className="big-result"><div className="amount">{fmt(conv,4)} {to}</div><div className="lbl">{fmt(parseFloat(amt),2)} {from} → {to}</div></div>
        <div className="result-row"><span className="result-label">Rate ({from}→{to})</span><span className="result-value neu">{fmt(RATES[from]/RATES[to],6)}</span></div>
        <div className="result-row"><span className="result-label">Inverse rate</span><span className="result-value neu">{fmt(RATES[to]/RATES[from],6)}</span></div>
        <div className="disclaimer-box"><strong>ℹ️ Note:</strong> Rates are indicative and for educational purposes. For live exchange rates use your bank or a regulated FX provider.</div>
      </div>)}
    </div>)}
    {tab==="inflation" && (<div>
      <div className="grid-2">
        <div className="field"><label>Amount (£)</label><input type="number" value={sAmt} onChange={e=>setSAmt(e.target.value)} /></div>
        <div className="field"><label>Inflation Rate (%)</label><input type="number" step=".1" value={ir} onChange={e=>setIr(e.target.value)} /></div>
        <div className="field"><label>Start Year</label><input type="number" value={sY} onChange={e=>setSY(e.target.value)} /></div>
        <div className="field"><label>End Year</label><input type="number" value={eY} onChange={e=>setEY(e.target.value)} /></div>
      </div>
      <button className="btn btn-primary btn-full" onClick={calcInfl}>Calculate Impact</button>
      {infl && (<div className="results-box">
        <div className="grid-2" style={{gap:"10px",marginBottom:"13px"}}>
          <div className="big-result" style={{margin:0}}><div className="amount" style={{fontSize:"1.5rem"}}>{fmtC(infl.fv)}</div><div className="lbl">Equivalent value in {eY}</div></div>
          <div className="big-result" style={{margin:0,background:"rgba(255,77,109,.07)",borderColor:"rgba(255,77,109,.26)"}}><div className="amount" style={{fontSize:"1.5rem",color:C.red}}>{fmtC(infl.pp)}</div><div className="lbl">Real purchasing power</div></div>
        </div>
        <div className="result-row"><span className="result-label">Years elapsed</span><span className="result-value neu">{infl.yrs}y</span></div>
        <div className="result-row"><span className="result-label">Cumulative inflation</span><span className="result-value neg">{fmtP(infl.ti)}</span></div>
        <div className="result-row"><span className="result-label">Purchasing power lost</span><span className="result-value neg">{fmtC(parseFloat(sAmt)-infl.pp)}</span></div>
      </div>)}
    </div>)}
  </div>);
}

const CONDITIONS=["Type 2 Diabetes","Hypertension","Obesity (BMI > 30)","Coronary Artery Disease","COPD","Chronic Kidney Disease","Liver Cirrhosis","Heart Failure","Alzheimer's Disease","Rheumatoid Arthritis","Osteoporosis","Depression / Major Depressive Disorder","HIV (untreated)","Colorectal Cancer (Stage II)","Lung Cancer (Stage III)","Parkinson's Disease","Multiple Sclerosis","Asthma (uncontrolled)","Hypothyroidism","Sleep Apnoea (untreated)"];

// ── GP / Medical Practitioner Referral Card ───────────────────
// This card is HARDCODED to appear after EVERY health result,
// regardless of risk level or AI output. It cannot be suppressed.
function GPReferralCard({ riskLevel, condition }) {
  const isUrgent = riskLevel === "Critical" || riskLevel === "High";
  return (
    <div>
      {/* Urgent banner for Critical/High risk — shown ABOVE the main card */}
      {isUrgent && (
        <div className="gp-urgent-banner">
          🚨 Based on the risk level of this analysis, we strongly urge you to contact a medical professional
          as soon as possible — do not delay. If you are experiencing symptoms now, call <strong>999</strong> (UK)
          or <strong>911</strong> (US) or go to your nearest A&amp;E / Emergency Room immediately.
        </div>
      )}

      <div className="gp-referral-card">
        <div className="gp-referral-icon">🩺</div>
        <div className="gp-referral-body">
          <div className="gp-referral-title">Please speak to a medical professional</div>
          <div className="gp-referral-text">
            This analysis of <strong style={{color:"#E8F0FE"}}>{condition}</strong> is generated from population-level
            research data and is provided for <strong style={{color:"#E8F0FE"}}>educational awareness only</strong>.
            No matter what this tool concludes — whether your risk appears Low, Moderate, High, or Critical —
            it <strong style={{color:"#E8F0FE"}}>cannot replace a qualified medical opinion</strong> about your
            individual circumstances, medical history, medications, or current symptoms.
            <br /><br />
            We encourage you to use these results as a <strong style={{color:"#E8F0FE"}}>starting point for a conversation
            with your GP or specialist</strong>, not as a final answer. Early professional guidance saves lives.
          </div>
          <div className="gp-referral-links">
            <a className="gp-referral-link primary" href="https://www.nhs.uk/nhs-services/gps/how-to-register-with-a-gp-surgery/" target="_blank" rel="noopener noreferrer">
              🏥 Find a GP (NHS)
            </a>
            <a className="gp-referral-link secondary" href="https://111.nhs.uk" target="_blank" rel="noopener noreferrer">
              📞 NHS 111 Online
            </a>
            <a className="gp-referral-link secondary" href="https://www.nhs.uk/conditions/" target="_blank" rel="noopener noreferrer">
              📖 NHS Conditions A–Z
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function HealthPredictor() {
  const [condition,setCondition]=useState(CONDITIONS[0]);const [age,setAge]=useState(45);
  const [sex,setSex]=useState("male");const [race,setRace]=useState("White");
  const [bmi,setBmi]=useState("normal");const [smoking,setSmoking]=useState("never");
  const [comorbidities,setComorbidities]=useState([]);const [res,setRes]=useState(null);const [loading,setLoading]=useState(false);
  const comOpts=["Hypertension","Type 2 Diabetes","Obesity","COPD","Kidney Disease","Heart Disease"];
  const toggle=c=>setComorbidities(p=>p.includes(c)?p.filter(x=>x!==c):[...p,c]);
  const riskClass=r=>r==="Critical"?"risk-critical":r==="High"?"risk-high":r==="Moderate"?"risk-moderate":"risk-low";
  const run=async()=>{
    setLoading(true);setRes(null);
    const prompt=`You are a clinical data analyst AI trained on epidemiological research. Provide a structured health deterioration analysis.
Patient: ${condition}, Age ${age}, ${sex}, ${race}, ${bmi} BMI, ${smoking}. Comorbidities: ${comorbidities.join(", ")||"None"}.

CRITICAL INSTRUCTION: You MUST include a "gpRecommendation" field in your JSON. This field must ALWAYS contain a warm, specific, personalised sentence urging this exact patient profile to consult a qualified medical professional. The recommendation must be tailored to the condition and demographics — never generic. It must be present regardless of whether the risk is Low, Moderate, High, or Critical. This is non-negotiable.

Respond ONLY in valid JSON (no markdown) with this exact structure:
{"riskLevel":"Critical|High|Moderate|Low","summary":"2-3 sentence clinical summary","gpRecommendation":"A personalised, warm, specific sentence urging THIS patient profile to consult a GP or specialist, referencing their specific condition, age, and risk factors. Must always be present.","progressionTimeline":[{"timeframe":"0-2 years","description":"..."},{"timeframe":"2-5 years","description":"..."},{"timeframe":"5-10 years","description":"..."},{"timeframe":"10+ years","description":"..."}],"withTreatment":{"outcomes":"...","key_interventions":["...","...","..."]},"withoutTreatment":{"outcomes":"...","complications":["...","...","..."]},"demographicFactors":"...","statisticsSnapshot":{"5yr_mortality_treated":"X%","5yr_mortality_untreated":"X%","median_survival_untreated":"X years","treatment_efficacy":"X%"},"recommendedSpecialists":["...","..."],"evidenceBase":"..."}`;
    try {
      const txt=await callBackend([{role:"user",content:prompt}],null,1000);
      setRes(JSON.parse(txt.replace(/```json|```/g,"").trim()));
    } catch(e){setRes({error:e.message==="rate_limit"?"You've reached the free limit. Upgrade to Pro for unlimited analyses.":"Analysis failed. Please try again."});}
    setLoading(false);
  };
  return (<div>
    <div style={{background:"rgba(255,77,109,.06)",border:"1px solid rgba(255,77,109,.16)",borderRadius:"9px",padding:"10px 13px",marginBottom:"16px",fontSize:".79rem",color:C.muted}}>
      ⚕️ <strong style={{color:C.red}}>Mind That Piece Health Analysis</strong> — Evidence-based population data for educational purposes only. This is <strong>NOT</strong> medical advice. Always consult a qualified healthcare professional.
    </div>
    <div className="grid-2">
      <div className="field"><label>Condition</label><select value={condition} onChange={e=>setCondition(e.target.value)}>{CONDITIONS.map(c=><option key={c}>{c}</option>)}</select></div>
      <div className="field"><label>Age</label><input type="number" min="18" max="95" value={age} onChange={e=>setAge(e.target.value)} /></div>
      <div className="field"><label>Biological Sex</label><select value={sex} onChange={e=>setSex(e.target.value)}><option value="male">Male</option><option value="female">Female</option></select></div>
      <div className="field"><label>Race / Ethnicity</label><select value={race} onChange={e=>setRace(e.target.value)}><option value="White">White / Caucasian</option><option value="Black">Black / African American</option><option value="Hispanic">Hispanic / Latino</option><option value="South Asian">South Asian</option><option value="East Asian">East Asian</option><option value="Mixed">Mixed / Other</option></select></div>
      <div className="field"><label>BMI Category</label><select value={bmi} onChange={e=>setBmi(e.target.value)}><option value="underweight">Underweight (&lt;18.5)</option><option value="normal">Normal (18.5–24.9)</option><option value="overweight">Overweight (25–29.9)</option><option value="obese">Obese Class I (30–34.9)</option><option value="severely obese">Obese Class II (35–39.9)</option><option value="morbidly obese">Morbidly Obese (40+)</option></select></div>
      <div className="field"><label>Smoking</label><select value={smoking} onChange={e=>setSmoking(e.target.value)}><option value="never">Never Smoked</option><option value="ex-smoker">Ex-Smoker</option><option value="current-light">Current: Light</option><option value="current-heavy">Current: Heavy</option></select></div>
    </div>
    <div style={{marginTop:"13px"}}>
      <label style={{fontSize:".74rem",fontWeight:"600",color:C.muted,textTransform:"uppercase",letterSpacing:".08em"}}>Comorbidities</label>
      <div className="category-pills" style={{marginTop:"7px"}}>{comOpts.map(c=><button key={c} className={`category-pill ${comorbidities.includes(c)?"active":""}`} onClick={()=>toggle(c)}>{c}</button>)}</div>
    </div>
    <button className="btn btn-danger btn-full" onClick={run} disabled={loading}>{loading?"⏳ Analysing...":"🔬 Predict Health Trajectory"}</button>
    {loading && <div className="loading-spinner"><div className="spinner"/>Analysing clinical data and population studies...</div>}
    {res && !res.error && (<div className="results-box" style={{marginTop:"20px",borderColor:"rgba(255,77,109,.16)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"13px",flexWrap:"wrap",gap:"8px"}}>
        <div><h3 style={{fontSize:"1rem",fontWeight:"700",marginBottom:"3px"}}>{condition}</h3><p style={{fontSize:".79rem",color:C.muted}}>{age}yo {sex}, {race}, {bmi} BMI, {smoking}</p></div>
        <span className={`risk-badge ${riskClass(res.riskLevel)}`}>{res.riskLevel} Risk</span>
      </div>
      <p style={{fontSize:".85rem",lineHeight:"1.65",marginBottom:"16px"}}>{res.summary}</p>

      {/* ── AI-generated personalised GP recommendation — rendered prominently ── */}
      {res.gpRecommendation && (
        <div style={{
          background:"rgba(0,212,255,.07)",
          border:`1px solid rgba(0,212,255,.28)`,
          borderRadius:"10px",
          padding:"12px 15px",
          marginBottom:"14px",
          display:"flex",
          gap:"10px",
          alignItems:"flex-start",
        }}>
          <span style={{fontSize:"1.2rem",flexShrink:0}}>💬</span>
          <p style={{fontSize:".84rem",lineHeight:"1.65",color:C.text,fontStyle:"italic"}}>
            "{res.gpRecommendation}"
          </p>
        </div>
      )}

      {res.statisticsSnapshot && <div className="stat-chips">{Object.entries(res.statisticsSnapshot).map(([k,v])=><div className="stat-chip" key={k}><span>{k.replace(/_/g," ")}</span><strong>{v}</strong></div>)}</div>}
      <div className="divider" />
      <div className="section-sub">Progression Timeline</div>
      {res.progressionTimeline?.map((t,i)=><div className="timeline-block" key={i}><div className="timeline-title">{t.timeframe}</div><div className="timeline-content">{t.description}</div></div>)}
      <div className="divider" />
      <div className="section-sub">Treatment Outcome Comparison</div>
      <div className="outcome-split">
        <div className="outcome-card outcome-treated"><h4>✅ With Treatment</h4><p style={{marginBottom:"9px"}}>{res.withTreatment?.outcomes}</p>{res.withTreatment?.key_interventions?.map((k,i)=><div key={i} style={{fontSize:".77rem",padding:"3px 0",borderTop:`1px solid rgba(0,224,150,.1)`,color:C.green}}>• {k}</div>)}</div>
        <div className="outcome-card outcome-untreated"><h4>⚠️ Without Treatment</h4><p style={{marginBottom:"9px"}}>{res.withoutTreatment?.outcomes}</p>{res.withoutTreatment?.complications?.map((k,i)=><div key={i} style={{fontSize:".77rem",padding:"3px 0",borderTop:`1px solid rgba(255,77,109,.1)`,color:C.red}}>• {k}</div>)}</div>
      </div>
      {res.demographicFactors && <><div className="divider"/><div className="section-sub">Demographic Risk Factors</div><p style={{fontSize:".85rem",lineHeight:"1.65",color:C.muted}}>{res.demographicFactors}</p></>}
      {res.recommendedSpecialists && <><div className="divider"/><div className="section-sub">Recommended Specialists</div><div className="category-pills">{res.recommendedSpecialists.map((s,i)=><span key={i} className="category-pill" style={{cursor:"default"}}>🏥 {s}</span>)}</div></>}
      {res.evidenceBase && <div style={{marginTop:"9px",fontSize:".74rem",color:C.dim,fontStyle:"italic"}}>Evidence: {res.evidenceBase}</div>}

      {/* ── HARDCODED GP REFERRAL CARD — always present, no exceptions ── */}
      <GPReferralCard riskLevel={res.riskLevel} condition={condition} />

    </div>)}
    {res?.error && <div className="results-box" style={{marginTop:"16px",borderColor:C.red}}><p style={{color:C.red}}>⚠️ {res.error}</p></div>}
  </div>);
}

// ============================================================
// MAX CHAT PANEL
// ============================================================
const TAB_CTX={salary:"salary and tax calculations",benefits:"UK benefits and welfare entitlements",budget:"personal budget planning",currency:"currency exchange and inflation",health:"health conditions and medical outcomes"};
const QUICK={
  salary:["What's a tax code?","How to reduce my tax?","Explain NI contributions"],
  benefits:["Am I eligible for UC?","What is PIP?","Benefits for self-employed?"],
  budget:["Best budgeting method?","50/30/20 rule explained","Tips to cut expenses"],
  currency:["What causes inflation?","Best time to exchange?","How to protect savings"],
  health:["What affects prognosis?","How do comorbidities change risk?","Explain treatment efficacy"],
};

function MaxChatPanel({ activeTab, memoryRef, onLearn }) {
  const [msgs,setMsgs]=useState([]);const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);const [mood,setMood]=useState("idle");
  const [showBubble,setShowBubble]=useState(false);const [bubbleText,setBubbleText]=useState("");
  const [isOpen,setIsOpen]=useState(false);const [userName,setUserName]=useState(memoryRef.current.userName);
  const endRef=useRef(null);
  useEffect(()=>{if(isOpen&&msgs.length===0){const g=memoryRef.current.userName?`Welcome back, ${memoryRef.current.userName}! 👋 I'm Max, your personal advisor for Mind That Piece. I can see you're on the ${activeTab} tab — ask me anything about ${TAB_CTX[activeTab]}, or anything else!`:"Hi there! 👋 I'm **Max**, your AI financial and health advisor for Mind That Piece. I can help with taxes, benefits, budgets, currencies, and health questions. What's your name?";setMsgs([{role:"assistant",text:g}]);setMood("waving");setTimeout(()=>setMood("idle"),2500);}}, [isOpen]);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[msgs]);
  useEffect(()=>{const tips={salary:"💡 The UK personal allowance is £12,570 for 2024/25.",benefits:"💡 Millions of pounds in benefits go unclaimed every year.",budget:"💡 Try the 50/30/20 rule: needs, wants, and savings.",currency:"💡 Inflation at 2% halves your money's value in ~35 years.",health:"💡 Early treatment intervention dramatically improves outcomes."};if(!isOpen){setBubbleText(tips[activeTab]);setShowBubble(true);const t=setTimeout(()=>setShowBubble(false),4500);return()=>clearTimeout(t);}}, [activeTab,isOpen]);

  const send=async(msgText)=>{
    const text=(msgText||input).trim();if(!text)return;
    setInput("");const newMsgs=[...msgs,{role:"user",text}];setMsgs(newMsgs);setLoading(true);setMood("thinking");
    memoryRef.current.interactions+=1;
    if(!memoryRef.current.topicsDiscussed.includes(activeTab)) memoryRef.current.topicsDiscussed.push(activeTab);
    const nameMatch=text.match(/(?:i(?:'m| am)|call me|my name is|name's)\s+([A-Z][a-z]+)/i);
    if(nameMatch&&!memoryRef.current.userName){memoryRef.current.userName=nameMatch[1];setUserName(nameMatch[1]);onLearn(nameMatch[1]);}
    if(text.toLowerCase().includes("i earn")||text.toLowerCase().includes("my salary")) memoryRef.current.notes.push(`Salary context: "${text.slice(0,60)}"`);
    if(["diabetes","heart","condition","cancer","copd"].some(w=>text.toLowerCase().includes(w))) memoryRef.current.notes.push(`Health context: "${text.slice(0,60)}"`);
    const system=`You are Max, a warm, knowledgeable, and occasionally witty AI advisor for Mind That Piece — a UK finance and health intelligence platform. You wear glasses, a dark suit, and a red tie.
Personality: friendly, professional, British English primarily, gives specific actionable advice.
Current tab: "${activeTab}" (${TAB_CTX[activeTab]}).
User name: ${memoryRef.current.userName||"unknown"}.
Topics explored: ${memoryRef.current.topicsDiscussed.join(", ")||"none yet"}.
Things you know: ${memoryRef.current.notes.join("; ")||"nothing yet"}.
IMPORTANT: Always end health advice with a reminder to consult a doctor. Always end financial advice with a reminder these are estimates only.
Keep responses concise (2-4 sentences) unless the question needs more detail.`;
    try {
      const reply=await callBackend(newMsgs.map(m=>({role:m.role,content:m.text})),system,1000);
      setMsgs(p=>[...p,{role:"assistant",text:reply}]);setMood("happy");setTimeout(()=>setMood("idle"),2000);
    } catch(e){
      const errMsg=e.message==="rate_limit"?"You've hit the free query limit for today. Upgrade to Pro for unlimited Max conversations! 🚀":"Connection issue — give me another go in a moment.";
      setMsgs(p=>[...p,{role:"assistant",text:errMsg}]);setMood("alert");setTimeout(()=>setMood("idle"),2000);
    }
    setLoading(false);
  };

  return (<>
    {!isOpen && (<div className="max-fab">
      {showBubble && <div className="max-tip">{bubbleText}</div>}
      <div className="max-circle" onClick={()=>setIsOpen(true)}><MaxCharacter mood="idle" size={58} /></div>
      <div className="max-label">Ask Max</div>
    </div>)}
    {isOpen && (<div className="max-panel">
      <div className="max-panel-header">
        <div style={{flexShrink:0}}><MaxCharacter mood={loading?"thinking":mood} size={50} /></div>
        <div style={{flex:1}}>
          <div style={{fontWeight:"700",fontSize:"1rem",color:C.text}}>Max {userName?`· Hi, ${userName}!`:""}</div>
          <div style={{fontSize:".7rem",color:C.accent,display:"flex",alignItems:"center",gap:"5px"}}>
            <span style={{width:5,height:5,borderRadius:"50%",background:loading?C.gold:C.green,display:"inline-block"}} />
            {loading?"Thinking...":TAB_CTX[activeTab]}
          </div>
        </div>
        <div style={{display:"flex",gap:"5px",alignItems:"center"}}>
          <div style={{fontSize:".68rem",background:C.surfaceAlt,color:C.muted,padding:"2px 7px",borderRadius:"99px"}}>{memoryRef.current.interactions} chats</div>
          <button onClick={()=>setIsOpen(false)} style={{background:"rgba(255,77,109,.14)",border:"1px solid rgba(255,77,109,.28)",borderRadius:"7px",color:C.red,cursor:"pointer",padding:"4px 9px",fontSize:".78rem"}}>✕</button>
        </div>
      </div>
      <div className="max-panel-messages">
        {msgs.map((m,i)=>(<div key={i} className={`max-msg ${m.role==="user"?"user":""}`}>
          {m.role==="assistant" && <div style={{flexShrink:0}}><MaxCharacter mood="idle" size={26} /></div>}
          <div className={`max-bubble ${m.role==="user"?"user":""}`}>{m.text}</div>
        </div>))}
        {loading && (<div style={{display:"flex",alignItems:"center",gap:"6px",padding:"5px 0"}}>
          <MaxCharacter mood="thinking" size={26} />
          <div style={{display:"flex",gap:"4px"}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:C.accent,animation:`bounce .9s ${i*.2}s infinite`}} />)}</div>
        </div>)}
        <div ref={endRef} />
      </div>
      <div className="max-quick">{(QUICK[activeTab]||[]).map((q,i)=><button key={i} className="max-quick-btn" onClick={()=>send(q)}>{q}</button>)}</div>
      <div className="max-input-row">
        <input className="max-input" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder={`Ask Max about ${activeTab}...`} />
        <button className="max-send" onClick={()=>send()} disabled={loading||!input.trim()}>➤</button>
      </div>
      {memoryRef.current.notes.length>0 && <div className="max-memory-bar">🧠 Max remembers {memoryRef.current.notes.length} thing{memoryRef.current.notes.length!==1?"s":""} about you this session</div>}
    </div>)}
  </>);
}

// ============================================================
// MAIN APP
// ============================================================
const TABS=[
  {id:"salary",label:"💷 Salary & Tax",health:false},
  {id:"benefits",label:"🏛️ Benefits",health:false},
  {id:"budget",label:"📊 Budget",health:false},
  {id:"currency",label:"💱 Currency & Inflation",health:false},
  {id:"health",label:"🧬 Health Predictor",health:true},
];

export default function App() {
  const [activeTab,setActiveTab]=useState("salary");
  const memoryRef=useRef(maxMemory);
  const [knownName,setKnownName]=useState(null);
  // Modal / page state
  const [modal,setModal]=useState(null); // "disclaimer"|"privacy"|"terms"|"cookies"|"about"|"contact"|"pricing"
  // Cookie consent
  const [cookieState,setCookieState]=useState(()=>{
    try{return localStorage.getItem("mtp_cookie_consent")||"pending";}catch{return "pending";}
  });
  const acceptCookies=()=>{try{localStorage.setItem("mtp_cookie_consent","accepted");}catch{}setCookieState("accepted");};
  const rejectCookies=()=>{try{localStorage.setItem("mtp_cookie_consent","rejected");}catch{}setCookieState("rejected");};

  const openModal=(m)=>setModal(m);
  const closeModal=()=>setModal(null);

  const MODAL_MAP={
    disclaimer:{title:"Disclaimer — Mind That Piece",content:<DisclaimerContent/>},
    privacy:{title:"Privacy Policy — Mind That Piece",content:<PrivacyContent/>},
    terms:{title:"Terms of Service — Mind That Piece",content:<TermsContent/>},
    cookies:{title:"Cookie Policy — Mind That Piece",content:<CookieContent/>},
    about:{title:"About Mind That Piece",content:null},
    contact:{title:"Contact Us",content:null},
    pricing:{title:"Plans & Pricing",content:null},
  };

  return (<>
    <style>{css}</style>
    <div className="site-wrap">

      {/* ── TOP BAR ── */}
      <nav className="topbar">
        <div className="topbar-brand">
          {/* Logo mark */}
          <svg className="topbar-logo" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="19" stroke="#00D4FF" strokeWidth="1.5" fill="none"/>
            <text x="20" y="26" textAnchor="middle" fontSize="16" fontWeight="700" fill="#00D4FF" fontFamily="Arial">M</text>
            <circle cx="20" cy="20" r="8" stroke="#A78BFA" strokeWidth="1" fill="none" opacity=".5"/>
          </svg>
          <span className="topbar-name">Mind That Piece</span>
        </div>
        <div className="topbar-links">
          <button className="topbar-link" onClick={()=>openModal("about")}>About</button>
          <button className="topbar-link" onClick={()=>openModal("pricing")}>Pricing</button>
          <button className="topbar-link" onClick={()=>openModal("contact")}>Contact</button>
        </div>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <div className="suite-wrap">
        <div className="suite-header">
          <h1>Mind That Piece</h1>
          <p>Finance & Health Intelligence Suite · Tax · Benefits · Budget · Currency · AI Health{knownName?` · Welcome back, ${knownName}!`:""}</p>
        </div>

        <div className="nav-tabs">
          {TABS.map(t=>(
            <button key={t.id} className={`nav-tab ${t.health?"health":""} ${activeTab===t.id?"active":""}`}
              onClick={()=>{setActiveTab(t.id);memoryRef.current.lastTab=t.id;}}>
              {t.label}
            </button>
          ))}
        </div>

        <div className={`panel ${activeTab==="health"?"health-panel":""}`}>
          {activeTab==="salary"   && <><div className="panel-title">💷 Salary & Tax Calculator</div><SalaryTaxCalculator /></>}
          {activeTab==="benefits" && <><div className="panel-title">🏛️ UK Benefits Estimator</div><BenefitsCalculator /></>}
          {activeTab==="budget"   && <><div className="panel-title">📊 Monthly Budget Planner</div><BudgetPlanner /></>}
          {activeTab==="currency" && <><div className="panel-title">💱 Currency & Inflation</div><CurrencyInflation /></>}
          {activeTab==="health"   && <><div className="panel-title" style={{color:C.red}}>🧬 AI Health Deterioration Predictor</div><HealthPredictor /></>}
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="footer-brand-name">Mind That Piece</div>
              <div className="footer-brand-desc">Finance & Health Intelligence Suite. Free tools for everyday financial and health awareness.</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
              <div style={{fontSize:".72rem",color:C.dim,marginBottom:"4px",fontWeight:"600",textTransform:"uppercase",letterSpacing:".06em"}}>Legal</div>
              <div className="footer-links" style={{flexDirection:"column",alignItems:"flex-start"}}>
                <button className="footer-link" onClick={()=>openModal("disclaimer")}>Disclaimer</button>
                <button className="footer-link" onClick={()=>openModal("privacy")}>Privacy Policy</button>
                <button className="footer-link" onClick={()=>openModal("terms")}>Terms of Service</button>
                <button className="footer-link" onClick={()=>openModal("cookies")}>Cookie Policy</button>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
              <div style={{fontSize:".72rem",color:C.dim,marginBottom:"4px",fontWeight:"600",textTransform:"uppercase",letterSpacing:".06em"}}>Company</div>
              <div className="footer-links" style={{flexDirection:"column",alignItems:"flex-start"}}>
                <button className="footer-link" onClick={()=>openModal("about")}>About</button>
                <button className="footer-link" onClick={()=>openModal("pricing")}>Pricing</button>
                <button className="footer-link" onClick={()=>openModal("contact")}>Contact</button>
              </div>
            </div>
          </div>
          <div className="footer-divider" />
          <div className="footer-bottom">
            <div className="footer-copy">© 2026 Mind That Piece — All Rights Reserved.</div>
            <div className="footer-legal">Educational purposes only. Not financial or medical advice.</div>
          </div>
        </div>
      </footer>
    </div>

    {/* ── MAX AI ASSISTANT ── */}
    <MaxChatPanel activeTab={activeTab} memoryRef={memoryRef} onLearn={setKnownName} />

    {/* ── COOKIE CONSENT BANNER ── */}
    {cookieState==="pending" && (
      <CookieBanner
        onAccept={acceptCookies}
        onReject={rejectCookies}
        onLearnMore={()=>openModal("cookies")}
      />
    )}

    {/* ── MODALS ── */}
    {modal==="about"    && <AboutPage onClose={closeModal} />}
    {modal==="contact"  && <ContactPage onClose={closeModal} />}
    {modal==="pricing"  && <PricingPage onClose={closeModal} />}
    {modal && !["about","contact","pricing"].includes(modal) && MODAL_MAP[modal] && (
      <Modal title={MODAL_MAP[modal].title} onClose={closeModal}>
        {MODAL_MAP[modal].content}
      </Modal>
    )}
  </>);
}
