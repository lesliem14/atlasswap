"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import ConnectWalletButton from "./ConnectWalletButton";

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
  { symbol: "MATIC", name: "Polygon",      color: "#8247E5", bg: "#0d0025", icon: "⬟" },
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
// API LAYER — ChangeNOW + SimpleSwap + Swapzone
// Rate comparison runs silently in background
// ═══════════════════════════════════════════════════════════════
const API_CONFIG = {
  changenow: {
    name: "ChangeNOW",
    baseUrl: "https://api.changenow.io/v1",
    apiKey: process.env.NEXT_PUBLIC_CHANGENOW_API_KEY || "YOUR_CHANGENOW_API_KEY",
  },
  simpleswap: {
    name: "SimpleSwap",
    baseUrl: "https://api.simpleswap.io",
    apiKey: process.env.NEXT_PUBLIC_SIMPLESWAP_API_KEY || "YOUR_SIMPLESWAP_API_KEY",
  },
  swapzone: {
    name: "Swapzone",
    baseUrl: "https://api.swapzone.io/v1",
    apiKey: process.env.NEXT_PUBLIC_SWAPZONE_API_KEY || "YOUR_SWAPZONE_API_KEY",
  },
};

// Fetch rate from ChangeNOW
async function fetchChangeNowRate(from, to, amount) {
  try {
    const url = `${API_CONFIG.changenow.baseUrl}/exchange-amount/${amount}/${from.toLowerCase()}_${to.toLowerCase()}?api_key=${API_CONFIG.changenow.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("ChangeNOW API error");
    const data = await res.json();
    return {
      provider: "ChangeNOW",
      rate: parseFloat(data.estimatedAmount),
      rawRate: parseFloat(data.estimatedAmount) / amount,
      available: true,
    };
  } catch {
    // Fallback to simulated rate during development
    const rate = ((amount * (BASE_RATES[from] || 1)) / (BASE_RATES[to] || 1)) * 0.996;
    return { provider: "ChangeNOW", rate, rawRate: rate / amount, available: true, simulated: true };
  }
}

// Fetch rate from SimpleSwap
async function fetchSimpleSwapRate(from, to, amount) {
  try {
    const url = `${API_CONFIG.simpleswap.baseUrl}/get_estimated?api_key=${API_CONFIG.simpleswap.apiKey}&currency_from=${from.toLowerCase()}&currency_to=${to.toLowerCase()}&amount=${amount}&fixed=false`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("SimpleSwap API error");
    const data = await res.json();
    return {
      provider: "SimpleSwap",
      rate: parseFloat(data),
      rawRate: parseFloat(data) / amount,
      available: true,
    };
  } catch {
    const rate = ((amount * (BASE_RATES[from] || 1)) / (BASE_RATES[to] || 1)) * 0.992;
    return { provider: "SimpleSwap", rate, rawRate: rate / amount, available: true, simulated: true };
  }
}

// Fetch rate from Swapzone
async function fetchSwapzoneRate(from, to, amount) {
  try {
    const url = `${API_CONFIG.swapzone.baseUrl}/exchange/get-rate?from=${from.toLowerCase()}&to=${to.toLowerCase()}&amount=${amount}&apikey=${API_CONFIG.swapzone.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Swapzone API error");
    const data = await res.json();
    const best = data.sort((a, b) => b.toAmount - a.toAmount)[0];
    return {
      provider: "Swapzone",
      rate: parseFloat(best?.toAmount || 0),
      rawRate: parseFloat(best?.toAmount || 0) / amount,
      available: true,
    };
  } catch {
    const rate = ((amount * (BASE_RATES[from] || 1)) / (BASE_RATES[to] || 1)) * 0.989;
    return { provider: "Swapzone", rate, rawRate: rate / amount, available: true, simulated: true };
  }
}

// Background aggregator — runs all 3 silently, returns best
async function fetchBestRate(from, to, amount) {
  const [cn, ss, sz] = await Promise.allSettled([
    fetchChangeNowRate(from, to, amount),
    fetchSimpleSwapRate(from, to, amount),
    fetchSwapzoneRate(from, to, amount),
  ]);

  const results = [cn, ss, sz]
    .filter(r => r.status === "fulfilled" && r.value.available)
    .map(r => r.value)
    .sort((a, b) => b.rate - a.rate);

  const best = results[0] || {
    provider: "ChangeNOW",
    rate: ((amount * (BASE_RATES[from] || 1)) / (BASE_RATES[to] || 1)) * 0.996,
    available: true,
  };

  // Full comparison stored for backend/admin view
  const comparison = results;

  return { best, comparison };
}

// ═══════════════════════════════════════════════════════════════
// COIN SELECTOR COMPONENT
// ═══════════════════════════════════════════════════════════════
function CoinSelector({ selected, onChange, exclude, openUpward = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  const buttonRef = useRef(null);
  const coin = COINS.find(c => c.symbol === selected) || COINS[0];

  const filtered = COINS.filter(c =>
    c.symbol !== exclude &&
    (c.symbol.toLowerCase().includes(query.toLowerCase()) ||
     c.name.toLowerCase().includes(query.toLowerCase()))
  );

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const dropdownStyle = open && buttonRef.current ? (() => {
    const rect = buttonRef.current.getBoundingClientRect();
    return {
      position: "fixed",
      left: rect.right - 260,
      width: 260,
      ...(openUpward
        ? { bottom: window.innerHeight - rect.top + 6 }
        : { top: rect.bottom + 6 }),
      background: "#0C1220",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "16px",
      boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
      zIndex: 9999,
      overflow: "hidden",
      animation: "dropIn 0.15s ease",
    };
  })() : null;

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button
        ref={buttonRef}
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: "8px",
          background: "rgba(255,255,255,0.06)",
          border: `1px solid ${open ? coin.color + "60" : "rgba(255,255,255,0.1)"}`,
          borderRadius: "12px", padding: "9px 13px", cursor: "pointer",
          color: "#fff", fontSize: "14px", fontFamily: "inherit", fontWeight: 700,
          transition: "all 0.2s", minWidth: "140px",
          boxShadow: open ? `0 0 16px ${coin.color}25` : "none",
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

      {open && dropdownStyle && typeof document !== "undefined" && createPortal(
        <div style={dropdownStyle}>
          <div style={{ padding: "10px 10px 6px" }}>
            <input
              autoFocus value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search…"
              style={{
                width: "100%", background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px",
                padding: "7px 11px", color: "#fff", fontSize: "12px",
                fontFamily: "inherit", outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ maxHeight: "280px", overflowY: "auto" }}>
            {filtered.map(c => (
              <button key={c.symbol}
                onClick={() => { onChange(c.symbol); setOpen(false); setQuery(""); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: "10px",
                  padding: "9px 14px",
                  background: selected === c.symbol ? "rgba(0,229,160,0.06)" : "transparent",
                  border: "none", cursor: "pointer", color: "#fff",
                  fontFamily: "inherit", fontSize: "13px", textAlign: "left",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                onMouseLeave={e => e.currentTarget.style.background = selected === c.symbol ? "rgba(0,229,160,0.06)" : "transparent"}
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
                  <span style={{ marginLeft: "auto", color: "#00E5A0", fontSize: "11px" }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </div>,
        document.body
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
  const [tickerPrices, setTickerPrices] = useState({...BASE_RATES});
  const rateTimer = useRef(null);

  // ── Keyboard shortcut: Ctrl+Shift+A opens backend panel ──
  useEffect(() => {
    const handler = e => {
      if (e.ctrlKey && e.shiftKey && e.key === "A") {
        setShowBackend(s => !s);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Simulated live ticker price fluctuation ──
  useEffect(() => {
    const interval = setInterval(() => {
      setTickerPrices(prev => {
        const updated = {...prev};
        Object.keys(updated).forEach(k => {
          const change = (Math.random() - 0.499) * 0.002;
          updated[k] = parseFloat((prev[k] * (1 + change)).toFixed(8));
        });
        return updated;
      });
    }, 3000);
    return () => clearInterval(interval);
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

  const handleExchange = () => {
    if (!destAddr.trim()) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); setStep("confirm"); }, 700);
  };

  const handleConfirm = () => {
    setStep("processing");
    setTimeout(() => setStep("done"), 3500);
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
            const base = BASE_RATES[c.symbol] || 1;
            const change = ((price - base) / base) * 100;
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
          {["Exchange", "Features", "API Partners", "About"].map(item => (
            <a key={item} href="#" className="nav-link">{item}</a>
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
          <ConnectWalletButton />
        </div>
      </nav>

      {/* ── Main content ── */}
      <div style={{
        position: "relative", zIndex: 10,
        maxWidth: "1320px", margin: "0 auto",
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
        <div style={{ width: "540px", minWidth: "380px", flexShrink: 0 }}>

          {/* ── FORM STEP ── */}
          {step === "form" && (
            <div className="atlasswap-card" style={{
              background: "rgba(255,255,255,0.035)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: "24px", backdropFilter: "blur(32px)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
              overflow: "visible",
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

              <div style={{ padding: "24px 28px 24px" }}>

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
                    <CoinSelector selected={toCoin} onChange={setToCoin} exclude={fromCoin} openUpward />
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
              }}>Processing Swap</div>
              <p style={{
                fontSize: "13px", color: "rgba(240,244,255,0.4)",
                lineHeight: 1.75, marginBottom: "24px",
              }}>
                Routing through <strong style={{ color: "#00E5A0" }}>{bestProvider}</strong>.<br/>
                Send <strong style={{ color: "#fff" }}>{sendAmt} {fromCoin}</strong> to the address below.
              </p>
              <div style={{
                background: "rgba(0,229,160,0.05)",
                border: "1px solid rgba(0,229,160,0.18)",
                borderRadius: "14px", padding: "16px",
                marginBottom: "20px",
              }}>
                <div style={{
                  fontSize: "10px", color: "rgba(240,244,255,0.3)",
                  letterSpacing: "0.1em", marginBottom: "8px", fontWeight: 700,
                }}>DEPOSIT ADDRESS</div>
                <div style={{
                  fontSize: "11px", color: "#00E5A0",
                  fontFamily: "monospace", wordBreak: "break-all", lineHeight: 1.6,
                }}>
                  bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
                </div>
              </div>
              <div style={{
                fontSize: "11px", color: "rgba(240,244,255,0.25)",
                letterSpacing: "0.04em",
                animation: "dotPulse 2s ease-in-out infinite",
              }}>
                Awaiting network confirmation…
              </div>
            </div>
          )}

          {/* ── DONE STEP ── */}
          {step === "done" && (
            <div className="atlasswap-card" style={{
              background: "rgba(255,255,255,0.035)",
              border: "1px solid rgba(0,229,160,0.15)",
              borderRadius: "24px", backdropFilter: "blur(32px)",
              padding: "48px 26px", textAlign: "center",
              boxShadow: "0 32px 80px rgba(0,229,160,0.08)",
            }}>
              <div style={{
                width: 72, height: 72, margin: "0 auto 24px",
                borderRadius: "50%",
                background: "rgba(0,229,160,0.1)",
                border: "2px solid rgba(0,229,160,0.35)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "30px", animation: "successPop 0.5s cubic-bezier(0.34,1.56,0.64,1)",
                boxShadow: "0 0 40px rgba(0,229,160,0.15)",
              }}>✓</div>
              <div style={{
                fontFamily: "'Syne', sans-serif", fontWeight: 800,
                fontSize: "22px", marginBottom: "10px",
                color: "#00E5A0", letterSpacing: "-0.02em",
              }}>Swap Complete!</div>
              <p style={{
                fontSize: "13px", color: "rgba(240,244,255,0.4)",
                lineHeight: 1.75, marginBottom: "28px",
              }}>
                Your {toCoin} has been sent to your wallet.<br/>
                Thank you for swapping with AtlasSwap.
              </p>
              <button onClick={() => { setStep("form"); setDestAddr(""); }} style={{
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
        maxWidth: "1320px", margin: "0 auto 64px",
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
        maxWidth: "1320px", margin: "0 auto",
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
    </>
  );
}
