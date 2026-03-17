import { NextResponse } from "next/server";

const CN_KEY = process.env.CHANGENOW_API_KEY || process.env.NEXT_PUBLIC_CHANGENOW_API_KEY || "";
const SS_KEY = process.env.SIMPLESWAP_API_KEY || process.env.NEXT_PUBLIC_SIMPLESWAP_API_KEY || "";
const SZ_KEY = process.env.SWAPZONE_API_KEY || process.env.NEXT_PUBLIC_SWAPZONE_API_KEY || "";

const CN_BASE = "https://api.changenow.io/v2";
const SS_BASE = "https://api.simpleswap.io/v3";
const SZ_BASE = "https://api.swapzone.io/v1";
const PROVIDERS = ["ChangeNOW", "SimpleSwap", "Swapzone"];

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

async function createWithProvider(provider, from, to, amount, destAddress, extraData = {}) {
  if (provider === "ChangeNOW") {
    if (!CN_KEY) throw new Error("ChangeNOW API key missing");
    const res = await fetchWithTimeout(`${CN_BASE}/exchange`, {
      method: "POST",
      headers: {
        "x-changenow-api-key": CN_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fromCurrency: from.toLowerCase(),
        toCurrency: to.toLowerCase(),
        fromAmount: amount,
        toAddress: destAddress,
        flow: "standard",
        type: "direct",
      }),
    });
    if (!res.ok) throw new Error(`CN create ${res.status}`);
    const data = await res.json();
    return {
      depositAddress: data?.payinAddress || data?.payin?.address || "",
      exchangeId: data?.id || data?.requestId || "",
      provider,
    };
  }

  if (provider === "SimpleSwap") {
    if (!SS_KEY) throw new Error("SimpleSwap API key missing");
    const netFrom = SS_NETWORKS[from] || from.toLowerCase();
    const netTo = SS_NETWORKS[to] || to.toLowerCase();
    const res = await fetchWithTimeout(`${SS_BASE}/exchanges`, {
      method: "POST",
      headers: {
        "x-api-key": SS_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        tickerFrom: from.toLowerCase(),
        networkFrom: netFrom,
        tickerTo: to.toLowerCase(),
        networkTo: netTo,
        amount: String(amount),
        fixed: false,
        addressTo: destAddress,
      }),
    });
    if (!res.ok) throw new Error(`SS create ${res.status}`);
    const data = await res.json();
    return {
      depositAddress: data?.result?.addressFrom || data?.addressFrom || "",
      exchangeId: data?.result?.id || data?.id || "",
      provider,
    };
  }

  if (provider === "Swapzone") {
    if (!SZ_KEY) throw new Error("Swapzone API key missing");
    const res = await fetchWithTimeout(`${SZ_BASE}/exchange/create`, {
      method: "POST",
      headers: {
        "x-api-key": SZ_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: from.toLowerCase(),
        to: to.toLowerCase(),
        amountDeposit: amount,
        addressReceive: destAddress,
        quotaId: extraData?.quotaId || "",
        apikey: SZ_KEY,
      }),
    });
    if (!res.ok) throw new Error(`SZ create ${res.status}`);
    const data = await res.json();
    return {
      depositAddress: data?.addressDeposit || data?.transaction?.addressDeposit || "",
      exchangeId: data?.id || data?.transaction?.id || "",
      provider,
    };
  }

  throw new Error("Unknown provider");
}

async function createExchange(provider, from, to, amount, destAddress, extraData = {}) {
  const orderedProviders = [provider, ...PROVIDERS.filter((p) => p !== provider)];
  let lastError = null;
  for (const currentProvider of orderedProviders) {
    try {
      return await createWithProvider(currentProvider, from, to, amount, destAddress, extraData);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("All providers failed");
}

export async function POST(req) {
  try {
    const body = await req.json();
    const provider = String(body?.provider || "");
    const from = String(body?.from || "").toUpperCase();
    const to = String(body?.to || "").toUpperCase();
    const amount = Number(body?.amount);
    const destAddress = String(body?.destAddress || "").trim();
    const extraData = body?.extraData || {};

    if (!provider || !from || !to || !Number.isFinite(amount) || amount <= 0 || !destAddress) {
      return NextResponse.json({ ok: false, error: "Invalid create request payload" }, { status: 400 });
    }

    const result = await createExchange(provider, from, to, amount, destAddress, extraData);
    return NextResponse.json({ ok: true, result }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Exchange creation failed" },
      { status: 500 }
    );
  }
}
