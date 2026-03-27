"use client";
import { useState, useEffect, useRef, useCallback } from "react";

// Public inbox for the Contacts modal (service issues). Replace with your real address.
const SUPPORT_EMAIL = "support@atlasswap.io";

// ═══════════════════════════════════════════════════════════════
// COIN DATA — 100 coins (expanded from 25)
// Covers top 100 by market cap + high-demand swap pairs
// Each provider API supports all of these natively
// ═══════════════════════════════════════════════════════════════
const COINS = [
  // ── Tier 1: Top 10 by volume ──────────────────────────────
  { symbol: "BTC",   name: "Bitcoin",          color: "#F7931A", bg: "#1a0f00", icon: "₿"  },
  { symbol: "ETH",   name: "Ethereum",         color: "#7B9EF0", bg: "#0a0f20", icon: "Ξ"  },
  { symbol: "USDT",  name: "Tether",           color: "#26A17B", bg: "#001a13", icon: "T"  },
  { symbol: "BNB",   name: "BNB",              color: "#F3BA2F", bg: "#1a1200", icon: "◈"  },
  { symbol: "SOL",   name: "Solana",           color: "#9945FF", bg: "#0f0020", icon: "◎"  },
  { symbol: "USDC",  name: "USD Coin",         color: "#2775CA", bg: "#001020", icon: "©"  },
  { symbol: "XRP",   name: "XRP",              color: "#00AAE4", bg: "#001a25", icon: "✕"  },
  { symbol: "DOGE",  name: "Dogecoin",         color: "#C2A633", bg: "#1a1500", icon: "Ð"  },
  { symbol: "ADA",   name: "Cardano",          color: "#4B9CD3", bg: "#001525", icon: "₳"  },
  { symbol: "TRX",   name: "TRON",             color: "#FF3D3D", bg: "#200000", icon: "◉"  },
  // ── Tier 2: Layer 1 blockchains ───────────────────────────
  { symbol: "AVAX",  name: "Avalanche",        color: "#E84142", bg: "#200000", icon: "▲"  },
  { symbol: "TON",   name: "Toncoin",          color: "#0098EA", bg: "#001525", icon: "◆"  },
  { symbol: "DOT",   name: "Polkadot",         color: "#E6007A", bg: "#200015", icon: "●"  },
  { symbol: "MATIC", name: "Polygon",          color: "#8247E5", bg: "#0d0025", icon: "⬟"  },
  { symbol: "LTC",   name: "Litecoin",         color: "#A0A0A0", bg: "#111111", icon: "Ł"  },
  { symbol: "BCH",   name: "Bitcoin Cash",     color: "#8DC351", bg: "#0a1500", icon: "Ƀ"  },
  { symbol: "ATOM",  name: "Cosmos",           color: "#6F7390", bg: "#0a0a15", icon: "⚛"  },
  { symbol: "NEAR",  name: "NEAR Protocol",    color: "#00C08B", bg: "#001a13", icon: "Ⓝ"  },
  { symbol: "FTM",   name: "Fantom",           color: "#1969FF", bg: "#000d25", icon: "⬡"  },
  { symbol: "ALGO",  name: "Algorand",         color: "#FFFFFF", bg: "#101010", icon: "Ⓐ"  },
  { symbol: "XLM",   name: "Stellar",          color: "#7D98B3", bg: "#0a1018", icon: "✦"  },
  { symbol: "VET",   name: "VeChain",          color: "#15BDFF", bg: "#001525", icon: "✔"  },
  { symbol: "HBAR",  name: "Hedera",           color: "#00ADED", bg: "#001520", icon: "ℏ"  },
  { symbol: "ICP",   name: "Internet Computer",color: "#3B00B9", bg: "#0d0020", icon: "∞"  },
  { symbol: "APT",   name: "Aptos",            color: "#BDCCDE", bg: "#101520", icon: "◎"  },
  { symbol: "SUI",   name: "Sui",              color: "#6FBCF0", bg: "#001020", icon: "◉"  },
  { symbol: "SEI",   name: "Sei",              color: "#FF4D4D", bg: "#200000", icon: "Ⓢ"  },
  { symbol: "STX",   name: "Stacks",           color: "#FF5500", bg: "#1a0d00", icon: "₿"  },
  { symbol: "EGLD",  name: "MultiversX",       color: "#23F7DD", bg: "#001a18", icon: "⬡"  },
  { symbol: "FIL",   name: "Filecoin",         color: "#0090FF", bg: "#001525", icon: "⬡"  },
  // ── Tier 3: DeFi tokens ───────────────────────────────────
  { symbol: "UNI",   name: "Uniswap",          color: "#FF007A", bg: "#200015", icon: "♦"  },
  { symbol: "LINK",  name: "Chainlink",        color: "#375BD2", bg: "#000d25", icon: "⬡"  },
  { symbol: "AAVE",  name: "Aave",             color: "#B6509E", bg: "#1a001a", icon: "Ⓐ"  },
  { symbol: "CRV",   name: "Curve DAO",        color: "#FF0000", bg: "#200000", icon: "©"  },
  { symbol: "MKR",   name: "Maker",            color: "#1AAB9B", bg: "#001a18", icon: "Ⓜ"  },
  { symbol: "SNX",   name: "Synthetix",        color: "#00D1FF", bg: "#001520", icon: "Ⓢ"  },
  { symbol: "COMP",  name: "Compound",         color: "#00D395", bg: "#001a12", icon: "©"  },
  { symbol: "LDO",   name: "Lido DAO",         color: "#F6C944", bg: "#1a1400", icon: "Ⓛ"  },
  { symbol: "CAKE",  name: "PancakeSwap",      color: "#D1884F", bg: "#1a1000", icon: "🥞" },
  { symbol: "1INCH", name: "1inch",            color: "#D82122", bg: "#200000", icon: "①"  },
  // ── Tier 4: Layer 2 & Scaling ─────────────────────────────
  { symbol: "ARB",   name: "Arbitrum",         color: "#28A0F0", bg: "#001520", icon: "Ⓐ"  },
  { symbol: "OP",    name: "Optimism",         color: "#FF0420", bg: "#200000", icon: "Θ"  },
  { symbol: "IMX",   name: "Immutable",        color: "#00D0FF", bg: "#001520", icon: "⬡"  },
  { symbol: "STRK",  name: "Starknet",         color: "#EC796B", bg: "#1a0f0d", icon: "★"  },
  { symbol: "MANTA", name: "Manta Network",    color: "#60A5FA", bg: "#001020", icon: "Ⓜ"  },
  // ── Tier 5: Meme coins ────────────────────────────────────
  { symbol: "SHIB",  name: "Shiba Inu",        color: "#FFA409", bg: "#1a0f00", icon: "犬" },
  { symbol: "PEPE",  name: "Pepe",             color: "#4CAF50", bg: "#001400", icon: "🐸" },
  { symbol: "FLOKI", name: "Floki",            color: "#F0B90B", bg: "#1a1200", icon: "⚡" },
  { symbol: "BONK",  name: "Bonk",             color: "#F97316", bg: "#1a0d00", icon: "🐕" },
  { symbol: "WIF",   name: "dogwifhat",        color: "#E040FB", bg: "#1a0020", icon: "🎩" },
  // ── Tier 6: Privacy coins ─────────────────────────────────
  { symbol: "XMR",   name: "Monero",           color: "#FF6600", bg: "#1a0a00", icon: "ɱ"  },
  { symbol: "ZEC",   name: "Zcash",            color: "#ECB244", bg: "#1a1200", icon: "ⓩ"  },
  { symbol: "DASH",  name: "Dash",             color: "#008CE7", bg: "#001525", icon: "Đ"  },
  { symbol: "XVG",   name: "Verge",            color: "#40C4FF", bg: "#001520", icon: "Ⓥ"  },
  // ── Tier 7: Exchange & utility tokens ─────────────────────
  { symbol: "CRO",   name: "Cronos",           color: "#002D74", bg: "#000d25", icon: "©"  },
  { symbol: "OKB",   name: "OKB",              color: "#2B60DC", bg: "#000d25", icon: "Ⓞ"  },
  { symbol: "HT",    name: "Huobi Token",      color: "#1F72BB", bg: "#001020", icon: "Ⓗ"  },
  // ── Tier 8: Cosmos ecosystem ──────────────────────────────
  { symbol: "OSMO",  name: "Osmosis",          color: "#750BBB", bg: "#0d0020", icon: "◎"  },
  { symbol: "INJ",   name: "Injective",        color: "#00B2FF", bg: "#001a25", icon: "◈"  },
  { symbol: "KAVA",  name: "Kava",             color: "#FF564F", bg: "#200000", icon: "Ⓚ"  },
  { symbol: "JUNO",  name: "Juno",             color: "#F0827D", bg: "#200010", icon: "Ⓙ"  },
  { symbol: "STARS", name: "Stargaze",         color: "#7C3AED", bg: "#0d0020", icon: "★"  },
  // ── Tier 9: Stablecoins ───────────────────────────────────
  { symbol: "DAI",   name: "Dai",              color: "#F5AC37", bg: "#1a1100", icon: "◈"  },
  { symbol: "BUSD",  name: "Binance USD",      color: "#F0B90B", bg: "#1a1200", icon: "Ƀ"  },
  { symbol: "TUSD",  name: "TrueUSD",          color: "#002868", bg: "#000510", icon: "Ⓣ"  },
  // ── Tier 10: Gaming & Metaverse ───────────────────────────
  { symbol: "SAND",  name: "The Sandbox",      color: "#04ADEF", bg: "#001520", icon: "⬡"  },
  { symbol: "MANA",  name: "Decentraland",     color: "#FF2D55", bg: "#200010", icon: "Ⓜ"  },
  { symbol: "AXS",   name: "Axie Infinity",    color: "#0055D5", bg: "#000d25", icon: "Ⓐ"  },
  { symbol: "ENJ",   name: "Enjin Coin",       color: "#7866D5", bg: "#0a0d25", icon: "Ⓔ"  },
  { symbol: "GALA",  name: "Gala",             color: "#0073FF", bg: "#001525", icon: "Ⓖ"  },
  { symbol: "IMX",   name: "Immutable X",      color: "#00D0FF", bg: "#001520", icon: "⬡"  },
  // ── Tier 11: AI & Data tokens ─────────────────────────────
  { symbol: "FET",   name: "Fetch.ai",         color: "#1DA2FF", bg: "#001520", icon: "Ⓕ"  },
  { symbol: "OCEAN", name: "Ocean Protocol",   color: "#1A6BFF", bg: "#000d25", icon: "Ⓞ"  },
  { symbol: "RNDR",  name: "Render",           color: "#FF4D00", bg: "#1a0d00", icon: "Ⓡ"  },
  { symbol: "WLD",   name: "Worldcoin",        color: "#191919", bg: "#0a0a0a", icon: "Ⓦ"  },
  // ── Tier 12: Other high-demand ────────────────────────────
  { symbol: "GRT",   name: "The Graph",        color: "#5942C4", bg: "#0a0820", icon: "Ⓖ"  },
  { symbol: "LRC",   name: "Loopring",         color: "#1C60FF", bg: "#000d25", icon: "Ⓛ"  },
  { symbol: "CHZ",   name: "Chiliz",           color: "#CD0124", bg: "#200000", icon: "Ⓒ"  },
  { symbol: "BAT",   name: "Basic Attn Token", color: "#FF5000", bg: "#1a1000", icon: "Ⓑ"  },
  { symbol: "ZIL",   name: "Zilliqa",          color: "#49C1BF", bg: "#001a1a", icon: "Ⓩ"  },
  { symbol: "IOTA",  name: "IOTA",             color: "#131F37", bg: "#0a0f1a", icon: "Ⓘ"  },
  { symbol: "THETA", name: "Theta Network",    color: "#2AB8E6", bg: "#001520", icon: "Θ"  },
  { symbol: "EOS",   name: "EOS",              color: "#000000", bg: "#0a0a0a", icon: "Ⓔ"  },
  { symbol: "XTZ",   name: "Tezos",            color: "#2C7DF7", bg: "#001020", icon: "ꜩ"  },
  { symbol: "XEM",   name: "NEM",              color: "#67B2E8", bg: "#001520", icon: "Ⓝ"  },
  { symbol: "WAVES", name: "Waves",            color: "#0155FF", bg: "#001525", icon: "Ⓦ"  },
  { symbol: "QTUM",  name: "Qtum",             color: "#2895D8", bg: "#001520", icon: "Ⓠ"  },
  { symbol: "KCS",   name: "KuCoin Token",     color: "#24AE8F", bg: "#001a15", icon: "Ⓚ"  },
  { symbol: "ROSE",  name: "Oasis Network",    color: "#0092F6", bg: "#001525", icon: "Ⓡ"  },
  { symbol: "CFX",   name: "Conflux",          color: "#15C0E6", bg: "#001520", icon: "Ⓒ"  },
  { symbol: "KSM",   name: "Kusama",           color: "#E8026D", bg: "#200015", icon: "Ⓚ"  },
  { symbol: "ZEN",   name: "Horizen",          color: "#041742", bg: "#000510", icon: "Ⓩ"  },
  { symbol: "DCR",   name: "Decred",           color: "#2ED8A3", bg: "#001a14", icon: "Ð"  },
  { symbol: "RVN",   name: "Ravencoin",        color: "#384182", bg: "#0a0d1a", icon: "Ⓡ"  },
  { symbol: "SC",    name: "Siacoin",          color: "#1ED660", bg: "#001a0d", icon: "Ⓢ"  },
  { symbol: "DGB",   name: "DigiByte",         color: "#0066CC", bg: "#001020", icon: "Ð"  },
];

// Remove duplicate IMX entry
const COINS_DEDUPED = COINS.filter((c, i, arr) => arr.findIndex(x => x.symbol === c.symbol) === i);

const BASE_RATES = {
  BTC:87500, ETH:3350,  USDT:1,    BNB:590,   SOL:178,
  USDC:1,    XRP:0.61,  DOGE:0.13, ADA:0.47,  TRX:0.13,
  AVAX:37,   TON:5.8,   DOT:7.2,   MATIC:0.58,LTC:92,
  BCH:480,   ATOM:8.2,  NEAR:4.5,  FTM:0.85,  ALGO:0.19,
  XLM:0.12,  VET:0.038, HBAR:0.085,ICP:11,    APT:8.9,
  SUI:1.4,   SEI:0.42,  STX:1.8,   EGLD:28,   FIL:5.2,
  UNI:9.5,   LINK:15,   AAVE:185,  CRV:0.38,  MKR:1800,
  SNX:2.1,   COMP:52,   LDO:1.8,   CAKE:2.4,  "1INCH":0.38,
  ARB:1.12,  OP:1.85,   IMX:1.6,   STRK:0.42, MANTA:1.2,
  SHIB:0.000024,PEPE:0.0000085,FLOKI:0.000085,BONK:0.000025,WIF:2.8,
  XMR:165,   ZEC:32,    DASH:29,   XVG:0.007,
  CRO:0.095, OKB:48,    HT:2.8,
  OSMO:0.65, INJ:22,    KAVA:0.62, JUNO:0.28, STARS:0.014,
  DAI:1,     BUSD:1,    TUSD:1,
  SAND:0.38, MANA:0.42, AXS:6.5,   ENJ:0.18,  GALA:0.023,
  FET:1.8,   OCEAN:0.82,RNDR:6.2,  WLD:2.1,
  GRT:0.19,  LRC:0.22,  CHZ:0.085, BAT:0.22,  ZIL:0.012,
  IOTA:0.18, THETA:0.92,EOS:0.72,  XTZ:0.82,  XEM:0.028,
  WAVES:2.1, QTUM:2.8,  KCS:11,    ROSE:0.09, CFX:0.18,
  KSM:28,    ZEN:10,    DCR:18,    RVN:0.018, SC:0.0045,
  DGB:0.0095,
};

// Use deduped coins throughout the app
const COINS_LIST = COINS_DEDUPED;

// ═══════════════════════════════════════════════════════════════
// API LAYER — All provider calls go through Next.js server routes.
//
// WHY SERVER ROUTES?
//   - NEXT_PUBLIC_ env vars are baked into the JS bundle and
//     visible to anyone who opens DevTools.
//   - Provider APIs (SimpleSwap, ChangeNOW) reject requests
//     from unknown browser origins → 401 / 400 errors.
//   - Server routes call providers from Vercel's servers using
//     server-only env vars that never reach the browser.
//
// HOW IT WORKS:
//   Browser → POST /api/swap/rate  → Vercel server → all 3 providers
//   Browser → POST /api/swap/create → Vercel server → winning provider
//
// VERCEL ENV VARS REQUIRED (Settings → Environment Variables):
//   CHANGENOW_API_KEY   (no NEXT_PUBLIC_ prefix — server only)
//   SIMPLESWAP_API_KEY  (no NEXT_PUBLIC_ prefix — server only)
//   SWAPZONE_API_KEY    (no NEXT_PUBLIC_ prefix — server only)
//
// The old NEXT_PUBLIC_ vars still work as fallback in the routes.
// ═══════════════════════════════════════════════════════════════

// API route base — calls your own Next.js server, not providers directly
const API_BASE = "/api/swap";

// ── Cache + timing constants ───────────────────────────────────
const QUOTE_CACHE      = new Map();  // key → { data, expiresAt }
const CACHE_TTL        = 8000;       // 8s — expires before next 15s refresh
const REFRESH_INTERVAL = 15000;      // 15s auto-refresh
const DEBOUNCE_MS      = 400;        // debounce user input
const MAX_RETRIES      = 1;          // retries handled server-side

function fetchWithTimeout(url, init = {}, ms = 20000) {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return fetch(url, { ...init, signal: AbortSignal.timeout(ms) });
  }
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(id));
}

// ── Cache helpers ─────────────────────────────────────────────
function getCacheKey(from, to, amount) {
  return `${from}_${to}_${parseFloat(amount).toFixed(8)}`;
}
function getCached(from, to, amount) {
  const key = getCacheKey(from, to, amount);
  const entry = QUOTE_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { QUOTE_CACHE.delete(key); return null; }
  return entry.data;
}
function setCache(from, to, amount, data) {
  const key = getCacheKey(from, to, amount);
  QUOTE_CACHE.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
  if (QUOTE_CACHE.size > 100) {
    const now = Date.now();
    for (const [k, v] of QUOTE_CACHE) {
      if (now > v.expiresAt + 60000) QUOTE_CACHE.delete(k);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// fetchBestRate — calls /api/swap/rate (server-side)
// Returns: { best, quotes, allQuotes, minAmount, fromCache }
// ─────────────────────────────────────────────────────────────
async function fetchBestRate(from, to, amount) {
  const parsed = parseFloat(amount);
  if (!parsed || isNaN(parsed) || parsed <= 0) throw new Error("Invalid amount");

  // Cache hit — no API call needed
  const cached = getCached(from, to, parsed);
  if (cached) return { ...cached, fromCache: true };

  const res = await fetchWithTimeout(`${API_BASE}/rate`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ from, to, amount: parsed }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `Rate API ${res.status}`);
  }

  const payload = await res.json();
  const rawQuotes = Array.isArray(payload?.quotes)
    ? payload.quotes
    : Array.isArray(payload?.comparison)
      ? payload.comparison.map((q) => {
          const amountOut = Number(q.amountOut ?? q.rate ?? 0);
          const ratePerUnit =
            Number(q.rawRate) ||
            (parsed > 0 && amountOut ? amountOut / parsed : 0);
          return {
            provider: q.provider,
            fromToken: from,
            toToken: to,
            amountIn: parsed,
            amountOut,
            rate: ratePerUnit,
            estimatedTime: "",
            fees: 0.4,
            minAmount: Number(payload?.minAmount || 0),
            quotaId: q.quotaId || "",
            simulated: !!q.simulated,
            available: q.available !== false,
            error: q.error || null,
          };
        })
      : [];

  const liveSorted = [...rawQuotes]
    .filter((q) => q && !q.simulated && Number(q.amountOut) > 0)
    .sort((a, b) => Number(b.amountOut) - Number(a.amountOut));

  let best = payload?.best && Number(payload.best.amountOut) > 0 ? payload.best : null;
  if (!best || best.simulated) {
    best = liveSorted[0] || rawQuotes.find((q) => q && Number(q.amountOut) > 0) || null;
  }

  const result = {
    best,
    quotes: liveSorted,
    allQuotes: rawQuotes,
    minAmount: Number(payload?.minAmount || 0),
    fromCache: false,
  };

  setCache(from, to, parsed, result);
  return result;
}

// ─────────────────────────────────────────────────────────────
// createExchange — calls /api/swap/create (server-side)
// Returns: { depositAddress, exchangeId, payinExtraId, provider }
// ─────────────────────────────────────────────────────────────
async function createExchange(provider, from, to, amount, destAddress, extraData = {}) {
  if (!destAddress?.trim()) throw new Error("No destination address provided");

  const res = await fetchWithTimeout(`${API_BASE}/create`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      provider,
      from,
      to,
      amount:  Number(amount),
      address: destAddress.trim(),
      quotaId: extraData.quotaId || "",
    }),
  }, 30000);

  const data = await res.json();

  if (!res.ok) {
    // Pass through REAL_MIN marker for amount-too-low handling
    throw new Error(data?.error || `Create API ${res.status}`);
  }

  return {
    depositAddress: data.depositAddress || "",
    exchangeId:     data.exchangeId     || "",
    payinExtraId:   data.payinExtraId   || "",
    provider:       data.provider       || provider,
  };
}

// ─────────────────────────────────────────────────────────────
// Ticker price engine — uses /api/swap/rate to fetch live prices
// Derives USD price by fetching 1 COIN → USDT via server route
// ─────────────────────────────────────────────────────────────
async function fetchLivePriceViaServer(symbol) {
  // Stablecoins are always $1
  if (["USDT","USDC","DAI","BUSD","TUSD"].includes(symbol)) return 1;
  try {
    const res = await fetchWithTimeout(`${API_BASE}/rate`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ from: symbol, to: "USDT", amount: 1 }),
    }, 6000);
    if (!res.ok) return null;
    const { best } = await res.json();
    const price = best?.amountOut || 0;
    return price > 0 ? price : null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// ADDRESS VALIDATION — validates wallet address format per coin
// Catches wrong-network addresses before hitting the API
// ─────────────────────────────────────────────────────────────
const ADDRESS_VALIDATORS = {
  // Bitcoin family
  BTC:   a => /^(1|3|bc1)[a-zA-Z0-9]{25,62}$/.test(a),
  BCH:   a => /^(bitcoincash:)?(q|p)[a-z0-9]{41}$|^[13][a-zA-Z0-9]{25,34}$/.test(a),
  LTC:   a => /^(L|M|ltc1)[a-zA-Z0-9]{25,62}$/.test(a),
  DOGE:  a => /^D[a-zA-Z0-9]{33}$/.test(a),
  DCR:   a => /^D[a-zA-Z0-9]{33,35}$/.test(a),
  RVN:   a => /^R[a-zA-Z0-9]{33}$/.test(a),
  DGB:   a => /^D[a-zA-Z0-9]{33}$/.test(a),
  ZEC:   a => /^t1[a-zA-Z0-9]{33}$|^zs[a-zA-Z0-9]{76}$/.test(a),
  DASH:  a => /^X[a-zA-Z0-9]{33}$/.test(a),
  // Ethereum & EVM (all share same format)
  ETH:   a => /^0x[a-fA-F0-9]{40}$/.test(a),
  USDT:  a => /^0x[a-fA-F0-9]{40}$/.test(a),
  USDC:  a => /^0x[a-fA-F0-9]{40}$/.test(a),
  BNB:   a => /^0x[a-fA-F0-9]{40}$/.test(a),
  MATIC: a => /^0x[a-fA-F0-9]{40}$/.test(a),
  AVAX:  a => /^0x[a-fA-F0-9]{40}$/.test(a),
  LINK:  a => /^0x[a-fA-F0-9]{40}$/.test(a),
  UNI:   a => /^0x[a-fA-F0-9]{40}$/.test(a),
  SHIB:  a => /^0x[a-fA-F0-9]{40}$/.test(a),
  PEPE:  a => /^0x[a-fA-F0-9]{40}$/.test(a),
  FLOKI: a => /^0x[a-fA-F0-9]{40}$/.test(a),
  AAVE:  a => /^0x[a-fA-F0-9]{40}$/.test(a),
  CRV:   a => /^0x[a-fA-F0-9]{40}$/.test(a),
  MKR:   a => /^0x[a-fA-F0-9]{40}$/.test(a),
  SNX:   a => /^0x[a-fA-F0-9]{40}$/.test(a),
  COMP:  a => /^0x[a-fA-F0-9]{40}$/.test(a),
  LDO:   a => /^0x[a-fA-F0-9]{40}$/.test(a),
  "1INCH":a=> /^0x[a-fA-F0-9]{40}$/.test(a),
  ARB:   a => /^0x[a-fA-F0-9]{40}$/.test(a),
  OP:    a => /^0x[a-fA-F0-9]{40}$/.test(a),
  SAND:  a => /^0x[a-fA-F0-9]{40}$/.test(a),
  MANA:  a => /^0x[a-fA-F0-9]{40}$/.test(a),
  AXS:   a => /^0x[a-fA-F0-9]{40}$/.test(a),
  ENJ:   a => /^0x[a-fA-F0-9]{40}$/.test(a),
  GALA:  a => /^0x[a-fA-F0-9]{40}$/.test(a),
  FET:   a => /^0x[a-fA-F0-9]{40}$/.test(a),
  OCEAN: a => /^0x[a-fA-F0-9]{40}$/.test(a),
  RNDR:  a => /^0x[a-fA-F0-9]{40}$/.test(a),
  WLD:   a => /^0x[a-fA-F0-9]{40}$/.test(a),
  GRT:   a => /^0x[a-fA-F0-9]{40}$/.test(a),
  LRC:   a => /^0x[a-fA-F0-9]{40}$/.test(a),
  CHZ:   a => /^0x[a-fA-F0-9]{40}$/.test(a),
  BAT:   a => /^0x[a-fA-F0-9]{40}$/.test(a),
  DAI:   a => /^0x[a-fA-F0-9]{40}$/.test(a),
  TUSD:  a => /^0x[a-fA-F0-9]{40}$/.test(a),
  OKB:   a => /^0x[a-fA-F0-9]{40}$/.test(a),
  HT:    a => /^0x[a-fA-F0-9]{40}$/.test(a),
  CRO:   a => /^0x[a-fA-F0-9]{40}$/.test(a),
  IMX:   a => /^0x[a-fA-F0-9]{40}$/.test(a),
  STRK:  a => /^0x[a-fA-F0-9]{1,64}$/.test(a),
  // BNB Chain
  CAKE:  a => /^0x[a-fA-F0-9]{40}$/.test(a),
  BUSD:  a => /^0x[a-fA-F0-9]{40}$/.test(a),
  // Solana (Base58, 32-44 chars)
  SOL:   a => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a),
  BONK:  a => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a),
  WIF:   a => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a),
  // XRP
  XRP:   a => /^r[a-zA-Z0-9]{24,34}$/.test(a),
  // Cardano
  ADA:   a => /^(addr1|DdzFF)[a-zA-Z0-9]{50,120}$/.test(a),
  // Cosmos ecosystem
  ATOM:  a => /^cosmos1[a-z0-9]{38}$/.test(a),
  OSMO:  a => /^osmo1[a-z0-9]{38}$/.test(a),
  INJ:   a => /^inj1[a-z0-9]{38}$/.test(a),
  KAVA:  a => /^kava1[a-z0-9]{38}$/.test(a),
  JUNO:  a => /^juno1[a-z0-9]{38}$/.test(a),
  STARS: a => /^stars1[a-z0-9]{38}$/.test(a),
  // NEAR
  NEAR:  a => /^[a-z0-9_-]{2,64}(\.near)?$/.test(a),
  // Monero
  XMR:   a => /^4[a-zA-Z0-9]{94}$/.test(a),
  // TON
  TON:   a => /^(EQ|UQ)[a-zA-Z0-9_-]{46}$/.test(a),
  // SUI (0x + up to 64 hex)
  SUI:   a => /^0x[a-fA-F0-9]{40,64}$/.test(a),
  // Aptos
  APT:   a => /^0x[a-fA-F0-9]{1,64}$/.test(a),
  // Stellar
  XLM:   a => /^G[a-zA-Z0-9]{55}$/.test(a),
  // TRON
  TRX:   a => /^T[a-zA-Z0-9]{33}$/.test(a),
  // Polkadot
  DOT:   a => /^1[a-zA-Z0-9]{46,47}$/.test(a),
  KSM:   a => /^[CDEFGHJKLMNPQRSTUVWXYZ][a-zA-Z0-9]{46,47}$/.test(a),
  // Algorand
  ALGO:  a => /^[A-Z2-7]{58}$/.test(a),
  // VeChain
  VET:   a => /^0x[a-fA-F0-9]{40}$/.test(a),
  // Hedera
  HBAR:  a => /^0\.0\.\d+$/.test(a),
  // Tezos
  XTZ:   a => /^tz[123][a-zA-Z0-9]{33}$/.test(a),
  // EOS
  EOS:   a => /^[a-z1-5.]{1,12}$/.test(a),
  // Zilliqa
  ZIL:   a => /^zil1[a-z0-9]{38}$/.test(a),
  // Waves
  WAVES: a => /^3[a-zA-Z0-9]{34}$/.test(a),
  // IOTA
  IOTA:  a => /^iota1[a-z0-9]{59}$|^[A-Z9]{81,90}$/.test(a),
  // Theta
  THETA: a => /^0x[a-fA-F0-9]{40}$/.test(a),
  // QTUM
  QTUM:  a => /^Q[a-zA-Z0-9]{33}$/.test(a),
  // Others with ETH-style addresses
  FIL:   a => /^f1[a-z0-9]{38}$|^f3[a-z0-9]{84}$|^0x[a-fA-F0-9]{40}$/.test(a),
  ICP:   a => /^[a-z0-9-]{5,63}$/.test(a),
  STX:   a => /^S[PM][a-zA-Z0-9]{38,40}$/.test(a),
  EGLD:  a => /^erd1[a-z0-9]{58}$/.test(a),
  MANTA: a => /^0x[a-fA-F0-9]{40}$/.test(a),
  SEI:   a => /^sei1[a-z0-9]{38}$/.test(a),
  FTM:   a => /^0x[a-fA-F0-9]{40}$/.test(a),
  ROSE:  a => /^oasis1[a-z0-9]{40}$/.test(a),
  CFX:   a => /^0x[a-fA-F0-9]{40}$|^cfx:[a-z0-9]+$/.test(a),
  ZEN:   a => /^zn[a-zA-Z0-9]{33}$|^t1[a-zA-Z0-9]{33}$/.test(a),
  SC:    a => a.length > 20,  // Permissive fallback
  XVG:   a => /^D[a-zA-Z0-9]{33}$/.test(a),
  XEM:   a => /^N[A-Z2-7]{39}$/.test(a),
  DCR:   a => /^D[a-zA-Z0-9]{33,35}$/.test(a),
  KCS:   a => /^0x[a-fA-F0-9]{40}$/.test(a),
};

const ADDRESS_HINTS = {
  BTC:"Bitcoin address starts with 1, 3, or bc1",
  BCH:"Bitcoin Cash address starts with q or p (cashaddr) or 1/3 (legacy)",
  LTC:"Litecoin address starts with L, M, or ltc1",
  DOGE:"Dogecoin address starts with D",
  ZEC:"Zcash address starts with t1 (transparent) or zs (shielded)",
  DASH:"Dash address starts with X",
  DCR:"Decred address starts with D",
  RVN:"Ravencoin address starts with R",
  DGB:"DigiByte address starts with D",
  ETH:"Ethereum address: 0x followed by 40 hex characters",
  USDT:"USDT (ERC-20): 0x followed by 40 hex characters",
  USDC:"USDC: 0x followed by 40 hex characters",
  BNB:"BNB (BEP-20): 0x followed by 40 hex characters",
  MATIC:"Polygon: 0x followed by 40 hex characters",
  AVAX:"Avalanche C-Chain: 0x followed by 40 hex characters",
  LINK:"Chainlink (ERC-20): 0x followed by 40 hex characters",
  UNI:"Uniswap (ERC-20): 0x followed by 40 hex characters",
  SHIB:"SHIB (ERC-20): 0x followed by 40 hex characters",
  PEPE:"PEPE (ERC-20): 0x followed by 40 hex characters",
  FLOKI:"FLOKI (ERC-20): 0x followed by 40 hex characters",
  AAVE:"Aave (ERC-20): 0x followed by 40 hex characters",
  CRV:"Curve (ERC-20): 0x followed by 40 hex characters",
  MKR:"Maker (ERC-20): 0x followed by 40 hex characters",
  SNX:"Synthetix (ERC-20): 0x followed by 40 hex characters",
  COMP:"Compound (ERC-20): 0x followed by 40 hex characters",
  LDO:"Lido DAO (ERC-20): 0x followed by 40 hex characters",
  "1INCH":"1inch (ERC-20): 0x followed by 40 hex characters",
  ARB:"Arbitrum: 0x followed by 40 hex characters",
  OP:"Optimism: 0x followed by 40 hex characters",
  SAND:"The Sandbox (ERC-20): 0x followed by 40 hex characters",
  MANA:"Decentraland (ERC-20): 0x followed by 40 hex characters",
  AXS:"Axie Infinity (ERC-20): 0x followed by 40 hex characters",
  ENJ:"Enjin (ERC-20): 0x followed by 40 hex characters",
  GALA:"Gala (ERC-20): 0x followed by 40 hex characters",
  FET:"Fetch.ai (ERC-20): 0x followed by 40 hex characters",
  OCEAN:"Ocean Protocol (ERC-20): 0x followed by 40 hex characters",
  RNDR:"Render (ERC-20): 0x followed by 40 hex characters",
  WLD:"Worldcoin (ERC-20): 0x followed by 40 hex characters",
  GRT:"The Graph (ERC-20): 0x followed by 40 hex characters",
  LRC:"Loopring (ERC-20): 0x followed by 40 hex characters",
  CHZ:"Chiliz (ERC-20): 0x followed by 40 hex characters",
  BAT:"Basic Attention Token (ERC-20): 0x followed by 40 hex characters",
  DAI:"Dai (ERC-20): 0x followed by 40 hex characters",
  TUSD:"TrueUSD (ERC-20): 0x followed by 40 hex characters",
  OKB:"OKB (ERC-20): 0x followed by 40 hex characters",
  HT:"Huobi Token (ERC-20): 0x followed by 40 hex characters",
  CAKE:"PancakeSwap (BEP-20): 0x followed by 40 hex characters",
  BUSD:"BUSD (BEP-20): 0x followed by 40 hex characters",
  CRO:"Cronos: 0x followed by 40 hex characters",
  IMX:"Immutable X: 0x followed by 40 hex characters",
  STRK:"Starknet: 0x followed by hex characters",
  SOL:"Solana address: 32–44 Base58 characters (no 0, O, I, l)",
  BONK:"BONK is a Solana SPL token: 32–44 Base58 characters",
  WIF:"dogwifhat is a Solana token: 32–44 Base58 characters",
  XRP:"XRP address starts with r",
  ADA:"Cardano address starts with addr1",
  ATOM:"Cosmos address starts with cosmos1",
  OSMO:"Osmosis address starts with osmo1",
  INJ:"Injective address starts with inj1",
  KAVA:"Kava address starts with kava1",
  JUNO:"Juno address starts with juno1",
  STARS:"Stargaze address starts with stars1",
  NEAR:"NEAR address: accountname.near or account ID (2-64 characters)",
  XMR:"Monero address starts with 4 and is 95 characters long",
  TON:"TON address starts with EQ or UQ followed by 46 characters",
  SUI:"SUI address starts with 0x (NOT a Solana address)",
  APT:"Aptos address starts with 0x",
  XLM:"Stellar address starts with G and is 56 characters",
  TRX:"TRON address starts with T",
  DOT:"Polkadot address starts with 1",
  KSM:"Kusama address starts with a letter (not 0 or 1)",
  ALGO:"Algorand address: 58 uppercase letters and numbers",
  VET:"VeChain address: 0x followed by 40 hex characters",
  HBAR:"Hedera address format: 0.0.XXXXX (e.g. 0.0.123456)",
  XTZ:"Tezos address starts with tz1, tz2, or tz3",
  EOS:"EOS account name: 1-12 lowercase letters and numbers",
  ZIL:"Zilliqa address starts with zil1",
  WAVES:"Waves address starts with 3",
  IOTA:"IOTA address starts with iota1",
  THETA:"Theta: 0x followed by 40 hex characters",
  QTUM:"Qtum address starts with Q",
  FIL:"Filecoin address starts with f1, f3, or 0x",
  ICP:"Internet Computer principal ID (5-63 characters)",
  STX:"Stacks address starts with SP or SM",
  EGLD:"MultiversX address starts with erd1",
  MANTA:"Manta Network: 0x followed by 40 hex characters",
  SEI:"Sei address starts with sei1",
  FTM:"Fantom: 0x followed by 40 hex characters",
  ROSE:"Oasis address starts with oasis1",
  CFX:"Conflux: 0x address or cfx: prefix",
  ZEN:"Horizen address starts with zn or t1",
  XVG:"Verge address starts with D",
  XEM:"NEM address starts with N",
  KCS:"KuCoin Token: 0x followed by 40 hex characters",
  SC:"Siacoin address (long string of letters and numbers)",
  DGB:"DigiByte address starts with D",
};

function validateAddress(coin, address) {
  if (!address || !address.trim()) return { valid: false, hint: `Please enter your ${coin} wallet address` };
  const validator = ADDRESS_VALIDATORS[coin];
  if (!validator) return { valid: true }; // unknown coin — let API decide
  const valid = validator(address.trim());
  return {
    valid,
    hint: valid ? "" : (ADDRESS_HINTS[coin] || `Invalid ${coin} address format`),
  };
}

// ─────────────────────────────────────────────────────────────
// CLEAN ERROR — strips raw JSON from error messages shown to users
// ─────────────────────────────────────────────────────────────
function cleanErrorMessage(raw, fromCoin, toCoin, minAmount) {
  if (!raw) return "Exchange failed. Please try again.";
  const msg = raw.toLowerCase();

  if (msg.includes("not_valid_address") || msg.includes("not valid") || msg.includes("invalid address"))
    return `Invalid ${toCoin} destination address. ${ADDRESS_HINTS[toCoin] || `Please check your ${toCoin} wallet address format.`}`;

  if (msg.includes("real_min:")) {
    const m = raw.match(/REAL_MIN:([\d.]+)/);
    const min = m ? parseFloat(m[1]) : minAmount;
    return `Amount too low. Minimum for this pair is ${min} ${fromCoin}. Please increase your amount.`;
  }

  if (msg.includes("out_of_range") || msg.includes("less than minimal") || msg.includes("minimal"))
    return `Amount too low for this pair. Minimum is ~${minAmount} ${fromCoin}. Please increase your amount.`;

  if (msg.includes("not_valid_params") || msg.includes("required fields"))
    return `Missing required information. Please check your destination address and try again.`;

  if (msg.includes("pair is unavailable") || msg.includes("route") || msg.includes("unavailable"))
    return `This pair (${fromCoin} → ${toCoin}) is temporarily unavailable. Please try a different pair.`;

  if (msg.includes("unauthorized") || msg.includes("auth") || msg.includes("api key"))
    return "Exchange service temporarily unavailable. Please try again in a moment.";

  if (msg.includes("all providers failed") || msg.includes("fallback"))
    return `All exchange providers failed for ${fromCoin} → ${toCoin}. Please try a larger amount or different pair.`;

  // Strip any raw JSON braces from the message before showing
  return raw.replace(/\{.*?\}/g, "").replace(/https?:\/\/[^\s|]*/g, "").replace(/\|/g, "·").trim()
    || "Exchange failed. Please try a different pair or amount.";
}
// ═══════════════════════════════════════════════════════════════
// REAL-TIME PRICE ENGINE
// ── Normalized quote format ──────────────────────────────────
// Every provider returns quotes in this shape:
// {
//   provider:      string,   — "ChangeNOW" | "SimpleSwap" | "Swapzone"
//   fromToken:     string,   — e.g. "BTC"
//   toToken:       string,   — e.g. "ETH"
//   amountIn:      number,   — user input amount
//   amountOut:     number,   — estimated output
//   rate:          number,   — amountOut / amountIn
//   estimatedTime: string,   — "5–20 min" etc.
//   fees:          number,   — percentage fee included in rate
//   minAmount:     number,   — minimum swap amount for this pair
//   quotaId:       string,   — Swapzone only, required for create
//   simulated:     boolean,  — true = API failed, fell back to BASE_RATES
//   available:     boolean,  — false = pair not supported
//   error:         string|null
// }
// ─────────────────────────────────────────────────────────────



// ═══════════════════════════════════════════════════════════════
// COIN SELECTOR — dropdown anchored inside card (no overflow issues)
// ═══════════════════════════════════════════════════════════════
function CoinSelector({ selected, onChange, exclude }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);
  const coin = COINS_LIST.find(c => c.symbol === selected) || COINS_LIST[0];

  const filtered = COINS_LIST.filter(c =>
    c.symbol !== exclude &&
    (c.symbol.toLowerCase().includes(query.toLowerCase()) ||
     c.name.toLowerCase().includes(query.toLowerCase()))
  );

  // Close on outside click
  useEffect(() => {
    const h = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", h);
    document.addEventListener("touchstart", h);
    return () => {
      document.removeEventListener("mousedown", h);
      document.removeEventListener("touchstart", h);
    };
  }, []);

  return (
    // Wrapper has position:relative so the dropdown anchors to it
    <div ref={wrapRef} style={{ position: "relative", flexShrink: 0, zIndex: open ? 200 : 1 }}>
      <button
        onMouseDown={e => { e.preventDefault(); setOpen(o => !o); }}
        style={{
          display: "flex", alignItems: "center", gap: "8px",
          background: "rgba(255,255,255,0.06)",
          border: `1px solid ${open ? coin.color + "60" : "rgba(255,255,255,0.1)"}`,
          borderRadius: "12px", padding: "9px 13px", cursor: "pointer",
          color: "#fff", fontSize: "14px", fontFamily: "inherit", fontWeight: 700,
          transition: "all 0.2s", minWidth: "128px",
          boxShadow: open ? `0 0 16px ${coin.color}25` : "none",
          userSelect: "none", WebkitUserSelect: "none",
        }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: coin.bg, border: `1.5px solid ${coin.color}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "12px", color: coin.color, fontWeight: 800, flexShrink: 0,
        }}>{coin.icon}</div>
        <span style={{ letterSpacing: "0.04em" }}>{coin.symbol}</span>
        <span style={{
          marginLeft: "auto", fontSize: "9px", opacity: 0.4,
          transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s",
        }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          right: 0,            // anchors to right edge of button
          minWidth: "200px",
          width: "220px",
          background: "#0C1220",
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: "16px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.85)",
          zIndex: 9999,
          overflow: "hidden",
          animation: "dropIn 0.15s ease",
        }}>
          <div style={{ padding: "10px 10px 6px" }}>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search coin…"
              style={{
                width: "100%", background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px",
                padding: "8px 11px", color: "#fff", fontSize: "12px",
                fontFamily: "inherit", outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ maxHeight: "260px", overflowY: "auto" }}>
            {filtered.length === 0 && (
              <div style={{ padding: "16px", fontSize: "12px", color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
                No coins found
              </div>
            )}
            {filtered.map(c => (
              <button key={c.symbol}
                onMouseDown={e => { e.preventDefault(); onChange(c.symbol); setOpen(false); setQuery(""); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: "10px",
                  padding: "9px 14px",
                  background: selected === c.symbol ? "rgba(0,229,160,0.08)" : "transparent",
                  border: "none", cursor: "pointer", color: "#fff",
                  fontFamily: "inherit", fontSize: "13px", textAlign: "left",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
                onMouseLeave={e => e.currentTarget.style.background = selected === c.symbol ? "rgba(0,229,160,0.08)" : "transparent"}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: "50%", background: c.bg,
                  border: `1.5px solid ${c.color}`, display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: "10px", color: c.color,
                  fontWeight: 800, flexShrink: 0,
                }}>{c.icon}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "13px" }}>{c.symbol}</div>
                  <div style={{ fontSize: "10px", opacity: 0.4 }}>{c.name}</div>
                </div>
                {selected === c.symbol && (
                  <span style={{ marginLeft: "auto", color: "#00E5A0", fontSize: "12px" }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BACKEND RATE COMPARISON PANEL (hidden from users)
// Access at /admin or toggle with Ctrl+Shift+A
// ═══════════════════════════════════════════════════════════════
function BackendPanel({ comparison, fromCoin, toCoin, sendAmt, onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "fadeIn 0.2s ease",
    }}>
      <div style={{
        background: "#0C1220", border: "1px solid rgba(0,229,160,0.2)",
        borderRadius: "20px", padding: "28px", width: "480px",
        boxShadow: "0 40px 80px rgba(0,0,0,0.6)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <div style={{
              fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "18px",
              color: "#00E5A0", letterSpacing: "-0.01em",
            }}>⚙ Backend Rate Dashboard</div>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "3px" }}>
              {sendAmt} {fromCoin} → {toCoin} — Hidden from users
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px", width: 32, height: 32, color: "#fff",
            cursor: "pointer", fontSize: "14px",
          }}>✕</button>
        </div>

        {/* Provider comparison */}
        <div style={{ marginBottom: "20px" }}>
          {(comparison || []).map((p, i) => (
            <div key={p.provider} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 16px", borderRadius: "12px", marginBottom: "8px",
              background: i === 0 ? "rgba(0,229,160,0.08)" : "rgba(255,255,255,0.03)",
              border: i === 0 ? "1px solid rgba(0,229,160,0.2)" : "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: i === 0 ? "#00E5A0" : i === 1 ? "#F7931A" : "#7B9EF0",
                }}/>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: i === 0 ? "#00E5A0" : "#fff" }}>
                    {p.provider}
                    {i === 0 && <span style={{
                      marginLeft: "8px", fontSize: "9px", background: "rgba(0,229,160,0.15)",
                      color: "#00E5A0", padding: "2px 7px", borderRadius: "4px", fontWeight: 700,
                      letterSpacing: "0.06em",
                    }}>ROUTING</span>}
                  </div>
                  {p.simulated && <div style={{ fontSize: "10px", color: "rgba(255,165,0,0.7)" }}>⚠ Simulated — add API key</div>}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "14px", fontWeight: 700, color: i === 0 ? "#00E5A0" : "#fff" }}>
                  {p.rate?.toFixed(6)} {toCoin}
                </div>
                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>
                  Rate: {p.rawRate?.toFixed(8)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Commission info */}
        <div style={{
          background: "rgba(255,255,255,0.03)", borderRadius: "12px",
          padding: "14px 16px", border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em", marginBottom: "10px" }}>
            COMMISSION BREAKDOWN
          </div>
          {[
            ["Your commission (0.4%)", `${(parseFloat(sendAmt || 0) * (BASE_RATES[fromCoin] || 0) * 0.004).toFixed(4)} USD`],
            ["Best provider routing", comparison?.[0]?.provider || "ChangeNOW"],
            ["Rate advantage vs worst", comparison?.length >= 2 ? `+${(((comparison[0]?.rate - comparison[comparison.length-1]?.rate) / comparison[comparison.length-1]?.rate) * 100).toFixed(2)}%` : "N/A"],
            ["API keys status", "Configure in .env.local"],
          ].map(([k, v]) => (
            <div key={k} style={{
              display: "flex", justifyContent: "space-between",
              padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}>
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>{k}</span>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#fff" }}>{v}</span>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: "16px", fontSize: "11px", color: "rgba(255,255,255,0.2)",
          textAlign: "center",
        }}>
          Press Ctrl+Shift+A to toggle this panel • Not visible to users
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN ATLASSWAP APP
// ═══════════════════════════════════════════════════════════════
export default function AtlasSwapApp() {
  const [tab, setTab]               = useState("exchange");
  const [fromCoin, setFromCoin]     = useState("BTC");
  const [toCoin, setToCoin]         = useState("ETH");
  const [sendAmt, setSendAmt]       = useState("0.1");
  const [receiveAmt, setReceiveAmt] = useState("");
  const [destAddr, setDestAddr]     = useState("");
  const [loading, setLoading]       = useState(false);
  const [rateLoading, setRateLoading] = useState(false);
  const [step, setStep]             = useState("form");
  const [bestProvider, setBestProvider] = useState("ChangeNOW");
  const [comparison, setComparison] = useState([]);
  const [showBackend, setShowBackend] = useState(false);
  const [showPartners, setShowPartners] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [showExchange, setShowExchange] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState(null);
  const [tickerPrices, setTickerPrices] = useState({...BASE_RATES});
  const [tickerChanges, setTickerChanges] = useState({});
  const rateTimer = useRef(null);
  const tickerTimer = useRef(null);
  const prevPrices = useRef({...BASE_RATES}); // track previous cycle for change %

  // ── LIVE PRICE ENGINE ──────────────────────────────────────────────────────
  // Derives USD prices directly from ChangeNOW swap API rates (not CoinGecko).
  // Strategy: fetch how much USDT you get for 1 unit of each coin via CN V1.
  // Batches into groups of 6 to avoid rate limiting.
  // Refreshes every 15 seconds automatically.
  // Re-fetches instantly when fromCoin or sendAmt changes (wired below).
  // ─────────────────────────────────────────────────────────────────────────
  // Refresh interval defined at module level as REFRESH_INTERVAL = 15000

  // Coins to show in ticker — top 16 by relevance
  const TICKER_SYMBOLS = [
    "BTC","ETH","SOL","BNB","XRP","ADA","DOGE","AVAX",
    "MATIC","DOT","LINK","UNI","LTC","ATOM","TON","ARB",
  ];

  // Fetch all ticker prices via server route — staggered to avoid hammering
  const fetchLivePrices = useCallback(async () => {
    const newPrices = {};
    // Stablecoins always $1
    ["USDT","USDC","DAI","BUSD","TUSD"].forEach(s => { newPrices[s] = 1; });

    const toFetch = TICKER_SYMBOLS.filter(s => !["USDT","USDC","DAI","BUSD","TUSD"].includes(s));

    // Fetch in parallel — server route handles fallback between providers
    const results = await Promise.allSettled(
      toFetch.map(async (symbol) => {
        const price = await fetchLivePriceViaServer(symbol);
        return { symbol, price: price || BASE_RATES[symbol] || 0 };
      })
    );

    results.forEach(r => {
      if (r.status === "fulfilled" && r.value.price > 0) {
        newPrices[r.value.symbol] = r.value.price;
      }
    });

    // Compute session-relative change vs previous cycle
    const newChanges = {};
    Object.entries(newPrices).forEach(([sym, price]) => {
      const prev = prevPrices.current[sym] || BASE_RATES[sym] || price;
      if (prev && prev > 0) newChanges[sym] = ((price - prev) / prev) * 100;
    });
    prevPrices.current = { ...prevPrices.current, ...newPrices };

    setTickerPrices(prev => ({ ...prev, ...newPrices }));
    setTickerChanges(prev => ({ ...prev, ...newChanges }));
  }, []);

  // ── Auto-refresh ticker on mount + every REFRESH_INTERVAL ──
  useEffect(() => {
    fetchLivePrices();
    tickerTimer.current = setInterval(fetchLivePrices, REFRESH_INTERVAL);
    return () => clearInterval(tickerTimer.current);
  }, [fetchLivePrices]);

  // ── Re-fetch ticker instantly when fromCoin changes ──
  useEffect(() => {
    fetchLivePrices();
  }, [fromCoin]);

  // ── Keyboard shortcut: Ctrl+Shift+A opens backend panel ──
  useEffect(() => {
    const handler = e => {
      if (e.ctrlKey && e.shiftKey && e.key === "A") setShowBackend(s => !s);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Store Swapzone quotaId and minimum amount from rate responses
  const [szQuotaId, setSzQuotaId]         = useState("");
  const [minAmount, setMinAmount]         = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [allProviderQuotes, setAllProviderQuotes] = useState([]);  // all 3 normalized quotes
  const [fetchError, setFetchError]       = useState("");          // user-facing error if all fail
  const [servedFromCache, setServedFromCache] = useState(false);   // subtle cache indicator

  // ── Core rate fetch — uses new aggregator with cache + retry ──────────────
  // Called on: mount, coin change, amount change (debounced), auto-refresh
  const fetchRates = useCallback(async (from, to, amount, { silent = false } = {}) => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) { setReceiveAmt(""); return; }
    if (!silent) setRateLoading(true);
    setFetchError("");

    try {
      const { best, quotes, allQuotes, minAmount: min, fromCache } = await fetchBestRate(from, to, parsed);

      if (!best || Number(best.amountOut) <= 0 || Number.isNaN(Number(best.amountOut))) {
        throw new Error("No live quote");
      }

      // Update YOU GET display
      setReceiveAmt(Number(best.amountOut).toFixed(6));
      setBestProvider(best.provider || "Swapzone");
      setAllProviderQuotes(allQuotes || quotes || []);
      setServedFromCache(fromCache);

      // Legacy comparison state kept for backend panel compatibility
      setComparison((allQuotes || quotes || []).map(q => ({
        provider: q.provider, rate: q.amountOut, rawRate: q.rate,
        available: q.available, simulated: q.simulated,
        quotaId: q.quotaId || "",
      })));

      if (min && min > 0) setMinAmount(min);

      // Store Swapzone quotaId for the create call
      const szQ = (allQuotes || quotes || []).find(q => q.provider === "Swapzone");
      if (szQ?.quotaId) setSzQuotaId(szQ.quotaId);

      // ── Derive implied USD price for fromCoin ──────────────────────────
      // Strategy: rate × USD_per_toCoin → implies USD price of fromCoin.
      // Validated with ±20% sanity check against previous value.
      if (best && best.rate > 0 && !best.simulated) {
        setTickerPrices(prev => {
          const toUSD   = prev[to]   || BASE_RATES[to]   || 1;
          const fromUSD = prev[from] || BASE_RATES[from] || 1;
          const implied = best.rate * toUSD;
          const ok = fromUSD > 0 && Math.abs(implied - fromUSD) / fromUSD < 0.20;
          return ok ? { ...prev, [from]: implied } : prev;
        });
      }

      setLastRefreshed(new Date());
    } catch (err) {
      // All providers failed — show BASE_RATES fallback + user message
      const fallback = ((parsed * (BASE_RATES[from] || 1)) / (BASE_RATES[to] || 1)) * 0.996;
      setReceiveAmt(fallback.toFixed(6));
      setFetchError("Live rates temporarily unavailable — showing estimated rate. Refresh to retry.");
    } finally {
      if (!silent) setRateLoading(false);
    }
  }, []);

  // ── Debounced rate fetch — 400ms debounce on user input ──────────────────
  // Triggers instantly on coin change, debounced on amount typing
  useEffect(() => {
    clearTimeout(rateTimer.current);
    rateTimer.current = setTimeout(() => {
      fetchRates(fromCoin, toCoin, sendAmt);
    }, DEBOUNCE_MS);
    return () => clearTimeout(rateTimer.current);
  }, [sendAmt, fromCoin, toCoin, fetchRates]);

  // ── Auto-refresh every REFRESH_INTERVAL ms when on form step ─────────────
  // Uses silent=true so the spinner doesn't flash on every background refresh
  const autoRefreshTimer = useRef(null);
  useEffect(() => {
    if (step !== "form") return;
    autoRefreshTimer.current = setInterval(() => {
      const parsed = parseFloat(sendAmt);
      if (!isNaN(parsed) && parsed > 0) {
        fetchRates(fromCoin, toCoin, sendAmt, { silent: true });
      }
    }, REFRESH_INTERVAL);
    return () => clearInterval(autoRefreshTimer.current);
  }, [step, fromCoin, toCoin, sendAmt, fetchRates]);

  const swapCoins = () => {
    setFromCoin(toCoin);
    setToCoin(fromCoin);
    setSendAmt(receiveAmt || "0.1");
  };

  const [exchangeId, setExchangeId]         = useState("");
  const [depositAddress, setDepositAddress] = useState("");
  const [payinExtraId, setPayinExtraId]     = useState("");
  const [exchangeError, setExchangeError]   = useState("");
  const [addressError, setAddressError]     = useState("");

  // Live address validation as user types
  const handleAddressChange = (val) => {
    setDestAddr(val);
    setExchangeError("");
    if (val.trim().length > 5) {
      const { valid, hint } = validateAddress(toCoin, val.trim());
      setAddressError(valid ? "" : hint);
    } else {
      setAddressError("");
    }
  };

  // Reset address error when toCoin changes
  useEffect(() => {
    if (destAddr.trim().length > 5) {
      const { valid, hint } = validateAddress(toCoin, destAddr.trim());
      setAddressError(valid ? "" : hint);
    }
  }, [toCoin, destAddr]);

  // Validate amount before proceeding — providers reject below-minimum swaps
  const isBelowMin = minAmount > 0 && parseFloat(sendAmt) < minAmount;
  const isAddressInvalid = addressError.length > 0;

  const handleExchange = () => {
    if (!destAddr.trim()) return;
    // Final address validation check
    const { valid, hint } = validateAddress(toCoin, destAddr.trim());
    if (!valid) {
      setAddressError(hint);
      return;
    }
    if (isBelowMin) {
      setExchangeError(`Minimum swap amount is ${minAmount} ${fromCoin}. Please increase your amount.`);
      return;
    }
    setLoading(true);
    setExchangeError("");
    setAddressError("");
    setTimeout(() => { setLoading(false); setStep("confirm"); }, 700);
  };

  const handleConfirm = async () => {
    setStep("processing");
    setExchangeError("");
    try {
      const result = await createExchange(
        bestProvider, fromCoin, toCoin,
        parseFloat(sendAmt), destAddr.trim(),
        { quotaId: szQuotaId }
      );
      setDepositAddress(result.depositAddress || "");
      setExchangeId(result.exchangeId || "");
      setPayinExtraId(result.payinExtraId || "");
      setStep("done");
    } catch (err) {
      const raw = err?.message || "";

      // Real minimum in error — send back to form so user can fix amount
      const realMinMatch = raw.match(/REAL_MIN:([\d.]+)/);
      if (realMinMatch) {
        const realMin = parseFloat(realMinMatch[1]);
        const withBuffer = parseFloat((realMin * 1.1).toPrecision(4));
        setMinAmount(withBuffer);
        setExchangeError(`Amount too low. Minimum for this pair is ${realMin} ${fromCoin}. Please increase to at least ${withBuffer} ${fromCoin}.`);
        setStep("form");
        return;
      }

      // Address error — send back to form so user can fix address
      const rawLower = raw.toLowerCase();
      if (rawLower.includes("not_valid_address") || rawLower.includes("not valid") || rawLower.includes("invalid address")) {
        const hint = ADDRESS_HINTS[toCoin] || `Please check your ${toCoin} address format.`;
        setAddressError(hint);
        setExchangeError(`Invalid ${toCoin} address. ${hint}`);
        setStep("form");
        return;
      }

      setExchangeError(cleanErrorMessage(raw, fromCoin, toCoin, minAmount));
      setStep("confirm");
    }
  };

  const fromData = COINS_LIST.find(c => c.symbol === fromCoin) || COINS_LIST[0];
  const toData   = COINS_LIST.find(c => c.symbol === toCoin) || COINS_LIST[1];

  // ── Ticker data with live fluctuation ──
  const tickerCoins = COINS_LIST.slice(0, 16);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Outfit:wght@300;400;500;600;700&display=swap');

        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

        :root {
          --accent: #00E5A0;
          --accent-2: #00C4FF;
          --bg: #070B14;
          --surface: rgba(255,255,255,0.04);
          --border: rgba(255,255,255,0.08);
          --text: #F0F4FF;
          --muted: rgba(240,244,255,0.4);
        }

        body {
          background: var(--bg);
          font-family: 'Outfit', sans-serif;
          color: var(--text);
          min-height: 100vh;
          overflow-x: hidden;
        }

        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-10px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes orbFloat {
          0%,100% { transform: translateY(0) scale(1); }
          50%      { transform: translateY(-30px) scale(1.04); }
        }
        @keyframes orbFloat2 {
          0%,100% { transform: translateY(0) scale(1) rotate(0deg); }
          50%      { transform: translateY(20px) scale(1.06) rotate(5deg); }
        }
        @keyframes successPop {
          0%  { transform: scale(0.4); opacity: 0; }
          65% { transform: scale(1.15); }
          100%{ transform: scale(1); opacity: 1; }
        }
        @keyframes pulseGlow {
          0%,100% { box-shadow: 0 0 0 0 rgba(0,229,160,0.3); }
          50%      { box-shadow: 0 0 0 8px rgba(0,229,160,0); }
        }
        @keyframes shimmerLine {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        @keyframes dotPulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.4; transform: scale(0.8); }
        }

        .atlasswap-card { animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .step-slide-in  { animation: slideInRight 0.35s cubic-bezier(0.16,1,0.3,1) both; }
        .step-slide-back { animation: slideInLeft  0.35s cubic-bezier(0.16,1,0.3,1) both; }

        .exchange-btn {
          position: relative; overflow: hidden;
          transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
        }
        .exchange-btn::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%);
          transform: translateX(-100%);
          transition: transform 0.5s ease;
        }
        .exchange-btn:hover::before { transform: translateX(100%); }
        .exchange-btn:hover { transform: translateY(-2px); }
        .exchange-btn:active { transform: translateY(0); }

        .swap-btn {
          transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }
        .swap-btn:hover {
          transform: rotate(180deg) scale(1.15) !important;
          border-color: rgba(0,229,160,0.5) !important;
          background: rgba(0,229,160,0.12) !important;
          box-shadow: 0 0 20px rgba(0,229,160,0.2) !important;
        }

        .input-wrap:focus-within {
          border-color: rgba(0,229,160,0.35) !important;
          box-shadow: 0 0 0 3px rgba(0,229,160,0.06), 0 2px 20px rgba(0,229,160,0.05) !important;
        }

        .nav-link {
          transition: color 0.2s;
          color: rgba(240,244,255,0.4);
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.03em;
        }
        .nav-link:hover { color: var(--text); }

        .feature-card {
          transition: all 0.25s ease;
          cursor: default;
        }
        .feature-card:hover {
          border-color: rgba(0,229,160,0.15) !important;
          transform: translateY(-3px);
          background: rgba(255,255,255,0.05) !important;
        }

        .stat-item {
          transition: all 0.2s ease;
        }
        .stat-item:hover {
          border-color: rgba(0,229,160,0.15) !important;
          transform: translateY(-2px);
        }

        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }

        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }

        ::placeholder { color: rgba(240,244,255,0.2); }
        input:focus { outline: none; }
      `}</style>

      {/* ── Background atmosphere ── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
        {/* Primary orb */}
        <div style={{
          position: "absolute", width: 700, height: 700, borderRadius: "50%",
          top: "-200px", left: "-150px",
          background: "radial-gradient(circle at 40% 40%, rgba(0,229,160,0.055) 0%, rgba(0,196,255,0.02) 50%, transparent 70%)",
          animation: "orbFloat 12s ease-in-out infinite",
        }}/>
        {/* Secondary orb */}
        <div style={{
          position: "absolute", width: 600, height: 600, borderRadius: "50%",
          bottom: "-180px", right: "-120px",
          background: "radial-gradient(circle at 60% 60%, rgba(123,158,240,0.06) 0%, rgba(0,229,160,0.02) 50%, transparent 70%)",
          animation: "orbFloat2 14s ease-in-out infinite",
        }}/>
        {/* Tertiary accent */}
        <div style={{
          position: "absolute", width: 300, height: 300, borderRadius: "50%",
          top: "40%", left: "50%", transform: "translate(-50%,-50%)",
          background: "radial-gradient(circle, rgba(0,229,160,0.025) 0%, transparent 70%)",
        }}/>
        {/* Grid */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)
          `,
          backgroundSize: "56px 56px",
        }}/>
        {/* Vignette */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(7,11,20,0.6) 100%)",
        }}/>
      </div>

      {/* ── Live Price Ticker ── */}
      <div style={{
        position: "relative", zIndex: 10,
        background: "rgba(0,229,160,0.04)",
        borderBottom: "1px solid rgba(0,229,160,0.08)",
        height: "34px", overflow: "hidden", display: "flex", alignItems: "center",
      }}>
        <div style={{
          display: "flex", gap: "0",
          animation: "ticker 35s linear infinite",
          whiteSpace: "nowrap",
        }}>
          {[...tickerCoins, ...tickerCoins].map((c, i) => {
            const price = tickerPrices[c.symbol] || BASE_RATES[c.symbol] || 0;
            const change = tickerChanges[c.symbol] ?? ((tickerPrices[c.symbol] - BASE_RATES[c.symbol]) / BASE_RATES[c.symbol] * 100);
            const isUp = change >= 0;
            return (
              <span key={i} style={{
                display: "inline-flex", alignItems: "center", gap: "7px",
                padding: "0 28px", fontSize: "11px", fontWeight: 500,
                borderRight: "1px solid rgba(255,255,255,0.04)",
              }}>
                <span style={{ color: c.color, fontWeight: 700, letterSpacing: "0.04em" }}>{c.symbol}</span>
                <span style={{ color: "rgba(240,244,255,0.55)" }}>
                  ${price < 0.01 ? price.toExponential(2) : price < 1 ? price.toFixed(4) : price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
                <span style={{
                  color: isUp ? "#00E5A0" : "#FF5A72",
                  fontSize: "10px", fontWeight: 600,
                }}>
                  {isUp ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
                </span>
              </span>
            );
          })}
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav style={{
        position: "relative", zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 48px", height: "66px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        background: "rgba(7,11,20,0.75)", backdropFilter: "blur(24px)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "11px" }}>
          <div style={{
            width: 36, height: 36, borderRadius: "10px",
            background: "linear-gradient(135deg, #00E5A0 0%, #00C4FF 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(0,229,160,0.3)",
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="5" r="3" fill="#070B14"/>
              <circle cx="4" cy="15" r="3" fill="#070B14"/>
              <circle cx="16" cy="15" r="3" fill="#070B14"/>
              <line x1="10" y1="8" x2="4" y2="12" stroke="#070B14" strokeWidth="1.5"/>
              <line x1="10" y1="8" x2="16" y2="12" stroke="#070B14" strokeWidth="1.5"/>
              <line x1="4" y1="15" x2="16" y2="15" stroke="#070B14" strokeWidth="1.5"/>
            </svg>
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "21px", letterSpacing: "-0.03em" }}>
            ATLAS<span style={{ color: "#00E5A0" }}>SWAP</span>
          </div>
        </div>

        {/* Nav links */}
        <div style={{ display: "flex", gap: "32px", alignItems: "center" }}>
          {[
            { label: "Exchange",    action: () => setShowExchange(true) },
            { label: "Features",    action: () => setShowFeatures(true) },
            { label: "API Partners",action: () => setShowPartners(true) },
            { label: "About",       action: () => setShowAbout(true) },
            { label: "Contacts",    action: () => setShowContacts(true), sub: "For service issues" },
          ].map(item => (
            <a
              key={item.label}
              href="#"
              className="nav-link"
              onClick={e => { e.preventDefault(); item.action && item.action(); }}
              style={item.sub ? { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "3px", lineHeight: 1.15 } : undefined}
            >
              <span>{item.label}</span>
              {item.sub ? (
                <span style={{ fontSize: "9px", fontWeight: 500, color: "rgba(240,244,255,0.32)", letterSpacing: "0.04em" }}>{item.sub}</span>
              ) : null}
            </a>
          ))}
        </div>

        {/* Right side */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "rgba(0,229,160,0.07)",
            border: "1px solid rgba(0,229,160,0.15)",
            borderRadius: "20px", padding: "5px 12px",
            fontSize: "11px", color: "#00E5A0", fontWeight: 600,
            letterSpacing: "0.05em",
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%", background: "#00E5A0",
              animation: "dotPulse 2s ease-in-out infinite",
            }}/>
            LIVE
          </div>
          {connectedWallet ? (
            <button
              onMouseDown={() => setShowWallet(true)}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                background: "rgba(0,229,160,0.08)",
                border: "1px solid rgba(0,229,160,0.25)",
                borderRadius: "10px", padding: "9px 16px",
                color: "#00E5A0", fontWeight: 700, fontSize: "13px",
                cursor: "pointer", fontFamily: "'Outfit', sans-serif",
                letterSpacing: "0.03em", transition: "all 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(0,229,160,0.14)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(0,229,160,0.08)"}
            >
              <span style={{ fontSize: "16px" }}>{connectedWallet.icon}</span>
              <span>{connectedWallet.name}</span>
              <span style={{ fontSize: "10px", opacity: 0.5 }}>▼</span>
            </button>
          ) : (
            <button
              onMouseDown={() => setShowWallet(true)}
              style={{
                background: "linear-gradient(135deg, #00E5A0, #00C4FF)",
                border: "none", borderRadius: "10px", padding: "9px 20px",
                color: "#070B14", fontWeight: 700, fontSize: "13px",
                cursor: "pointer", fontFamily: "'Outfit', sans-serif",
                letterSpacing: "0.03em", boxShadow: "0 4px 16px rgba(0,229,160,0.25)",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,229,160,0.4)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,229,160,0.25)"}
            >Connect Wallet</button>
          )}
        </div>
      </nav>

      {/* ── Main content ── */}
      <div style={{
        position: "relative", zIndex: 10,
        maxWidth: "1180px", margin: "0 auto",
        padding: "64px 48px 48px",
        display: "flex", gap: "56px", alignItems: "flex-start",
      }}>

        {/* ── LEFT: Hero copy ── */}
        <div style={{ flex: 1, paddingTop: "12px", maxWidth: "440px" }}>

          <div style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: "rgba(0,229,160,0.07)",
            border: "1px solid rgba(0,229,160,0.18)",
            borderRadius: "20px", padding: "5px 14px", marginBottom: "28px",
            fontSize: "11px", color: "#00E5A0", fontWeight: 700, letterSpacing: "0.1em",
          }}>
            ✦ POWERED BY 3 EXCHANGE PROVIDERS
          </div>

          <h1 style={{
            fontFamily: "'Syne', sans-serif", fontWeight: 800,
            fontSize: "clamp(38px, 4.5vw, 56px)", lineHeight: 1.05,
            letterSpacing: "-0.035em", marginBottom: "22px",
          }}>
            The World's<br/>
            <span style={{
              background: "linear-gradient(90deg, #00E5A0 0%, #00C4FF 60%, #7B9EF0 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>Atlas of Crypto</span><br/>
            Swapping.
          </h1>

          <p style={{
            fontSize: "15px", color: "rgba(240,244,255,0.5)",
            lineHeight: 1.75, marginBottom: "40px", maxWidth: "360px", fontWeight: 400,
          }}>
            AtlasSwap aggregates ChangeNOW, SimpleSwap and Swapzone in real time — routing every swap to the best available rate. Zero custody. No registration. Instant.
          </p>

          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "40px" }}>
            {[
              { v: "1,500+", l: "Coins Supported" },
              { v: "3",      l: "Exchange APIs" },
              { v: "~5 min", l: "Avg Swap Time" },
              { v: "0.4%",   l: "Commission Fee" },
            ].map(s => (
              <div key={s.l} className="stat-item" style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "14px", padding: "18px 20px",
                transition: "all 0.2s ease",
              }}>
                <div style={{
                  fontFamily: "'Syne', sans-serif", fontWeight: 800,
                  fontSize: "24px", color: "#00E5A0",
                  letterSpacing: "-0.025em", lineHeight: 1,
                }}>{s.v}</div>
                <div style={{ fontSize: "11px", color: "rgba(240,244,255,0.35)", marginTop: "5px", fontWeight: 500 }}>
                  {s.l}
                </div>
              </div>
            ))}
          </div>

          {/* Trust signals */}
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            {[
              "Non-Custodial",
              "No KYC Required",
              "Instant Settlement",
              "Best Rate Always",
            ].map(t => (
              <div key={t} style={{
                display: "flex", alignItems: "center", gap: "6px",
                fontSize: "12px", color: "rgba(240,244,255,0.35)", fontWeight: 500,
              }}>
                <span style={{
                  width: 16, height: 16, borderRadius: "50%",
                  background: "rgba(0,229,160,0.12)",
                  border: "1px solid rgba(0,229,160,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "8px", color: "#00E5A0", flexShrink: 0,
                }}>✓</span>
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Swap card ── */}
        <div style={{ width: "430px", flexShrink: 0 }}>

          {/* ── FORM STEP ── */}
          {step === "form" && (
            <div className="atlasswap-card step-slide-back" style={{
              background: "rgba(255,255,255,0.035)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: "24px", backdropFilter: "blur(32px)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
              overflow: "visible",  // MUST be visible so dropdown isn't clipped
            }}>
              {/* Tabs */}
              <div style={{
                display: "flex",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
              }}>
                {[
                  { id: "exchange", label: "Exchange Crypto" },
                  { id: "buy",      label: "Buy / Sell", soon: true },
                ].map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)} style={{
                    flex: 1, padding: "17px 16px",
                    border: "none", background: "transparent",
                    color: tab === t.id ? "#fff" : "rgba(240,244,255,0.3)",
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: tab === t.id ? 600 : 400,
                    fontSize: "13px", cursor: "pointer",
                    letterSpacing: "0.025em",
                    borderBottom: tab === t.id ? "2px solid #00E5A0" : "2px solid transparent",
                    marginBottom: "-1px",
                    transition: "all 0.2s",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  }}>
                    {t.label}
                    {t.soon && (
                      <span style={{
                        fontSize: "9px", background: "rgba(123,158,240,0.15)",
                        color: "#7B9EF0", padding: "2px 7px",
                        borderRadius: "4px", fontWeight: 700, letterSpacing: "0.06em",
                      }}>SOON</span>
                    )}
                  </button>
                ))}
              </div>

              <div style={{ padding: "22px 22px 20px" }}>

                {/* YOU SEND */}
                <div style={{ marginBottom: "4px" }}>
                  <div style={{
                    fontSize: "10px", color: "rgba(240,244,255,0.35)",
                    fontWeight: 700, letterSpacing: "0.1em", marginBottom: "8px",
                  }}>YOU SEND</div>
                  <div className="input-wrap" style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    background: isBelowMin ? "rgba(255,90,114,0.05)" : "rgba(255,255,255,0.05)",
                    border: isBelowMin ? "1px solid rgba(255,90,114,0.3)" : "1px solid rgba(255,255,255,0.09)",
                    borderRadius: "16px", padding: "13px 14px",
                    transition: "all 0.2s ease",
                    overflow: "visible",
                  }}>
                    <input
                      type="number" min="0" step="any"
                      value={sendAmt}
                      onChange={e => { setSendAmt(e.target.value); setExchangeError(""); }}
                      style={{
                        flex: 1, background: "transparent", border: "none",
                        color: isBelowMin ? "#FF5A72" : "#fff", fontSize: "24px",
                        fontFamily: "'Syne', sans-serif", fontWeight: 700,
                        letterSpacing: "-0.025em", padding: "2px 4px",
                        minWidth: 0, outline: "none",
                      }}
                    />
                    <CoinSelector selected={fromCoin} onChange={c => { setFromCoin(c); setExchangeError(""); }} exclude={toCoin} />
                  </div>
                  <div style={{
                    fontSize: "11px", marginTop: "6px", paddingLeft: "4px",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <span style={{ color: "rgba(240,244,255,0.3)" }}>
                      ≈ ${((parseFloat(sendAmt) || 0) * (tickerPrices[fromCoin] || 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })} USD
                    </span>
                    {isBelowMin
                      ? <span style={{ color: "#FF5A72", fontWeight: 600 }}>
                          Min: {minAmount} {fromCoin}
                        </span>
                      : <span style={{ color: "rgba(0,229,160,0.55)" }}>All fees included</span>
                    }
                  </div>
                </div>

                {/* SWAP TOGGLE */}
                <div style={{
                  display: "flex", justifyContent: "center",
                  margin: "14px 0", position: "relative",
                }}>
                  <div style={{
                    position: "absolute", top: "50%", left: 0, right: 0,
                    height: "1px", background: "rgba(255,255,255,0.05)",
                  }}/>
                  <button
                    className="swap-btn"
                    onClick={swapCoins}
                    style={{
                      width: 38, height: 38, borderRadius: "50%", zIndex: 1,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.09)",
                      cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "17px", color: "rgba(240,244,255,0.5)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                    }}
                  >⇅</button>
                </div>

                {/* YOU GET */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{
                    fontSize: "10px", color: "rgba(240,244,255,0.35)",
                    fontWeight: 700, letterSpacing: "0.1em", marginBottom: "8px",
                  }}>YOU GET (ESTIMATED)</div>
                  <div style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    background: "rgba(0,229,160,0.04)",
                    border: "1px solid rgba(0,229,160,0.12)",
                    borderRadius: "16px", padding: "13px 14px",
                    position: "relative", overflow: "visible",
                  }}>
                    {rateLoading && (
                      <div style={{
                        position: "absolute", bottom: 0, left: 0, right: 0, height: "2px",
                        background: "linear-gradient(90deg, transparent, #00E5A0, transparent)",
                        backgroundSize: "400px 2px",
                        animation: "shimmerLine 1.2s ease-in-out infinite",
                      }}/>
                    )}
                    <div style={{
                      flex: 1, fontSize: "24px",
                      fontFamily: "'Syne', sans-serif", fontWeight: 700,
                      letterSpacing: "-0.025em",
                      color: rateLoading ? "rgba(0,229,160,0.5)" : "#00E5A0",
                      padding: "2px 4px",
                      transition: "color 0.3s",
                    }}>
                      {receiveAmt || "0.000000"}
                    </div>
                    <CoinSelector selected={toCoin} onChange={setToCoin} exclude={fromCoin} />
                  </div>
                  <div style={{
                    fontSize: "11px", color: "rgba(240,244,255,0.3)",
                    marginTop: "6px", paddingLeft: "4px",
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center",
                  }}>
                    <span>
                      1 {fromCoin} ≈ {
                        (() => {
                          const fromUSD = tickerPrices[fromCoin] || BASE_RATES[fromCoin] || 1;
                          const toUSD   = tickerPrices[toCoin]   || BASE_RATES[toCoin]   || 1;
                          return toUSD > 0 ? ((fromUSD / toUSD) * 0.996).toFixed(6) : "—";
                        })()
                      } {toCoin}
                    </span>
                    <span style={{ color: "rgba(0,229,160,0.5)", display: "flex", alignItems: "center", gap: "6px" }}>
                      {/* Live pulse dot */}
                      <span style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: fetchError ? "#F7931A" : rateLoading ? "#F7931A" : servedFromCache ? "#7B9EF0" : "#00E5A0",
                        display: "inline-block",
                        animation: rateLoading ? "spin 0.8s linear infinite" : "none",
                        transition: "background 0.3s",
                      }}/>
                      <span style={{ color: fetchError ? "#F7931A" : rateLoading ? "#F7931A" : servedFromCache ? "#7B9EF0" : "rgba(0,229,160,0.7)" }}>
                        {fetchError
                          ? "Estimated rate · could not reach live APIs"
                          : rateLoading ? "Fetching live rates…" : servedFromCache ? `Cached · ${bestProvider}` : `Live · Best via ${bestProvider}`}
                      </span>
                      {lastRefreshed && !rateLoading && (
                        <span style={{ fontSize: "10px", color: "rgba(240,244,255,0.2)" }}>
                          · {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* ── ALL-PROVIDER QUOTE COMPARISON ─────────────────────── */}
                {/* Shows all 3 provider quotes with best highlighted */}
                {allProviderQuotes.length > 0 && !rateLoading && (
                  <div style={{ marginBottom: "14px" }}>
                    <div style={{
                      fontSize: "10px", color: "rgba(240,244,255,0.3)",
                      fontWeight: 700, letterSpacing: "0.1em", marginBottom: "6px",
                    }}>RATE COMPARISON</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {["ChangeNOW","SimpleSwap","Swapzone"].map(pName => {
                        const q = allProviderQuotes.find(x => x.provider === pName);
                        const isBest = pName === bestProvider;
                        const provColors = { ChangeNOW: "#00E5A0", SimpleSwap: "#7B9EF0", Swapzone: "#F7931A" };
                        const col = provColors[pName] || "#888";
                        if (!q) {
                          return (
                            <div key={pName} style={{
                              display: "flex", justifyContent: "space-between", alignItems: "center",
                              padding: "6px 10px",
                              background: "rgba(255,255,255,0.02)",
                              border: "1px solid rgba(255,255,255,0.06)",
                              borderRadius: "8px", opacity: 0.4,
                            }}>
                              <span style={{ fontSize: "11px", color: "rgba(240,244,255,0.4)" }}>{pName}</span>
                              <span style={{ fontSize: "11px", color: "rgba(240,244,255,0.3)" }}>Unavailable</span>
                            </div>
                          );
                        }
                        return (
                          <div key={pName} style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            padding: "7px 10px",
                            background: isBest ? `rgba(${pName === "ChangeNOW" ? "0,229,160" : pName === "SimpleSwap" ? "123,158,240" : "247,147,26"},0.07)` : "rgba(255,255,255,0.02)",
                            border: `1px solid ${isBest ? col + "40" : "rgba(255,255,255,0.06)"}`,
                            borderRadius: "8px",
                            transition: "all 0.3s",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: col, flexShrink: 0 }}/>
                              <span style={{ fontSize: "11px", fontWeight: isBest ? 700 : 400, color: isBest ? col : "rgba(240,244,255,0.55)" }}>
                                {pName}
                              </span>
                              {isBest && (
                                <span style={{
                                  fontSize: "9px", fontWeight: 700, color: "#070B14",
                                  background: col, padding: "1px 5px", borderRadius: "4px",
                                  letterSpacing: "0.05em",
                                }}>BEST</span>
                              )}
                              {q.simulated && (
                                <span style={{ fontSize: "9px", color: "rgba(240,244,255,0.25)" }}>est.</span>
                              )}
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <span style={{
                                fontSize: "12px", fontWeight: isBest ? 700 : 400,
                                color: isBest ? col : "rgba(240,244,255,0.6)",
                                fontFamily: "'Syne', sans-serif",
                              }}>
                                {q.amountOut > 0 ? q.amountOut.toFixed(6) : "—"} {toCoin}
                              </span>
                              {!isBest && q.amountOut > 0 && bestProvider && (() => {
                                const bestQ = allProviderQuotes.find(x => x.provider === bestProvider);
                                if (bestQ && bestQ.amountOut > 0) {
                                  const diff = ((q.amountOut - bestQ.amountOut) / bestQ.amountOut * 100);
                                  return diff < 0 ? (
                                    <span style={{ fontSize: "9px", color: "rgba(255,90,114,0.7)", marginLeft: "4px" }}>
                                      {diff.toFixed(2)}%
                                    </span>
                                  ) : null;
                                }
                              })()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: "10px", color: "rgba(240,244,255,0.2)", marginTop: "5px", paddingLeft: "2px" }}>
                      Auto-refreshes every {REFRESH_INTERVAL / 1000}s · Click Exchange to lock rate
                    </div>
                  </div>
                )}

                {/* ── Loading skeleton when first fetching ─────────────── */}
                {rateLoading && allProviderQuotes.length === 0 && (
                  <div style={{ marginBottom: "14px" }}>
                    {["ChangeNOW","SimpleSwap","Swapzone"].map(p => (
                      <div key={p} style={{
                        height: "32px", borderRadius: "8px", marginBottom: "4px",
                        background: "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)",
                        backgroundSize: "400px 100%",
                        animation: "shimmerLine 1.4s ease-in-out infinite",
                      }}/>
                    ))}
                  </div>
                )}

                {/* ── All-providers-failed error ────────────────────────── */}
                {fetchError && (
                  <div style={{
                    marginBottom: "12px", padding: "10px 12px",
                    background: "rgba(247,147,26,0.07)",
                    border: "1px solid rgba(247,147,26,0.2)",
                    borderRadius: "10px", fontSize: "12px",
                    color: "#F7931A", lineHeight: 1.5,
                    display: "flex", alignItems: "flex-start", gap: "8px",
                  }}>
                    <span style={{ flexShrink: 0, marginTop: "1px" }}>⚠</span>
                    <span>{fetchError}</span>
                  </div>
                )}

                {/* DESTINATION ADDRESS */}
                <div style={{ marginBottom: "18px" }}>
                  <div style={{
                    fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", marginBottom: "8px",
                    color: addressError ? "#FF5A72" : "rgba(240,244,255,0.35)",
                  }}>DESTINATION {toCoin} ADDRESS</div>
                  <div className="input-wrap" style={{
                    background: addressError ? "rgba(255,90,114,0.05)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${addressError ? "rgba(255,90,114,0.35)" : destAddr.trim() && !addressError ? "rgba(0,229,160,0.25)" : "rgba(255,255,255,0.09)"}`,
                    borderRadius: "14px", padding: "12px 14px",
                    transition: "all 0.2s ease",
                    display: "flex", alignItems: "center", gap: "8px",
                  }}>
                    <input
                      placeholder={`Enter your ${toCoin} wallet address`}
                      value={destAddr}
                      onChange={e => handleAddressChange(e.target.value)}
                      style={{
                        flex: 1, background: "transparent", border: "none",
                        color: addressError ? "#FF5A72" : "#fff",
                        fontSize: "13px", fontFamily: "'Outfit', sans-serif",
                        fontWeight: 400, outline: "none",
                      }}
                    />
                    {destAddr.trim().length > 5 && (
                      <span style={{
                        fontSize: "14px", flexShrink: 0,
                        color: addressError ? "#FF5A72" : "#00E5A0",
                      }}>
                        {addressError ? "✕" : "✓"}
                      </span>
                    )}
                  </div>
                  {addressError && (
                    <div style={{
                      marginTop: "6px", paddingLeft: "4px",
                      fontSize: "11px", color: "#FF5A72", lineHeight: 1.5,
                    }}>
                      ⚠ {addressError}
                    </div>
                  )}
                  {!addressError && destAddr.trim().length > 5 && (
                    <div style={{
                      marginTop: "6px", paddingLeft: "4px",
                      fontSize: "11px", color: "rgba(0,229,160,0.6)",
                    }}>
                      ✓ Valid {toCoin} address format
                    </div>
                  )}
                </div>

                {/* EXCHANGE BUTTON */}
                {exchangeError && (
                  <div style={{
                    marginBottom: "12px", padding: "11px 14px",
                    background: "rgba(255,90,114,0.08)",
                    border: "1px solid rgba(255,90,114,0.2)",
                    borderRadius: "10px", fontSize: "12px",
                    color: "#FF5A72", lineHeight: 1.6,
                  }}>{exchangeError}</div>
                )}
                <button
                  className="exchange-btn"
                  onClick={handleExchange}
                  disabled={!destAddr.trim() || loading || rateLoading || isBelowMin || isAddressInvalid}
                  style={{
                    width: "100%", padding: "15px",
                    background: isBelowMin
                      ? "rgba(255,90,114,0.12)"
                      : destAddr.trim() && !rateLoading
                        ? "linear-gradient(135deg, #00E5A0 0%, #00C4FF 100%)"
                        : "rgba(255,255,255,0.07)",
                    border: isBelowMin ? "1px solid rgba(255,90,114,0.25)" : "none",
                    borderRadius: "14px",
                    color: isBelowMin
                      ? "#FF5A72"
                      : destAddr.trim() && !rateLoading ? "#070B14" : "rgba(240,244,255,0.2)",
                    fontFamily: "'Outfit', 'Syne', system-ui, sans-serif",
                    fontWeight: 800,
                    fontSize: "15px",
                    cursor: destAddr.trim() && !rateLoading && !isBelowMin ? "pointer" : "not-allowed",
                    letterSpacing: "0.05em",
                    boxShadow: destAddr.trim() && !rateLoading && !isBelowMin
                      ? "0 8px 32px rgba(0,229,160,0.25)"
                      : "none",
                    transition: "all 0.25s ease",
                  }}
                >
                  {loading
                    ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                        <span style={{
                          width: 16, height: 16, borderRadius: "50%",
                          border: "2px solid rgba(7,11,20,0.3)",
                          borderTopColor: "#070B14",
                          display: "inline-block", animation: "spin 0.7s linear infinite",
                        }}/>
                        Routing to Best Rate…
                      </span>
                    : rateLoading
                      ? "Fetching Live Rates…"
                      : isBelowMin
                        ? `⚠ Min amount: ${minAmount} ${fromCoin}`
                        : `Exchange ${fromCoin} → ${toCoin}`
                  }
                </button>

                {/* FOOTER TRUST */}
                <div style={{
                  display: "flex", justifyContent: "center", gap: "20px",
                  marginTop: "14px", flexWrap: "wrap",
                }}>
                  {["No Registration", "Non-Custodial", "Instant"].map(t => (
                    <span key={t} style={{
                      fontSize: "11px", color: "rgba(240,244,255,0.22)",
                      display: "flex", alignItems: "center", gap: "5px", fontWeight: 500,
                    }}>
                      <span style={{ color: "#00E5A0", fontSize: "9px" }}>✓</span> {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── CONFIRM STEP ── */}
          {step === "confirm" && (
            <div className="atlasswap-card step-slide-in" style={{
              background: "rgba(255,255,255,0.035)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: "24px", backdropFilter: "blur(32px)",
              padding: "26px",
              boxShadow: "0 32px 80px rgba(0,0,0,0.45)",
            }}>
              <button onClick={() => setStep("form")} style={{
                background: "transparent", border: "none",
                color: "rgba(240,244,255,0.4)", fontSize: "13px",
                cursor: "pointer", fontFamily: "'Outfit', sans-serif",
                marginBottom: "20px", display: "flex", alignItems: "center", gap: "6px",
                padding: 0, transition: "color 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "#fff"}
              onMouseLeave={e => e.currentTarget.style.color = "rgba(240,244,255,0.4)"}
              >← Back</button>

              <div style={{
                fontFamily: "'Syne', sans-serif", fontWeight: 800,
                fontSize: "20px", marginBottom: "22px", letterSpacing: "-0.02em",
              }}>Confirm Exchange</div>

              {[
                ["You Send",       `${sendAmt} ${fromCoin}`],
                ["You Receive",    `~${receiveAmt} ${toCoin}`],
                ["Best Provider",  bestProvider],
                ["Destination",    destAddr.length > 20 ? destAddr.slice(0,14) + "…" + destAddr.slice(-8) : destAddr],
                ["Service Fee",    "0.4% (included in rate)"],
                ["Estimated Time", "5 – 20 minutes"],
              ].map(([k, v]) => (
                <div key={k} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "11px 0", borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}>
                  <span style={{ fontSize: "13px", color: "rgba(240,244,255,0.4)" }}>{k}</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: k === "Best Provider" ? "#00E5A0" : "#fff" }}>{v}</span>
                </div>
              ))}

              {exchangeError && (
                <div style={{
                  marginTop:"14px", padding:"12px 16px",
                  background:"rgba(255,90,114,0.08)",
                  border:"1px solid rgba(255,90,114,0.2)",
                  borderRadius:"10px", fontSize:"12px", color:"#FF5A72", lineHeight:1.6,
                }}>{exchangeError}</div>
              )}

              <button className="exchange-btn" onClick={handleConfirm} style={{
                width: "100%", marginTop: "22px", padding: "15px",
                background: "linear-gradient(135deg, #00E5A0, #00C4FF)",
                border: "none", borderRadius: "14px", color: "#070B14",
                fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "15px",
                cursor: "pointer", letterSpacing: "0.05em",
                boxShadow: "0 8px 32px rgba(0,229,160,0.25)",
              }}>Confirm & Exchange</button>
            </div>
          )}

          {/* ── PROCESSING STEP ── */}
          {step === "processing" && (
            <div className="atlasswap-card step-slide-in" style={{
              background: "rgba(255,255,255,0.035)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: "24px", backdropFilter: "blur(32px)",
              padding: "48px 26px", textAlign: "center",
              boxShadow: "0 32px 80px rgba(0,0,0,0.45)",
            }}>
              <div style={{
                width: 72, height: 72, margin: "0 auto 24px",
                borderRadius: "50%",
                border: "3px solid rgba(0,229,160,0.15)",
                borderTopColor: "#00E5A0",
                animation: "spin 0.9s linear infinite",
              }}/>
              <div style={{
                fontFamily: "'Syne', sans-serif", fontWeight: 800,
                fontSize: "22px", marginBottom: "12px", letterSpacing: "-0.02em",
              }}>Creating Exchange…</div>
              <p style={{ fontSize: "13px", color: "rgba(240,244,255,0.4)", lineHeight: 1.75 }}>
                Connecting to <strong style={{ color: "#00E5A0" }}>{bestProvider}</strong> and generating your deposit address. This takes just a moment.
              </p>
            </div>
          )}

          {/* ── DONE STEP ── */}
          {step === "done" && (
            <div className="atlasswap-card step-slide-in" style={{
              background: "rgba(255,255,255,0.035)",
              border: "1px solid rgba(0,229,160,0.15)",
              borderRadius: "24px", backdropFilter: "blur(32px)",
              padding: "32px 26px", textAlign: "center",
              boxShadow: "0 32px 80px rgba(0,229,160,0.08)",
            }}>
              <div style={{
                width: 64, height: 64, margin: "0 auto 20px",
                borderRadius: "50%",
                background: "rgba(0,229,160,0.1)",
                border: "2px solid rgba(0,229,160,0.35)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "28px", animation: "successPop 0.5s cubic-bezier(0.34,1.56,0.64,1)",
                boxShadow: "0 0 40px rgba(0,229,160,0.15)",
              }}>✓</div>

              <div style={{
                fontFamily: "'Syne', sans-serif", fontWeight: 800,
                fontSize: "20px", marginBottom: "8px",
                color: "#00E5A0", letterSpacing: "-0.02em",
              }}>Exchange Created!</div>

              <p style={{ fontSize: "13px", color: "rgba(240,244,255,0.4)", lineHeight: 1.75, marginBottom: "20px" }}>
                Send exactly <strong style={{ color: "#fff" }}>{sendAmt} {fromCoin}</strong> to the deposit address below. Your <strong style={{ color: "#fff" }}>{toCoin}</strong> will be sent to your wallet automatically once confirmed.
              </p>

              {/* Deposit address box — the most important thing on this screen */}
              {depositAddress ? (
                <div style={{
                  background: "rgba(0,229,160,0.05)",
                  border: "1px solid rgba(0,229,160,0.25)",
                  borderRadius: "14px", padding: "18px", marginBottom: "14px", textAlign: "left",
                }}>
                  <div style={{ fontSize: "10px", color: "rgba(240,244,255,0.4)", letterSpacing: "0.1em", marginBottom: "10px", fontWeight: 700 }}>
                    📥 SEND {sendAmt} {fromCoin} TO THIS ADDRESS
                  </div>
                  <div style={{
                    fontSize: "13px", color: "#00E5A0", fontFamily: "monospace",
                    wordBreak: "break-all", lineHeight: 1.8,
                    background: "rgba(0,229,160,0.08)", borderRadius: "8px",
                    padding: "10px 12px", marginBottom: "10px",
                    border: "1px solid rgba(0,229,160,0.15)",
                    userSelect: "all",
                  }}>
                    {depositAddress}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(depositAddress);
                    }}
                    style={{
                      fontSize: "12px", color: "#070B14",
                      background: "linear-gradient(135deg,#00E5A0,#00C4FF)",
                      border: "none", borderRadius: "8px",
                      padding: "8px 18px", cursor: "pointer",
                      fontFamily: "'Outfit',sans-serif", fontWeight: 700,
                      letterSpacing: "0.04em",
                    }}
                  >📋 Copy Address</button>
                </div>
              ) : (
                // Fallback if address is somehow empty — show raw debug info
                <div style={{
                  background: "rgba(255,165,0,0.08)", border: "1px solid rgba(255,165,0,0.2)",
                  borderRadius: "14px", padding: "16px", marginBottom: "14px", textAlign: "left",
                }}>
                  <div style={{ fontSize: "12px", color: "rgba(255,165,0,0.9)", lineHeight: 1.7 }}>
                    ⚠ Exchange was created but deposit address not returned by provider. Please check your {bestProvider} account or contact support with Exchange ID: <strong>{exchangeId}</strong>
                  </div>
                </div>
              )}

              {/* Memo / Extra ID — shown for XRP, XMR, TON, etc */}
              {payinExtraId && (
                <div style={{
                  background: "rgba(247,147,26,0.07)",
                  border: "1px solid rgba(247,147,26,0.2)",
                  borderRadius: "12px", padding: "14px", marginBottom: "14px", textAlign: "left",
                }}>
                  <div style={{ fontSize: "10px", color: "rgba(247,147,26,0.7)", letterSpacing: "0.1em", marginBottom: "8px", fontWeight: 700 }}>
                    ⚠ REQUIRED MEMO / TAG — MUST INCLUDE WITH TRANSFER
                  </div>
                  <div style={{
                    fontSize: "13px", color: "#F7931A", fontFamily: "monospace",
                    wordBreak: "break-all", userSelect: "all",
                  }}>
                    {payinExtraId}
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(payinExtraId)}
                    style={{
                      marginTop: "8px", fontSize: "11px", color: "rgba(240,244,255,0.5)",
                      background: "rgba(247,147,26,0.12)", border: "1px solid rgba(247,147,26,0.2)",
                      borderRadius: "6px", padding: "5px 12px", cursor: "pointer",
                      fontFamily: "'Outfit',sans-serif",
                    }}
                  >Copy Memo</button>
                </div>
              )}

              {/* Exchange ID */}
              {exchangeId && (
                <div style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "10px", padding: "10px 14px", marginBottom: "16px", textAlign: "left",
                }}>
                  <div style={{ fontSize: "10px", color: "rgba(240,244,255,0.3)", letterSpacing: "0.1em", marginBottom: "4px", fontWeight: 700 }}>EXCHANGE ID (SAVE FOR SUPPORT)</div>
                  <div style={{ fontSize: "11px", color: "rgba(240,244,255,0.55)", fontFamily: "monospace", userSelect: "all" }}>{exchangeId}</div>
                </div>
              )}

              <div style={{
                fontSize: "11px", color: "rgba(240,244,255,0.25)",
                marginBottom: "18px", lineHeight: 1.7,
              }}>
                ⏱ Estimated completion: 5–20 minutes after deposit is confirmed on-chain.<br/>
                Routed via <span style={{ color: "#00E5A0" }}>{bestProvider}</span> · AtlasSwap never holds your funds.
              </div>

              <button onClick={() => {
                setStep("form"); setDestAddr("");
                setDepositAddress(""); setExchangeId("");
                setPayinExtraId(""); setExchangeError(""); setAddressError("");
              }} style={{
                width: "100%", padding: "14px",
                background: "rgba(0,229,160,0.09)",
                border: "1px solid rgba(0,229,160,0.22)",
                borderRadius: "14px", color: "#00E5A0",
                fontFamily: "'Syne', sans-serif", fontWeight: 700,
                fontSize: "14px", cursor: "pointer", letterSpacing: "0.04em",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(0,229,160,0.14)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(0,229,160,0.09)"}
              >Start New Swap</button>
            </div>
          )}

          {/* Provider attribution bar */}
          <div style={{
            marginTop: "14px", padding: "12px 16px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: "12px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "10px", color: "rgba(240,244,255,0.25)", fontWeight: 500 }}>
                Aggregating
              </span>
              {["ChangeNOW", "SimpleSwap", "Swapzone"].map((p, i) => (
                <span key={p} style={{
                  fontSize: "10px", fontWeight: 700,
                  color: "rgba(240,244,255,0.4)",
                  padding: "3px 9px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "6px", letterSpacing: "0.03em",
                }}>{p}</span>
              ))}
            </div>
            <div style={{ display: "flex", gap: "2px" }}>
              {[...Array(5)].map((_, i) => (
                <span key={i} style={{ color: "#00B67A", fontSize: "11px" }}>★</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Feature strip ── */}
      <div style={{
        position: "relative", zIndex: 10,
        maxWidth: "1180px", margin: "0 auto 64px",
        padding: "0 48px",
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px",
      }}>
        {[
          {
            icon: "🌐",
            title: "Atlas-Grade Coverage",
            desc: "1,500+ coins across every major blockchain. BTC, ETH, SOL, BNB, and far beyond — all routed to the best available rate.",
          },
          {
            icon: "⚡",
            title: "3-Provider Aggregation",
            desc: "ChangeNOW, SimpleSwap and Swapzone compared simultaneously in the background. You always get the best rate, automatically.",
          },
          {
            icon: "🔐",
            title: "Zero Custody Model",
            desc: "AtlasSwap never holds your funds. No registration, no KYC, no counterparty risk. Your keys remain yours throughout every swap.",
          },
        ].map(f => (
          <div key={f.title} className="feature-card" style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "18px", padding: "26px 24px",
          }}>
            <div style={{ fontSize: "30px", marginBottom: "14px" }}>{f.icon}</div>
            <div style={{
              fontFamily: "'Syne', sans-serif", fontWeight: 700,
              fontSize: "15px", marginBottom: "10px", letterSpacing: "-0.015em",
            }}>{f.title}</div>
            <div style={{
              fontSize: "13px", color: "rgba(240,244,255,0.38)",
              lineHeight: 1.7,
            }}>{f.desc}</div>
          </div>
        ))}
      </div>

      {/* ── Footer ── */}
      <div style={{
        position: "relative", zIndex: 10,
        borderTop: "1px solid rgba(255,255,255,0.05)",
        padding: "24px 48px",
        maxWidth: "1180px", margin: "0 auto",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "16px", letterSpacing: "-0.02em" }}>
          ATLAS<span style={{ color: "#00E5A0" }}>SWAP</span>
          <span style={{ fontSize: "11px", color: "rgba(240,244,255,0.25)", fontFamily: "'Outfit', sans-serif", fontWeight: 400, marginLeft: "10px" }}>
            atlasswap.io
          </span>
        </div>
        <div style={{ display: "flex", gap: "24px", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          {[
            { key: "terms", label: "Terms", href: "#" },
            { key: "privacy", label: "Privacy", href: "#" },
            {
              key: "contact",
              label: "Contact",
              href: `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("AtlasSwap — inquiry")}`,
              showEmail: true,
            },
            { key: "api", label: "API Docs", href: "#" },
          ].map((item) => (
            item.showEmail ? (
              <span key={item.key} style={{ display: "inline-flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <a
                  href={item.href}
                  style={{
                    fontSize: "12px", color: "rgba(240,244,255,0.3)",
                    textDecoration: "none", transition: "color 0.2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "rgba(240,244,255,0.3)"; }}
                >{item.label}</a>
                <a
                  href={item.href}
                  style={{
                    fontSize: "12px", color: "#00E5A0", fontWeight: 600,
                    textDecoration: "none", transition: "opacity 0.2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = "1"; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "0.85"; }}
                >{SUPPORT_EMAIL}</a>
              </span>
            ) : (
              <a
                key={item.key}
                href={item.href}
                style={{
                  fontSize: "12px", color: "rgba(240,244,255,0.3)",
                  textDecoration: "none", transition: "color 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "rgba(240,244,255,0.3)"; }}
              >{item.label}</a>
            )
          ))}
        </div>
        <div style={{ fontSize: "11px", color: "rgba(240,244,255,0.2)" }}>
          © 2026 AtlasSwap · Non-custodial · atlasswap.io
        </div>
      </div>

      {/* ══════════════════════════════════════════
          WALLET SELECTOR MODAL
      ══════════════════════════════════════════ */}
      {showWallet && (
        <div onClick={() => setShowWallet(false)} style={{
          position:"fixed",inset:0,zIndex:1000,
          background:"rgba(0,0,0,0.85)",backdropFilter:"blur(10px)",
          display:"flex",alignItems:"center",justifyContent:"center",
          animation:"fadeIn 0.2s ease",
        }}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:"#0C1220",border:"1px solid rgba(255,255,255,0.09)",
            borderRadius:"24px",padding:"32px",width:"420px",maxWidth:"92vw",
            boxShadow:"0 40px 80px rgba(0,0,0,0.7)",animation:"dropIn 0.2s ease",
          }}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"24px"}}>
              <div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"20px",letterSpacing:"-0.02em"}}>
                  {connectedWallet ? "Switch Wallet" : "Connect Wallet"}
                </div>
                <div style={{fontSize:"12px",color:"rgba(240,244,255,0.35)",marginTop:"4px"}}>
                  Choose your preferred wallet to connect
                </div>
              </div>
              <button onClick={()=>setShowWallet(false)} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"10px",width:34,height:34,color:"rgba(255,255,255,0.5)",cursor:"pointer",fontSize:"14px"}}>✕</button>
            </div>

            {/* Wallet list */}
            <div style={{display:"flex",flexDirection:"column",gap:"8px",marginBottom:"20px"}}>
              {[
                { name:"MetaMask",      icon:"🦊", desc:"Most popular • EVM chains",         color:"#F6851B", popular:true  },
                { name:"Rabby Wallet",  icon:"🐰", desc:"Multi-chain • DeFi optimised",      color:"#8697FF", popular:false },
                { name:"Phantom",       icon:"👻", desc:"Solana • EVM • Bitcoin",             color:"#AB9FF2", popular:false },
                { name:"WalletConnect", icon:"🔗", desc:"200+ wallets via QR code",           color:"#3B99FC", popular:false },
                { name:"Coinbase Wallet",icon:"🔵",desc:"Easy onboarding • Mobile friendly",  color:"#0052FF", popular:false },
                { name:"Trust Wallet",  icon:"🛡️", desc:"Mobile first • 70+ blockchains",    color:"#3375BB", popular:false },
                { name:"Ledger",        icon:"🔐", desc:"Hardware wallet • Maximum security", color:"#00E5A0", popular:false },
                { name:"OKX Wallet",    icon:"⭕", desc:"Multi-chain • Web3 gateway",         color:"#FFFFFF", popular:false },
              ].map(w => (
                <button key={w.name}
                  onMouseDown={() => { setConnectedWallet(w); setShowWallet(false); }}
                  style={{
                    display:"flex",alignItems:"center",gap:"14px",
                    background: connectedWallet?.name === w.name ? "rgba(0,229,160,0.08)" : "rgba(255,255,255,0.03)",
                    border: connectedWallet?.name === w.name ? "1px solid rgba(0,229,160,0.25)" : "1px solid rgba(255,255,255,0.07)",
                    borderRadius:"14px",padding:"14px 16px",
                    cursor:"pointer",width:"100%",textAlign:"left",
                    transition:"all 0.15s",
                  }}
                  onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.07)";e.currentTarget.style.borderColor="rgba(255,255,255,0.12)";}}
                  onMouseLeave={e=>{e.currentTarget.style.background=connectedWallet?.name===w.name?"rgba(0,229,160,0.08)":"rgba(255,255,255,0.03)";e.currentTarget.style.borderColor=connectedWallet?.name===w.name?"rgba(0,229,160,0.25)":"rgba(255,255,255,0.07)";}}
                >
                  <div style={{
                    width:42,height:42,borderRadius:"12px",flexShrink:0,
                    background:`${w.color}15`,border:`1.5px solid ${w.color}30`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:"20px",
                  }}>{w.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                      <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:"14px",color:"#fff"}}>{w.name}</span>
                      {w.popular && <span style={{fontSize:"9px",background:"rgba(0,229,160,0.12)",color:"#00E5A0",padding:"2px 7px",borderRadius:"4px",fontWeight:700,letterSpacing:"0.06em"}}>POPULAR</span>}
                      {connectedWallet?.name===w.name && <span style={{marginLeft:"auto",color:"#00E5A0",fontSize:"12px"}}>✓ Connected</span>}
                    </div>
                    <div style={{fontSize:"11px",color:"rgba(240,244,255,0.35)",marginTop:"2px"}}>{w.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            {connectedWallet && (
              <button
                onMouseDown={() => { setConnectedWallet(null); setShowWallet(false); }}
                style={{
                  width:"100%",padding:"12px",
                  background:"rgba(255,90,114,0.08)",
                  border:"1px solid rgba(255,90,114,0.2)",
                  borderRadius:"12px",color:"#FF5A72",
                  fontFamily:"'Outfit',sans-serif",fontWeight:600,
                  fontSize:"13px",cursor:"pointer",transition:"all 0.2s",
                }}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,90,114,0.14)"}
                onMouseLeave={e=>e.currentTarget.style.background="rgba(255,90,114,0.08)"}
              >Disconnect Wallet</button>
            )}

            <div style={{marginTop:"16px",fontSize:"11px",color:"rgba(240,244,255,0.2)",textAlign:"center",lineHeight:1.6}}>
              AtlasSwap never stores your wallet credentials.<br/>Connection is local to your browser only.
            </div>
          </div>
        </div>
      )}

      {/* ── Backend Rate Panel (Ctrl+Shift+A) ── */}
      {showBackend && (
        <BackendPanel
          comparison={comparison}
          fromCoin={fromCoin}
          toCoin={toCoin}
          sendAmt={sendAmt}
          onClose={() => setShowBackend(false)}
        />
      )}

      {/* ══════════════════════════════════════════
          EXCHANGE MODAL
      ══════════════════════════════════════════ */}
      {showExchange && (
        <div onClick={() => setShowExchange(false)} style={{
          position:"fixed",inset:0,zIndex:1000,
          background:"rgba(0,0,0,0.85)",backdropFilter:"blur(10px)",
          display:"flex",alignItems:"center",justifyContent:"center",
          animation:"fadeIn 0.2s ease",
        }}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:"#0C1220",border:"1px solid rgba(255,255,255,0.09)",
            borderRadius:"24px",padding:"36px",width:"600px",maxWidth:"92vw",
            boxShadow:"0 40px 80px rgba(0,0,0,0.7)",animation:"dropIn 0.2s ease",
            maxHeight:"88vh",overflowY:"auto",
          }}>
            {/* Header */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"26px"}}>
              <div>
                <div style={{fontSize:"10px",color:"#00E5A0",fontWeight:700,letterSpacing:"0.12em",marginBottom:"8px"}}>⇅ HOW IT WORKS</div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"22px",letterSpacing:"-0.02em"}}>Exchange Crypto</div>
                <div style={{fontSize:"13px",color:"rgba(240,244,255,0.4)",marginTop:"6px",lineHeight:1.6,maxWidth:"420px"}}>
                  AtlasSwap is the simplest way to swap one cryptocurrency for another — no account, no waiting, no intermediary holding your funds.
                </div>
              </div>
              <button onClick={()=>setShowExchange(false)} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"10px",width:34,height:34,color:"rgba(255,255,255,0.5)",cursor:"pointer",fontSize:"14px",flexShrink:0,marginLeft:"16px"}}>✕</button>
            </div>

            {/* How a swap works — step by step */}
            <div style={{marginBottom:"24px"}}>
              <div style={{fontSize:"10px",color:"rgba(240,244,255,0.3)",fontWeight:700,letterSpacing:"0.1em",marginBottom:"14px"}}>THE SWAP PROCESS — STEP BY STEP</div>
              {[
                { n:"01", title:"Choose your coins", desc:"Select the cryptocurrency you want to send and the one you want to receive. AtlasSwap supports 1,500+ coins across every major blockchain." },
                { n:"02", title:"Enter your amount", desc:"Type in how much you want to swap. The estimated receive amount updates in real time as all three exchange providers are queried simultaneously in the background." },
                { n:"03", title:"Paste your wallet address", desc:"Enter the destination wallet address where you want to receive your coins. This is the only thing we ask — no email, no account, no identity." },
                { n:"04", title:"Review and confirm", desc:"You'll see a full summary — the amount you're sending, the estimated amount you'll receive, which provider is routing your swap, and the estimated time." },
                { n:"05", title:"Send your crypto", desc:"After confirming, you'll receive a deposit address. Send your crypto there. The exchange provider processes your swap and sends the output directly to your wallet." },
                { n:"06", title:"Swap complete", desc:"Your exchanged crypto arrives in your wallet. Average completion time is 5 to 20 minutes depending on network congestion. AtlasSwap never touches your funds at any point." },
              ].map((s,i)=>(
                <div key={s.n} style={{display:"flex",gap:"16px",marginBottom:"14px",alignItems:"flex-start"}}>
                  <div style={{width:32,height:32,borderRadius:"10px",background:"rgba(0,229,160,0.08)",border:"1px solid rgba(0,229,160,0.18)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"11px",color:"#00E5A0",letterSpacing:"0.05em"}}>{s.n}</div>
                  <div>
                    <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:"13px",marginBottom:"4px"}}>{s.title}</div>
                    <div style={{fontSize:"12px",color:"rgba(240,244,255,0.4)",lineHeight:1.7}}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Trust block */}
            <div style={{background:"rgba(0,229,160,0.04)",border:"1px solid rgba(0,229,160,0.12)",borderRadius:"14px",padding:"18px 20px",marginBottom:"20px"}}>
              <div style={{fontSize:"10px",color:"#00E5A0",fontWeight:700,letterSpacing:"0.1em",marginBottom:"12px"}}>OUR COMMITMENT TO YOU</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
                {[
                  ["🔒","Your funds are never held","AtlasSwap is a routing layer, not a wallet. We never take custody of your crypto at any stage."],
                  ["👤","Zero personal data collected","We do not collect your name, email, IP address, or any identifying information. Swap anonymously."],
                  ["📊","Rates shown are real","Every rate you see is fetched live from actual exchange APIs — not estimated, not delayed, not inflated."],
                  ["⚡","No hidden fees","The rate shown already includes all applicable fees. What you see is what you get, every single time."],
                ].map(([icon,title,desc])=>(
                  <div key={title} style={{display:"flex",gap:"10px",alignItems:"flex-start"}}>
                    <span style={{fontSize:"18px",flexShrink:0}}>{icon}</span>
                    <div>
                      <div style={{fontSize:"12px",fontWeight:700,color:"#fff",marginBottom:"3px"}}>{title}</div>
                      <div style={{fontSize:"11px",color:"rgba(240,244,255,0.38)",lineHeight:1.6}}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{fontSize:"11px",color:"rgba(240,244,255,0.2)",textAlign:"center"}}>
              Questions? Contact us via the footer · atlasswap.io
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          FEATURES MODAL
      ══════════════════════════════════════════ */}
      {showFeatures && (
        <div onClick={() => setShowFeatures(false)} style={{
          position:"fixed",inset:0,zIndex:1000,
          background:"rgba(0,0,0,0.85)",backdropFilter:"blur(10px)",
          display:"flex",alignItems:"center",justifyContent:"center",
          animation:"fadeIn 0.2s ease",
        }}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:"#0C1220",border:"1px solid rgba(255,255,255,0.09)",
            borderRadius:"24px",padding:"36px",width:"620px",maxWidth:"92vw",
            boxShadow:"0 40px 80px rgba(0,0,0,0.7)",animation:"dropIn 0.2s ease",
            maxHeight:"88vh",overflowY:"auto",
          }}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"26px"}}>
              <div>
                <div style={{fontSize:"10px",color:"#00E5A0",fontWeight:700,letterSpacing:"0.12em",marginBottom:"8px"}}>✦ PLATFORM CAPABILITIES</div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"22px",letterSpacing:"-0.02em"}}>Features Built on Trust</div>
                <div style={{fontSize:"13px",color:"rgba(240,244,255,0.4)",marginTop:"6px",lineHeight:1.6,maxWidth:"440px"}}>
                  Every feature AtlasSwap ships is designed around one principle — you should always know exactly what is happening with your swap and why.
                </div>
              </div>
              <button onClick={()=>setShowFeatures(false)} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"10px",width:34,height:34,color:"rgba(255,255,255,0.5)",cursor:"pointer",fontSize:"14px",flexShrink:0,marginLeft:"16px"}}>✕</button>
            </div>

            {/* Feature cards */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"22px"}}>
              {[
                { icon:"⚡", color:"#00E5A0", title:"Real-Time Rate Aggregation",
                  desc:"All three exchange providers — ChangeNOW, SimpleSwap, and Swapzone — are queried simultaneously the moment you enter an amount. The fastest and best rate wins. You never pay more than necessary." },
                { icon:"🔐", color:"#7B9EF0", title:"Non-Custodial Architecture",
                  desc:"AtlasSwap has no wallet, no treasury, and no ability to freeze or delay your funds. Swaps execute peer-to-peer via our exchange partners. We are a routing layer, nothing more." },
                { icon:"🌐", color:"#00C4FF", title:"1,500+ Coin Coverage",
                  desc:"Bitcoin, Ethereum, Solana, BNB, XRP, USDT, DOGE, ADA and over 1,500 more. If it trades on a major exchange, AtlasSwap can route it. Coverage expands automatically as our partners add new assets." },
                { icon:"👤", color:"#F7931A", title:"Zero Registration Required",
                  desc:"No email. No password. No identity verification. No account to create or maintain. The only thing AtlasSwap needs is your destination wallet address. That is all." },
                { icon:"📊", color:"#00E5A0", title:"Transparent Live Rates",
                  desc:"Every rate displayed on AtlasSwap is pulled live from real exchange APIs at the moment you request it. There are no markups on displayed rates. The rate shown is the rate you get." },
                { icon:"🛡️", color:"#7B9EF0", title:"No KYC. Ever.",
                  desc:"AtlasSwap does not collect, store, or transmit personal identification data. Our exchange partners handle all compliance obligations. Your anonymity is structurally preserved by design, not by policy." },
                { icon:"🔄", color:"#00C4FF", title:"Best-Route Auto-Selection",
                  desc:"You never need to manually compare rates across providers. AtlasSwap's aggregation engine does it automatically and routes your swap through whichever provider returns the best output amount at that instant." },
                { icon:"📱", color:"#F7931A", title:"No App Required",
                  desc:"AtlasSwap runs entirely in your browser. No download, no installation, no extension. Swap from any device — desktop, tablet, or mobile — anywhere in the world, at any time." },
              ].map(f=>(
                <div key={f.title} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"14px",padding:"18px",transition:"all 0.2s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=f.color+"30";e.currentTarget.style.background="rgba(255,255,255,0.05)";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.07)";e.currentTarget.style.background="rgba(255,255,255,0.03)";}}>
                  <div style={{fontSize:"22px",marginBottom:"10px"}}>{f.icon}</div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:"13px",color:f.color,marginBottom:"7px",letterSpacing:"-0.01em"}}>{f.title}</div>
                  <div style={{fontSize:"12px",color:"rgba(240,244,255,0.38)",lineHeight:1.7}}>{f.desc}</div>
                </div>
              ))}
            </div>

            {/* Bottom stat bar */}
            <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"14px",padding:"16px 20px",display:"flex",justifyContent:"space-around"}}>
              {[["1,500+","Coins"],["3","Exchange APIs"],["0%","Data Collected"],["100%","Non-Custodial"]].map(([v,l])=>(
                <div key={l} style={{textAlign:"center"}}>
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"20px",color:"#00E5A0",letterSpacing:"-0.02em"}}>{v}</div>
                  <div style={{fontSize:"10px",color:"rgba(240,244,255,0.3)",marginTop:"3px",fontWeight:500}}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          API PARTNERS MODAL
      ══════════════════════════════════════════ */}
      {showPartners && (
        <div onClick={() => setShowPartners(false)} style={{
          position:"fixed",inset:0,zIndex:1000,
          background:"rgba(0,0,0,0.85)",backdropFilter:"blur(10px)",
          display:"flex",alignItems:"center",justifyContent:"center",
          animation:"fadeIn 0.2s ease",
        }}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:"#0C1220",border:"1px solid rgba(255,255,255,0.09)",
            borderRadius:"24px",padding:"36px",width:"600px",maxWidth:"92vw",
            boxShadow:"0 40px 80px rgba(0,0,0,0.7)",animation:"dropIn 0.2s ease",
            maxHeight:"88vh",overflowY:"auto",
          }}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"26px"}}>
              <div>
                <div style={{fontSize:"10px",color:"#00E5A0",fontWeight:700,letterSpacing:"0.12em",marginBottom:"8px"}}>✦ EXCHANGE NETWORK</div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"22px",letterSpacing:"-0.02em"}}>Our API Partners</div>
                <div style={{fontSize:"13px",color:"rgba(240,244,255,0.4)",marginTop:"6px",lineHeight:1.6,maxWidth:"420px"}}>
                  AtlasSwap is transparent about who powers every swap. We work exclusively with established, reputable non-custodial exchange providers — and we query all three on every single swap you make.
                </div>
              </div>
              <button onClick={()=>setShowPartners(false)} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"10px",width:34,height:34,color:"rgba(255,255,255,0.5)",cursor:"pointer",fontSize:"14px",flexShrink:0,marginLeft:"16px"}}>✕</button>
            </div>

            {/* Why we publish our partners */}
            <div style={{background:"rgba(0,229,160,0.04)",border:"1px solid rgba(0,229,160,0.12)",borderRadius:"14px",padding:"16px 18px",marginBottom:"22px"}}>
              <div style={{fontSize:"12px",color:"rgba(240,244,255,0.55)",lineHeight:1.75}}>
                <strong style={{color:"#00E5A0",fontWeight:700}}>Why we name our partners publicly:</strong> Many swap aggregators hide which providers they use. We believe you have the right to know exactly whose infrastructure is processing your funds. Every provider listed below is a regulated, established exchange service with a public track record.
              </div>
            </div>

            {/* Partner cards */}
            <div style={{display:"flex",flexDirection:"column",gap:"14px",marginBottom:"20px"}}>
              {[
                {
                  name:"ChangeNOW", url:"changenow.io", color:"#00E5A0",
                  badge:"Primary Provider", badgeBg:"rgba(0,229,160,0.12)", badgeColor:"#00E5A0",
                  icon:"⚡", founded:"Founded 2017",
                  desc:"AtlasSwap's primary routing partner. ChangeNOW is one of the most established non-custodial swap services in the world, processing millions of swaps since 2017. They support 1,500+ coins, require no registration, and never hold user funds. Our partner integration earns a 0.4% commission on swap volume — fully disclosed.",
                  trustPoints:["No registration required","1,500+ supported assets","Operational since 2017","Zero custody model"],
                  stats:[["1,500+","Coins"],["0.4%","Our Commission"],["Since 2017","Established"]],
                },
                {
                  name:"SimpleSwap", url:"simpleswap.io", color:"#7B9EF0",
                  badge:"Secondary Provider", badgeBg:"rgba(123,158,240,0.12)", badgeColor:"#7B9EF0",
                  icon:"◈", founded:"Founded 2018",
                  desc:"SimpleSwap is a clean, no-registration swap platform known for competitive rates and a transparent affiliate programme. It supports both fixed and floating rate swaps across 600+ coins. AtlasSwap queries SimpleSwap in real time and routes to it automatically when it returns the best rate for your pair.",
                  trustPoints:["Fixed & floating rate options","600+ supported assets","Transparent fee structure","No KYC required"],
                  stats:[["600+","Coins"],["Fixed/Float","Rate Type"],["Since 2018","Established"]],
                },
                {
                  name:"Swapzone", url:"swapzone.io", color:"#F7931A",
                  badge:"Meta-Aggregator", badgeBg:"rgba(247,147,26,0.12)", badgeColor:"#F7931A",
                  icon:"◎", founded:"Founded 2019",
                  desc:"Swapzone is itself a meta-aggregator — it compares rates across 15+ underlying exchange providers and returns the best single result. By including Swapzone in our stack, AtlasSwap's rate comparison net extends across dozens of exchanges simultaneously, giving you a broader best-rate guarantee than any single provider can offer.",
                  trustPoints:["Aggregates 15+ providers","Best-of-market rate logic","No registration required","Real-time comparison engine"],
                  stats:[["15+","Providers Behind It"],["Best-of","Rate Logic"],["Since 2019","Established"]],
                },
              ].map(p=>(
                <div key={p.name} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"16px",padding:"20px",transition:"all 0.2s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=p.color+"30";e.currentTarget.style.background="rgba(255,255,255,0.05)";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.07)";e.currentTarget.style.background="rgba(255,255,255,0.03)";}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:"14px"}}>
                    <div style={{width:44,height:44,borderRadius:"12px",flexShrink:0,background:p.color+"15",border:`1.5px solid ${p.color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",color:p.color}}>{p.icon}</div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"5px",flexWrap:"wrap"}}>
                        <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"15px"}}>{p.name}</span>
                        <span style={{fontSize:"9px",background:p.badgeBg,color:p.badgeColor,padding:"2px 8px",borderRadius:"5px",fontWeight:700,letterSpacing:"0.07em"}}>{p.badge}</span>
                        <span style={{fontSize:"10px",color:"rgba(240,244,255,0.25)",marginLeft:"auto"}}>{p.founded}</span>
                        <a href={`https://${p.url}`} target="_blank" rel="noopener noreferrer"
                          style={{fontSize:"11px",color:"rgba(240,244,255,0.25)",textDecoration:"none",letterSpacing:"0.03em"}}
                          onMouseEnter={e=>e.target.style.color=p.color}
                          onMouseLeave={e=>e.target.style.color="rgba(240,244,255,0.25)"}>{p.url} ↗</a>
                      </div>
                      <p style={{fontSize:"12px",color:"rgba(240,244,255,0.42)",lineHeight:1.75,marginBottom:"12px"}}>{p.desc}</p>
                      {/* Trust points */}
                      <div style={{display:"flex",flexWrap:"wrap",gap:"6px",marginBottom:"12px"}}>
                        {p.trustPoints.map(t=>(
                          <span key={t} style={{fontSize:"10px",color:"rgba(240,244,255,0.45)",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"6px",padding:"3px 9px",display:"flex",alignItems:"center",gap:"5px"}}>
                            <span style={{color:p.color,fontSize:"8px"}}>✓</span>{t}
                          </span>
                        ))}
                      </div>
                      {/* Stats */}
                      <div style={{display:"flex",gap:"8px"}}>
                        {p.stats.map(([val,label])=>(
                          <div key={label} style={{flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"10px",padding:"9px 10px",textAlign:"center"}}>
                            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"13px",color:p.color}}>{val}</div>
                            <div style={{fontSize:"9px",color:"rgba(240,244,255,0.3)",marginTop:"2px",fontWeight:500}}>{label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{fontSize:"11px",color:"rgba(240,244,255,0.2)",textAlign:"center",lineHeight:1.7}}>
              All three APIs are queried simultaneously on every swap · Best rate routes automatically<br/>
              AtlasSwap earns a 0.4% referral commission on swap volume — fully disclosed above
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          ABOUT MODAL
      ══════════════════════════════════════════ */}
      {showAbout && (
        <div onClick={() => setShowAbout(false)} style={{
          position:"fixed",inset:0,zIndex:1000,
          background:"rgba(0,0,0,0.85)",backdropFilter:"blur(10px)",
          display:"flex",alignItems:"center",justifyContent:"center",
          animation:"fadeIn 0.2s ease",
        }}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:"#0C1220",border:"1px solid rgba(255,255,255,0.09)",
            borderRadius:"24px",padding:"36px",width:"580px",maxWidth:"92vw",
            boxShadow:"0 40px 80px rgba(0,0,0,0.7)",animation:"dropIn 0.2s ease",
            maxHeight:"88vh",overflowY:"auto",
          }}>
            {/* Logo header */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"24px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                <div style={{width:44,height:44,borderRadius:"12px",background:"linear-gradient(135deg,#00E5A0 0%,#00C4FF 100%)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px rgba(0,229,160,0.3)"}}>
                  <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="5" r="3" fill="#070B14"/>
                    <circle cx="4" cy="15" r="3" fill="#070B14"/>
                    <circle cx="16" cy="15" r="3" fill="#070B14"/>
                    <line x1="10" y1="8" x2="4" y2="12" stroke="#070B14" strokeWidth="1.5"/>
                    <line x1="10" y1="8" x2="16" y2="12" stroke="#070B14" strokeWidth="1.5"/>
                    <line x1="4" y1="15" x2="16" y2="15" stroke="#070B14" strokeWidth="1.5"/>
                  </svg>
                </div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"22px",letterSpacing:"-0.03em"}}>
                  ATLAS<span style={{color:"#00E5A0"}}>SWAP</span>
                </div>
              </div>
              <button onClick={()=>setShowAbout(false)} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"10px",width:34,height:34,color:"rgba(255,255,255,0.5)",cursor:"pointer",fontSize:"14px",flexShrink:0}}>✕</button>
            </div>

            {/* Mission statement */}
            <div style={{background:"rgba(0,229,160,0.05)",border:"1px solid rgba(0,229,160,0.14)",borderRadius:"14px",padding:"20px 22px",marginBottom:"22px"}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:"16px",lineHeight:1.55,color:"#fff",letterSpacing:"-0.01em",marginBottom:"10px"}}>
                "Access to the best exchange rate should be automatic, instant, and require nothing from you except a wallet address."
              </div>
              <div style={{fontSize:"12px",color:"rgba(0,229,160,0.7)",fontWeight:600,letterSpacing:"0.05em"}}>— THE ATLASSWAP MISSION</div>
            </div>

            {/* Body */}
            <div style={{fontSize:"13px",color:"rgba(240,244,255,0.5)",lineHeight:1.85,marginBottom:"22px"}}>
              <p style={{marginBottom:"14px"}}>
                AtlasSwap is a <strong style={{color:"#fff",fontWeight:600}}>non-custodial crypto swap aggregator</strong>. We connect to ChangeNOW, SimpleSwap, and Swapzone simultaneously and route every swap through whichever provider offers the best rate at that exact moment — automatically, with no manual comparison required from you.
              </p>
              <p style={{marginBottom:"14px"}}>
                We built AtlasSwap on a simple belief: <strong style={{color:"#fff",fontWeight:600}}>you should never have to trust us with your funds</strong>. Our architecture makes that structurally impossible. AtlasSwap has no wallet. We cannot hold, delay, freeze, or lose your crypto. Your swap goes directly from your wallet to the exchange provider to your destination wallet.
              </p>
              <p style={{marginBottom:"14px"}}>
                We are also <strong style={{color:"#fff",fontWeight:600}}>transparent about how we earn</strong>. AtlasSwap receives a 0.4% referral commission from our exchange partners on swap volume. This fee is already factored into the rates shown — it does not come out of your swap on top. You pay the same rate you would get going directly to any provider.
              </p>
              <p>
                No hidden fees. No data harvesting. No registration walls. Just the best available rate, routed instantly, across 1,500+ coins and every major blockchain.
              </p>
            </div>

            {/* Core principles */}
            <div style={{marginBottom:"22px"}}>
              <div style={{fontSize:"10px",color:"rgba(240,244,255,0.3)",fontWeight:700,letterSpacing:"0.1em",marginBottom:"12px"}}>CORE PRINCIPLES</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
                {[
                  {icon:"🔒",title:"Structural Non-Custody",desc:"We cannot hold your funds. Not by policy — by architecture. AtlasSwap has no wallet infrastructure."},
                  {icon:"📢",title:"Full Transparency",desc:"We name our partners, disclose our commission, and explain exactly how every swap is routed."},
                  {icon:"👤",title:"Privacy by Design",desc:"We collect zero personal data. No email, no IP logging, no identity. Your anonymity is built in."},
                  {icon:"⚖️",title:"Fair Rates Always",desc:"Rates are pulled live from exchange APIs. We add no markup. The rate shown is the rate executed."},
                ].map(p=>(
                  <div key={p.title} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"12px",padding:"14px 15px",display:"flex",gap:"11px",alignItems:"flex-start"}}>
                    <span style={{fontSize:"18px",flexShrink:0,marginTop:"1px"}}>{p.icon}</span>
                    <div>
                      <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:"12px",marginBottom:"4px"}}>{p.title}</div>
                      <div style={{fontSize:"11px",color:"rgba(240,244,255,0.35)",lineHeight:1.6}}>{p.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:"18px",borderTop:"1px solid rgba(255,255,255,0.06)"}}>
              <div style={{fontSize:"12px",color:"rgba(240,244,255,0.25)"}}>atlasswap.io · © 2026 AtlasSwap</div>
              <div style={{display:"flex",gap:"6px"}}>
                {["Non-Custodial","No KYC","Instant","Transparent"].map(t=>(
                  <span key={t} style={{fontSize:"10px",color:"#00E5A0",fontWeight:700,background:"rgba(0,229,160,0.08)",border:"1px solid rgba(0,229,160,0.18)",borderRadius:"6px",padding:"3px 9px",letterSpacing:"0.05em"}}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          CONTACTS MODAL — service issues
      ══════════════════════════════════════════ */}
      {showContacts && (
        <div onClick={() => setShowContacts(false)} style={{
          position:"fixed",inset:0,zIndex:1000,
          background:"rgba(0,0,0,0.85)",backdropFilter:"blur(10px)",
          display:"flex",alignItems:"center",justifyContent:"center",
          animation:"fadeIn 0.2s ease",
        }}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:"#0C1220",border:"1px solid rgba(255,255,255,0.09)",
            borderRadius:"24px",padding:"36px",width:"480px",maxWidth:"92vw",
            boxShadow:"0 40px 80px rgba(0,0,0,0.7)",animation:"dropIn 0.2s ease",
          }}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"22px"}}>
              <div>
                <div style={{fontSize:"10px",color:"#00E5A0",fontWeight:700,letterSpacing:"0.12em",marginBottom:"8px"}}>✦ SUPPORT</div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"22px",letterSpacing:"-0.02em"}}>Contacts</div>
                <div style={{fontSize:"13px",color:"rgba(240,244,255,0.45)",marginTop:"8px",lineHeight:1.55}}>
                  For service issues — outages, failed or stuck swaps, rate errors, or anything that blocks you from using AtlasSwap.
                </div>
              </div>
              <button onClick={()=>setShowContacts(false)} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"10px",width:34,height:34,color:"rgba(255,255,255,0.5)",cursor:"pointer",fontSize:"14px",flexShrink:0,marginLeft:"16px"}}>✕</button>
            </div>

            <div style={{background:"rgba(0,229,160,0.05)",border:"1px solid rgba(0,229,160,0.14)",borderRadius:"14px",padding:"18px 20px",marginBottom:"20px"}}>
              <div style={{fontSize:"12px",color:"rgba(240,244,255,0.5)",lineHeight:1.75,marginBottom:"14px"}}>
                Please include your <strong style={{color:"#fff",fontWeight:600}}>exchange ID</strong> (if you have one), the <strong style={{color:"#fff",fontWeight:600}}>coins and amount</strong>, and a short description of what went wrong. We route technical issues to the right team as quickly as we can.
              </div>
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("AtlasSwap — service issue")}`}
                style={{
                  display:"inline-flex",alignItems:"center",justifyContent:"center",gap:"8px",
                  width:"100%",padding:"12px 18px",borderRadius:"12px",border:"none",cursor:"pointer",
                  fontFamily:"'Outfit',sans-serif",fontWeight:700,fontSize:"14px",letterSpacing:"0.03em",
                  background:"linear-gradient(135deg, #00E5A0, #00C4FF)",color:"#070B14",
                  textDecoration:"none",boxShadow:"0 4px 16px rgba(0,229,160,0.25)",
                }}
              >
                Email {SUPPORT_EMAIL}
              </a>
            </div>

            <div style={{fontSize:"11px",color:"rgba(240,244,255,0.22)",textAlign:"center",lineHeight:1.65}}>
              We do not offer investment or trading advice. For wallet or blockchain questions, contact your wallet provider.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
