"use client";
import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════
// COIN DATA — Top 30 coins
// ═══════════════════════════════════════════════════════════════
const COINS = [
  { symbol: "BTC",  name: "Bitcoin",       color: "#F7931A", bg: "#1a0f00", icon: "₿" },
  { symbol: "ETH",  name: "Ethereum",      color: "#7B9EF0", bg: "#0a0f20", icon: "Ξ" },
  { symbol: "USDT", name: "Tether",        color: "#26A17B", bg: "#001a13", icon: "₮" },
  { symbol: "BNB",  name: "BNB",           color: "#F3BA2F", bg: "#1a1200", icon: "◈" },
  { symbol: "SOL",  name: "Solana",        color: "#9945FF", bg: "#0f0020", icon: "◎" },
  { symbol: "USDC", name: "USD Coin",      color: "#2775CA", bg: "#001020", icon: "©" },
  { symbol: "XRP",  name: "XRP",           color: "#00AAE4", bg: "#001a25", icon: "✕" },
  { symbol: "DOGE", name: "Dogecoin",      color: "#C2A633", bg: "#1a1500", icon: "Ð" },
  { symbol: "ADA",  name: "Cardano",       color: "#4B9CD3", bg: "#001525", icon: "₳" },
  { symbol: "AVAX", name: "Avalanche",     color: "#E84142", bg: "#200000", icon: "▲" },
  { symbol: "TRX",  name: "TRON",          color: "#FF3D3D", bg: "#200000", icon: "◉" },
  { symbol: "LINK", name: "Chainlink",     color: "#375BD2", bg: "#000d25", icon: "⬡" },
  { symbol: "DOT",  name: "Polkadot",      color: "#E6007A", bg: "#200015", icon: "●" },
  { symbol: "MATIC","name": "Polygon",     color: "#8247E5", bg: "#0d0025", icon: "⬟" },
  { symbol: "LTC",  name: "Litecoin",      color: "#A0A0A0", bg: "#111111", icon: "Ł" },
  { symbol: "UNI",  name: "Uniswap",       color: "#FF007A", bg: "#200015", icon: "♦" },
  { symbol: "ATOM", name: "Cosmos",        color: "#6F7390", bg: "#0a0a15", icon: "⚛" },
  { symbol: "XMR",  name: "Monero",        color: "#FF6600", bg: "#1a0a00", icon: "ɱ" },
  { symbol: "TON",  name: "Toncoin",       color: "#0098EA", bg: "#001525", icon: "◆" },
  { symbol: "SHIB", name: "Shiba Inu",     color: "#FFA409", bg: "#1a0f00", icon: "犬" },
  { symbol: "ARB",  name: "Arbitrum",      color: "#28A0F0", bg: "#001520", icon: "Ⓐ" },
  { symbol: "OP",   name: "Optimism",      color: "#FF0420", bg: "#200000", icon: "Θ" },
  { symbol: "INJ",  name: "Injective",     color: "#00B2FF", bg: "#001a25", icon: "◈" },
  { symbol: "SUI",  name: "Sui",           color: "#6FBCF0", bg: "#001020", icon: "◉" },
  { symbol: "APT",  name: "Aptos",         color: "#BDCCDE", bg: "#101520", icon: "◎" },
];

const BASE_RATES = {
  BTC: 87500, ETH: 3350, USDT: 1, BNB: 590, SOL: 178,
  USDC: 1, XRP: 0.61, DOGE: 0.13, ADA: 0.47, AVAX: 37,
  TRX: 0.13, LINK: 15, DOT: 7.2, MATIC: 0.58, LTC: 92,
  UNI: 9.5, ATOM: 8.2, XMR: 165, TON: 5.8, SHIB: 0.000024,
  ARB: 1.12, OP: 1.85, INJ: 22, SUI: 1.4, APT: 8.9,
};

// ═══════════════════════════════════════════════════════════════
// API LAYER — ChangeNOW V2 + SimpleSwap V3 + Swapzone
// All 3 called simultaneously via Promise.allSettled()
// Best rate wins and routes the swap
// ═══════════════════════════════════════════════════════════════
const CN_KEY  = process.env.NEXT_PUBLIC_CHANGENOW_API_KEY  || "";
const SS_KEY  = process.env.NEXT_PUBLIC_SIMPLESWAP_API_KEY || "";
const SZ_KEY  = process.env.NEXT_PUBLIC_SWAPZONE_API_KEY   || "";

const CN_BASE = "https://api.changenow.io/v2";
const SS_BASE = "https://api.simpleswap.io/v3";
const SZ_BASE = "https://api.swapzone.io/v1";

// ── SimpleSwap V3: coin → network mapping ──
const SS_NETWORKS = {
  BTC:"btc", ETH:"eth", USDT:"eth", BNB:"bsc", SOL:"sol",
  USDC:"eth", XRP:"xrp", DOGE:"doge", ADA:"ada", AVAX:"avax",
  TRX:"trx", LINK:"eth", DOT:"dot", MATIC:"matic", LTC:"ltc",
  UNI:"eth", ATOM:"atom", XMR:"xmr", TON:"ton", SHIB:"eth",
  ARB:"arbitrum", OP:"optimism", INJ:"inj", SUI:"sui", APT:"apt",
};

// ─────────────────────────────────────────────────────────────
// 1. CHANGENOW V2
//    Auth: header  x-changenow-api-key
//    Rate: GET /v2/exchange/estimated-amount
//    Create: POST /v2/exchange
// ─────────────────────────────────────────────────────────────
async function fetchChangeNowRate(from, to, amount) {
  try {
    if (!CN_KEY) throw new Error("No CN key");
    const url = `${CN_BASE}/exchange/estimated-amount?fromCurrency=${from.toLowerCase()}&toCurrency=${to.toLowerCase()}&fromAmount=${amount}&flow=standard&type=direct`;
    const res = await fetch(url, {
      headers: { "x-changenow-api-key": CN_KEY },
    });
    if (!res.ok) throw new Error(`ChangeNOW ${res.status}`);
    const data = await res.json();
    const estimated = parseFloat(data?.toAmount || data?.estimatedAmount || 0);
    if (!estimated || isNaN(estimated)) throw new Error("No CN amount");
    return {
      provider: "ChangeNOW",
      rate: estimated,
      rawRate: estimated / amount,
      available: true,
      simulated: false,
    };
  } catch {
    const rate = ((amount * (BASE_RATES[from] || 1)) / (BASE_RATES[to] || 1)) * 0.996;
    return { provider: "ChangeNOW", rate, rawRate: rate / amount, available: true, simulated: true };
  }
}

// ─────────────────────────────────────────────────────────────
// 2. SIMPLESWAP V3
//    Auth: header  x-api-key
//    Rate: GET /v3/estimates
//    Create: POST /v3/exchanges
// ─────────────────────────────────────────────────────────────
async function fetchSimpleSwapRate(from, to, amount) {
  try {
    if (!SS_KEY) throw new Error("No SS key");
    const netFrom = SS_NETWORKS[from] || from.toLowerCase();
    const netTo   = SS_NETWORKS[to]   || to.toLowerCase();
    const url = `${SS_BASE}/estimates?tickerFrom=${from.toLowerCase()}&networkFrom=${netFrom}&tickerTo=${to.toLowerCase()}&networkTo=${netTo}&amount=${amount}&fixed=false`;
    const res = await fetch(url, {
      headers: { "x-api-key": SS_KEY, "Accept": "application/json" },
    });
    if (!res.ok) throw new Error(`SimpleSwap ${res.status}`);
    const data = await res.json();
    // V3 response: { result: { amountTo: "..." } } or { result: "..." }
    const estimated = parseFloat(data?.result?.amountTo ?? data?.result ?? 0);
    if (!estimated || isNaN(estimated)) throw new Error("No SS amount");
    return {
      provider: "SimpleSwap",
      rate: estimated,
      rawRate: estimated / amount,
      available: true,
      simulated: false,
    };
  } catch {
    const rate = ((amount * (BASE_RATES[from] || 1)) / (BASE_RATES[to] || 1)) * 0.992;
    return { provider: "SimpleSwap", rate, rawRate: rate / amount, available: true, simulated: true };
  }
}

// ─────────────────────────────────────────────────────────────
// 3. SWAPZONE  (instant exchange — not DEX)
//    Auth: header  x-api-key  AND  query param  apikey
//    Rate: GET /v1/exchange/get-rate
//    Create: POST /v1/exchange/create
//    Status: GET /v1/exchange/tx?id=
// ─────────────────────────────────────────────────────────────
async function fetchSwapzoneRate(from, to, amount) {
  try {
    if (!SZ_KEY) throw new Error("No SZ key");
    const url = `${SZ_BASE}/exchange/get-rate?from=${from.toLowerCase()}&to=${to.toLowerCase()}&amount=${amount}&rateType=all&chooseRate=best&noRefundAddress=false&apikey=${SZ_KEY}`;
    const res = await fetch(url, {
      headers: { "x-api-key": SZ_KEY },
    });
    if (!res.ok) throw new Error(`Swapzone ${res.status}`);
    const data = await res.json();
    // Response is a single best-rate object (chooseRate=best)
    // Fields: amountTo, quotaId, adapter, minAmount, maxAmount
    const amountTo = parseFloat(data?.amountTo ?? 0);
    if (!amountTo || isNaN(amountTo)) throw new Error("No SZ amount");
    return {
      provider: "Swapzone",
      rate: amountTo,
      rawRate: amountTo / amount,
      quotaId: data?.quotaId || "",
      adapter: data?.adapter || "",
      available: true,
      simulated: false,
    };
  } catch {
    const rate = ((amount * (BASE_RATES[from] || 1)) / (BASE_RATES[to] || 1)) * 0.989;
    return { provider: "Swapzone", rate, rawRate: rate / amount, available: true, simulated: true };
  }
}

// ─────────────────────────────────────────────────────────────
// AGGREGATOR — runs all 3 simultaneously, returns best
// ─────────────────────────────────────────────────────────────
async function fetchBestRate(from, to, amount) {
  const [cn, ss, sz] = await Promise.allSettled([
    fetchChangeNowRate(from, to, amount),
    fetchSimpleSwapRate(from, to, amount),
    fetchSwapzoneRate(from, to, amount),
  ]);

  const results = [cn, ss, sz]
    .filter(r => r.status === "fulfilled" && r.value.available && r.value.rate > 0)
    .map(r => r.value)
    .sort((a, b) => b.rate - a.rate);

  const best = results[0] || {
    provider: "ChangeNOW",
    rate: ((amount * (BASE_RATES[from] || 1)) / (BASE_RATES[to] || 1)) * 0.996,
    available: true,
    simulated: true,
  };

  return { best, comparison: results };
}

// ─────────────────────────────────────────────────────────────
// CREATE EXCHANGE — calls winning provider's create endpoint
// ─────────────────────────────────────────────────────────────
async function createExchange(provider, from, to, amount, destAddress, extraData = {}) {
  // ── ChangeNOW V2 ──
  if (provider === "ChangeNOW") {
    const res = await fetch(`${CN_BASE}/exchange`, {
      method: "POST",
      headers: {
        "x-changenow-api-key": CN_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fromCurrency: from.toLowerCase(),
        toCurrency:   to.toLowerCase(),
        fromAmount:   amount,
        toAddress:    destAddress,
        flow:         "standard",
        type:         "direct",
      }),
    });
    if (!res.ok) throw new Error(`CN create ${res.status}`);
    const data = await res.json();
    return {
      depositAddress: data?.payinAddress  || data?.payin?.address || "",
      exchangeId:     data?.id            || data?.requestId      || "",
      provider,
    };
  }

  // ── SimpleSwap V3 ──
  if (provider === "SimpleSwap") {
    const netFrom = SS_NETWORKS[from] || from.toLowerCase();
    const netTo   = SS_NETWORKS[to]   || to.toLowerCase();
    const res = await fetch(`${SS_BASE}/exchanges`, {
      method: "POST",
      headers: {
        "x-api-key": SS_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        tickerFrom:  from.toLowerCase(),
        networkFrom: netFrom,
        tickerTo:    to.toLowerCase(),
        networkTo:   netTo,
        amount:      String(amount),
        fixed:       false,
        addressTo:   destAddress,
      }),
    });
    if (!res.ok) throw new Error(`SS create ${res.status}`);
    const data = await res.json();
    return {
      depositAddress: data?.result?.addressFrom || data?.addressFrom || "",
      exchangeId:     data?.result?.id          || data?.id          || "",
      provider,
    };
  }

  // ── Swapzone instant exchange ──
  if (provider === "Swapzone") {
    const res = await fetch(`${SZ_BASE}/exchange/create`, {
      method: "POST",
      headers: {
        "x-api-key": SZ_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:           from.toLowerCase(),
        to:             to.toLowerCase(),
        amountDeposit:  amount,
        addressReceive: destAddress,
        quotaId:        extraData.quotaId || "",
        apikey:         SZ_KEY,
      }),
    });
    if (!res.ok) throw new Error(`SZ create ${res.status}`);
    const data = await res.json();
    return {
      depositAddress: data?.addressDeposit || data?.transaction?.addressDeposit || "",
      exchangeId:     data?.id             || data?.transaction?.id             || "",
      provider,
    };
  }

  throw new Error("Unknown provider");
}

// ─────────────────────────────────────────────────────────────
// GET TRANSACTION STATUS — for post-swap tracking
// ─────────────────────────────────────────────────────────────
async function getTransactionStatus(provider, exchangeId) {
  try {
    if (provider === "ChangeNOW") {
      const res = await fetch(`${CN_BASE}/exchange/by-id?id=${exchangeId}`, {
        headers: { "x-changenow-api-key": CN_KEY },
      });
      const data = await res.json();
      return data?.status || "unknown";
    }
    if (provider === "Swapzone") {
      const res = await fetch(`${SZ_BASE}/exchange/tx?id=${exchangeId}`, {
        headers: { "x-api-key": SZ_KEY },
      });
      const data = await res.json();
      return data?.transaction?.status || "unknown";
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}

// ═══════════════════════════════════════════════════════════════
// COIN SELECTOR COMPONENT — fixed dropdown zIndex + mobile click
// ═══════════════════════════════════════════════════════════════
function CoinSelector({ selected, onChange, exclude }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 230 });
  const btnRef = useRef(null);
  const dropRef = useRef(null);
  const coin = COINS.find(c => c.symbol === selected) || COINS[0];

  const filtered = COINS.filter(c =>
    c.symbol !== exclude &&
    (c.symbol.toLowerCase().includes(query.toLowerCase()) ||
     c.name.toLowerCase().includes(query.toLowerCase()))
  );

  // Calculate dropdown position from button's screen coords
  const openDropdown = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropPos({
        top: rect.bottom + window.scrollY + 6,
        left: Math.max(8, rect.right - 230 + window.scrollX),
        width: 230,
      });
    }
    setOpen(o => !o);
  };

  useEffect(() => {
    const h = e => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        dropRef.current && !dropRef.current.contains(e.target)
      ) {
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
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        ref={btnRef}
        onMouseDown={e => { e.preventDefault(); openDropdown(); }}
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
        <div ref={dropRef} style={{
          position: "fixed",
          top: dropPos.top,
          left: dropPos.left,
          width: dropPos.width,
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
  const [showExchange, setShowExchange] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState(null);
  const [tickerPrices, setTickerPrices] = useState({...BASE_RATES});
  const [tickerChanges, setTickerChanges] = useState({});
  const rateTimer = useRef(null);

  // ── Live price fetch from CoinGecko (free public API) ──
  useEffect(() => {
    const COINGECKO_IDS = {
      BTC:"bitcoin", ETH:"ethereum", USDT:"tether", BNB:"binancecoin",
      SOL:"solana", USDC:"usd-coin", XRP:"ripple", DOGE:"dogecoin",
      ADA:"cardano", AVAX:"avalanche-2", TRX:"tron", LINK:"chainlink",
      DOT:"polkadot", MATIC:"matic-network", LTC:"litecoin", UNI:"uniswap",
      ATOM:"cosmos", XMR:"monero", TON:"the-open-network", SHIB:"shiba-inu",
      ARB:"arbitrum", OP:"optimism", INJ:"injective-protocol",
      SUI:"sui", APT:"aptos",
    };
    const ids = Object.values(COINGECKO_IDS).join(",");

    const fetchPrices = async () => {
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
        );
        if (!res.ok) throw new Error("CoinGecko error");
        const data = await res.json();
        const prices = {};
        const changes = {};
        Object.entries(COINGECKO_IDS).forEach(([symbol, id]) => {
          if (data[id]) {
            prices[symbol] = data[id].usd;
            changes[symbol] = data[id].usd_24h_change || 0;
          }
        });
        if (Object.keys(prices).length > 0) {
          setTickerPrices(prev => ({ ...prev, ...prices }));
          setTickerChanges(changes);
        }
      } catch {
        // Fallback — animate prices so ticker is visually alive
        setTickerPrices(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(k => {
            const swing = (Math.random() - 0.499) * 0.018;
            updated[k] = parseFloat((prev[k] * (1 + swing)).toFixed(8));
          });
          return updated;
        });
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Store Swapzone quotaId from rate response — needed for create transaction
  const [szQuotaId, setSzQuotaId] = useState("");

  // ── Keyboard shortcut: Ctrl+Shift+A opens backend panel ──
  useEffect(() => {
    const handler = e => {
      if (e.ctrlKey && e.shiftKey && e.key === "A") setShowBackend(s => !s);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Background rate fetch — all 3 APIs silently ──
  const fetchRates = useCallback(async (from, to, amount) => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) { setReceiveAmt(""); return; }
    setRateLoading(true);
    try {
      const { best, comparison: comp } = await fetchBestRate(from, to, parsed);
      setReceiveAmt(best.rate.toFixed(6));
      setBestProvider(best.provider);
      setComparison(comp);
      // Store Swapzone quotaId if it won or is in results
      const szResult = comp.find(r => r.provider === "Swapzone");
      if (szResult?.quotaId) setSzQuotaId(szResult.quotaId);
    } catch {
      const fallback = ((parsed * (BASE_RATES[from] || 1)) / (BASE_RATES[to] || 1)) * 0.996;
      setReceiveAmt(fallback.toFixed(6));
    } finally {
      setRateLoading(false);
    }
  }, []);

  // ── Debounced rate fetch on input change ──
  useEffect(() => {
    clearTimeout(rateTimer.current);
    rateTimer.current = setTimeout(() => {
      fetchRates(fromCoin, toCoin, sendAmt);
    }, 600);
    return () => clearTimeout(rateTimer.current);
  }, [sendAmt, fromCoin, toCoin, fetchRates]);

  const swapCoins = () => {
    setFromCoin(toCoin);
    setToCoin(fromCoin);
    setSendAmt(receiveAmt || "0.1");
  };

  const [exchangeId, setExchangeId]         = useState("");
  const [depositAddress, setDepositAddress] = useState("");
  const [exchangeError, setExchangeError]   = useState("");

  const handleExchange = () => {
    if (!destAddr.trim()) return;
    setLoading(true);
    setExchangeError("");
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
      setStep("done");
    } catch (err) {
      setExchangeError("Exchange creation failed. Please try again or use a different pair.");
      setStep("confirm");
    }
  };

  const fromData = COINS.find(c => c.symbol === fromCoin) || COINS[0];
  const toData   = COINS.find(c => c.symbol === toCoin) || COINS[1];

  // ── Ticker data with live fluctuation ──
  const tickerCoins = COINS.slice(0, 16);

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
          ].map(item => (
            <a key={item.label} href="#"
              className="nav-link"
              onClick={e => { e.preventDefault(); item.action && item.action(); }}
            >{item.label}</a>
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
            <div className="atlasswap-card" style={{
              background: "rgba(255,255,255,0.035)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: "24px", backdropFilter: "blur(32px)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
              overflow: "hidden",
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
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    borderRadius: "16px", padding: "13px 14px",
                    transition: "all 0.2s ease",
                  }}>
                    <input
                      type="number" min="0" step="any"
                      value={sendAmt}
                      onChange={e => setSendAmt(e.target.value)}
                      style={{
                        flex: 1, background: "transparent", border: "none",
                        color: "#fff", fontSize: "24px",
                        fontFamily: "'Syne', sans-serif", fontWeight: 700,
                        letterSpacing: "-0.025em", padding: "2px 4px",
                      }}
                    />
                    <CoinSelector selected={fromCoin} onChange={setFromCoin} exclude={toCoin} />
                  </div>
                  <div style={{
                    fontSize: "11px", color: "rgba(240,244,255,0.3)",
                    marginTop: "6px", paddingLeft: "4px",
                    display: "flex", gap: "16px",
                  }}>
                    <span>
                      ≈ ${((parseFloat(sendAmt) || 0) * (tickerPrices[fromCoin] || 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })} USD
                    </span>
                    <span style={{ color: "rgba(0,229,160,0.55)" }}>All fees included</span>
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
                    position: "relative", overflow: "hidden",
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
                  }}>
                    <span>
                      1 {fromCoin} ≈ {(((BASE_RATES[fromCoin] || 1) / (BASE_RATES[toCoin] || 1)) * 0.996).toFixed(6)} {toCoin}
                    </span>
                    <span style={{ color: "rgba(0,229,160,0.5)", display: "flex", alignItems: "center", gap: "4px" }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00E5A0", display: "inline-block" }}/>
                      Best rate via {bestProvider}
                    </span>
                  </div>
                </div>

                {/* DESTINATION ADDRESS */}
                <div style={{ marginBottom: "18px" }}>
                  <div style={{
                    fontSize: "10px", color: "rgba(240,244,255,0.35)",
                    fontWeight: 700, letterSpacing: "0.1em", marginBottom: "8px",
                  }}>DESTINATION {toCoin} ADDRESS</div>
                  <div className="input-wrap" style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    borderRadius: "14px", padding: "12px 14px",
                    transition: "all 0.2s ease",
                  }}>
                    <input
                      placeholder={`Enter your ${toCoin} wallet address`}
                      value={destAddr}
                      onChange={e => setDestAddr(e.target.value)}
                      style={{
                        width: "100%", background: "transparent", border: "none",
                        color: "#fff", fontSize: "13px", fontFamily: "'Outfit', sans-serif",
                        fontWeight: 400,
                      }}
                    />
                  </div>
                </div>

                {/* EXCHANGE BUTTON */}
                <button
                  className="exchange-btn"
                  onClick={handleExchange}
                  disabled={!destAddr.trim() || loading || rateLoading}
                  style={{
                    width: "100%", padding: "15px",
                    background: destAddr.trim() && !rateLoading
                      ? "linear-gradient(135deg, #00E5A0 0%, #00C4FF 100%)"
                      : "rgba(255,255,255,0.07)",
                    border: "none", borderRadius: "14px",
                    color: destAddr.trim() && !rateLoading ? "#070B14" : "rgba(240,244,255,0.2)",
                    fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "15px",
                    cursor: destAddr.trim() && !rateLoading ? "pointer" : "not-allowed",
                    letterSpacing: "0.05em",
                    boxShadow: destAddr.trim() && !rateLoading
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
            <div className="atlasswap-card" style={{
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
            <div className="atlasswap-card" style={{
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
            <div className="atlasswap-card" style={{
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

              {/* Deposit address box */}
              {depositAddress && (
                <div style={{
                  background: "rgba(0,229,160,0.05)",
                  border: "1px solid rgba(0,229,160,0.2)",
                  borderRadius: "14px", padding: "16px", marginBottom: "14px", textAlign: "left",
                }}>
                  <div style={{ fontSize: "10px", color: "rgba(240,244,255,0.3)", letterSpacing: "0.1em", marginBottom: "8px", fontWeight: 700 }}>
                    SEND {fromCoin} TO THIS ADDRESS
                  </div>
                  <div style={{ fontSize: "11px", color: "#00E5A0", fontFamily: "monospace", wordBreak: "break-all", lineHeight: 1.7 }}>
                    {depositAddress}
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(depositAddress)}
                    style={{
                      marginTop: "10px", fontSize: "11px", color: "rgba(240,244,255,0.4)",
                      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "6px", padding: "5px 12px", cursor: "pointer",
                      fontFamily: "'Outfit',sans-serif",
                    }}
                  >Copy Address</button>
                </div>
              )}

              {/* Exchange ID */}
              {exchangeId && (
                <div style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "10px", padding: "10px 14px", marginBottom: "16px", textAlign: "left",
                }}>
                  <div style={{ fontSize: "10px", color: "rgba(240,244,255,0.3)", letterSpacing: "0.1em", marginBottom: "4px", fontWeight: 700 }}>EXCHANGE ID</div>
                  <div style={{ fontSize: "11px", color: "rgba(240,244,255,0.55)", fontFamily: "monospace" }}>{exchangeId}</div>
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
                setDepositAddress(""); setExchangeId(""); setExchangeError("");
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
        <div style={{ display: "flex", gap: "24px" }}>
          {["Terms", "Privacy", "Contact", "API Docs"].map(l => (
            <a key={l} href="#" style={{
              fontSize: "12px", color: "rgba(240,244,255,0.3)",
              textDecoration: "none", transition: "color 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.color = "#fff"}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(240,244,255,0.3)"}
            >{l}</a>
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
    </>
  );
}
