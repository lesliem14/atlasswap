import { NextResponse } from "next/server";

const BASE_RATES = {
  BTC: 87500, ETH: 3350, USDT: 1, BNB: 590, SOL: 178,
  USDC: 1, XRP: 0.61, DOGE: 0.13, ADA: 0.47, AVAX: 37,
  TRX: 0.13, LINK: 15, DOT: 7.2, MATIC: 0.58, LTC: 92,
  UNI: 9.5, ATOM: 8.2, XMR: 165, TON: 5.8, SHIB: 0.000024,
  ARB: 1.12, OP: 1.85, INJ: 22, SUI: 1.4, APT: 8.9,
};

const CN_KEY = process.env.CHANGENOW_API_KEY || process.env.NEXT_PUBLIC_CHANGENOW_API_KEY || "";
const SS_KEY = process.env.SIMPLESWAP_API_KEY || process.env.NEXT_PUBLIC_SIMPLESWAP_API_KEY || "";
const SZ_KEY = process.env.SWAPZONE_API_KEY || process.env.NEXT_PUBLIC_SWAPZONE_API_KEY || "";

const CN_BASE = "https://api.changenow.io/v2";
const SS_BASE = "https://api.simpleswap.io/v3";
const SZ_BASE = "https://api.swapzone.io/v1";

const SS_NETWORKS = {
  BTC: "btc", ETH: "eth", USDT: "eth", BNB: "bsc", SOL: "sol",
  USDC: "eth", XRP: "xrp", DOGE: "doge", ADA: "ada", AVAX: "avax",
  TRX: "trx", LINK: "eth", DOT: "dot", MATIC: "matic", LTC: "ltc",
  UNI: "eth", ATOM: "atom", XMR: "xmr", TON: "ton", SHIB: "eth",
  ARB: "arbitrum", OP: "optimism", INJ: "inj", SUI: "sui", APT: "apt",
};

async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

const fallbackRate = (from, to, amount, discount) =>
  ((amount * (BASE_RATES[from] || 1)) / (BASE_RATES[to] || 1)) * discount;

async function fetchChangeNowRate(from, to, amount) {
  try {
    if (!CN_KEY) throw new Error("No CN key");
    const url = `${CN_BASE}/exchange/estimated-amount?fromCurrency=${from.toLowerCase()}&toCurrency=${to.toLowerCase()}&fromAmount=${amount}&flow=standard&type=direct`;
    const res = await fetchWithTimeout(url, { headers: { "x-changenow-api-key": CN_KEY }, cache: "no-store" });
    if (!res.ok) throw new Error(`ChangeNOW ${res.status}`);
    const data = await res.json();
    const estimated = parseFloat(data?.toAmount || data?.estimatedAmount || 0);
    if (!estimated || Number.isNaN(estimated)) throw new Error("No CN amount");
    return { provider: "ChangeNOW", rate: estimated, rawRate: estimated / amount, available: true, simulated: false };
  } catch {
    const rate = fallbackRate(from, to, amount, 0.996);
    return { provider: "ChangeNOW", rate, rawRate: rate / amount, available: true, simulated: true };
  }
}

async function fetchSimpleSwapRate(from, to, amount) {
  try {
    if (!SS_KEY) throw new Error("No SS key");
    const netFrom = SS_NETWORKS[from] || from.toLowerCase();
    const netTo = SS_NETWORKS[to] || to.toLowerCase();
    const url = `${SS_BASE}/estimates?tickerFrom=${from.toLowerCase()}&networkFrom=${netFrom}&tickerTo=${to.toLowerCase()}&networkTo=${netTo}&amount=${amount}&fixed=false`;
    const res = await fetchWithTimeout(url, {
      headers: { "x-api-key": SS_KEY, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`SimpleSwap ${res.status}`);
    const data = await res.json();
    const estimated = parseFloat(data?.result?.amountTo ?? data?.result ?? 0);
    if (!estimated || Number.isNaN(estimated)) throw new Error("No SS amount");
    return { provider: "SimpleSwap", rate: estimated, rawRate: estimated / amount, available: true, simulated: false };
  } catch {
    const rate = fallbackRate(from, to, amount, 0.992);
    return { provider: "SimpleSwap", rate, rawRate: rate / amount, available: true, simulated: true };
  }
}

async function fetchSwapzoneRate(from, to, amount) {
  try {
    if (!SZ_KEY) throw new Error("No SZ key");
    const url = `${SZ_BASE}/exchange/get-rate?from=${from.toLowerCase()}&to=${to.toLowerCase()}&amount=${amount}&rateType=all&chooseRate=best&noRefundAddress=false&apikey=${SZ_KEY}`;
    const res = await fetchWithTimeout(url, { headers: { "x-api-key": SZ_KEY }, cache: "no-store" });
    if (!res.ok) throw new Error(`Swapzone ${res.status}`);
    const data = await res.json();
    const amountTo = parseFloat(data?.amountTo ?? 0);
    if (!amountTo || Number.isNaN(amountTo)) throw new Error("No SZ amount");
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
    const rate = fallbackRate(from, to, amount, 0.989);
    return { provider: "Swapzone", rate, rawRate: rate / amount, available: true, simulated: true };
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const from = String(body?.from || "").toUpperCase();
    const to = String(body?.to || "").toUpperCase();
    const amount = Number(body?.amount);

    if (!from || !to || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid rate request payload" }, { status: 400 });
    }

    const [cn, ss, sz] = await Promise.allSettled([
      fetchChangeNowRate(from, to, amount),
      fetchSimpleSwapRate(from, to, amount),
      fetchSwapzoneRate(from, to, amount),
    ]);

    const comparison = [cn, ss, sz]
      .filter((r) => r.status === "fulfilled" && r.value.available && r.value.rate > 0)
      .map((r) => r.value)
      .sort((a, b) => b.rate - a.rate);

    const liveOnly = comparison.filter((r) => !r.simulated);
    const best = liveOnly[0] || comparison[0] || {
      provider: "ChangeNOW",
      rate: fallbackRate(from, to, amount, 0.996),
      rawRate: fallbackRate(from, to, amount, 0.996) / amount,
      available: true,
      simulated: true,
    };

    return NextResponse.json({ ok: true, best, comparison }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to fetch rates" }, { status: 500 });
  }
}
