import { parseCnTickerForSimpleSwap } from "../../../lib/cnTickerMap.js";

// ═══════════════════════════════════════════════════════════════
// FILE: atlasswap/app/api/swap/rate/route.js
//
// PURPOSE: Server-side rate aggregation proxy.
//   - Browser calls POST /api/swap/rate (your own server)
//   - Your server calls ChangeNOW, SimpleSwap, Swapzone
//   - API keys NEVER reach the browser
//   - Solves: SimpleSwap 401, ChangeNOW 400, CORS errors
//
// SECURITY:
//   - Keys stored as plain env vars (no NEXT_PUBLIC_ prefix)
//   - Keys only accessible server-side
//   - Request validated before forwarding
//
// VERCEL ENV VARS NEEDED (no NEXT_PUBLIC_ prefix):
//   CHANGENOW_API_KEY
//   SIMPLESWAP_API_KEY
//   SWAPZONE_API_KEY
// ═══════════════════════════════════════════════════════════════

export const runtime = "nodejs"; // nodejs for full fetch support + better error logs

// ── Keys — server-side only, never sent to browser ────────────
// Supports both old NEXT_PUBLIC_ names and new server-only names
// so you don't need to add new Vercel vars if old ones exist.
const CN_KEY = process.env.CHANGENOW_API_KEY  || process.env.NEXT_PUBLIC_CHANGENOW_API_KEY  || "";
const SS_KEY = process.env.SIMPLESWAP_API_KEY || process.env.NEXT_PUBLIC_SIMPLESWAP_API_KEY || "";
const SZ_KEY = process.env.SWAPZONE_API_KEY   || process.env.NEXT_PUBLIC_SWAPZONE_API_KEY   || "";

// ── API base URLs ──────────────────────────────────────────────
const CN_V1 = "https://api.changenow.io/v1";
const CN_V2 = "https://api.changenow.io/v2";
const SS_V3 = "https://api.simpleswap.io/v3";
const SZ_V1 = "https://api.swapzone.io/v1";

// ── SimpleSwap V3 network mapping ─────────────────────────────
const SS_NETWORKS = {
  BTC:"btc",    ETH:"eth",      USDT:"eth",    BNB:"bsc",     SOL:"sol",
  USDC:"eth",   XRP:"xrp",      DOGE:"doge",   ADA:"ada",     TRX:"trx",
  AVAX:"avax",  TON:"ton",      DOT:"dot",     MATIC:"matic", LTC:"ltc",
  BCH:"bch",    ATOM:"atom",    NEAR:"near",   FTM:"ftm",     ALGO:"algo",
  XLM:"xlm",    VET:"vet",      HBAR:"hbar",   ICP:"icp",     APT:"apt",
  SUI:"sui",    SEI:"sei",      STX:"stx",     EGLD:"egld",   FIL:"fil",
  UNI:"eth",    LINK:"eth",     AAVE:"eth",    CRV:"eth",     MKR:"eth",
  SNX:"eth",    COMP:"eth",     LDO:"eth",     CAKE:"bsc",    "1INCH":"eth",
  ARB:"arbitrum",OP:"optimism", IMX:"imx",     STRK:"starknet",
  SHIB:"eth",   PEPE:"eth",     FLOKI:"eth",   BONK:"sol",    WIF:"sol",
  XMR:"xmr",    ZEC:"zec",      DASH:"dash",
  CRO:"cronos", OKB:"eth",      HT:"eth",
  OSMO:"osmo",  INJ:"inj",      KAVA:"kava",   JUNO:"juno",
  DAI:"eth",    BUSD:"bsc",     TUSD:"eth",
  SAND:"eth",   MANA:"eth",     AXS:"eth",     ENJ:"eth",     GALA:"eth",
  FET:"eth",    OCEAN:"eth",    RNDR:"eth",    WLD:"eth",
  GRT:"eth",    LRC:"eth",      CHZ:"eth",     BAT:"eth",
  ZIL:"zil",    THETA:"theta",  EOS:"eos",     XTZ:"xtz",     XEM:"nem",
  WAVES:"waves",QTUM:"qtum",    ROSE:"oasis",  CFX:"cfx",
  KSM:"ksm",    ZEN:"zen",      DCR:"dcr",     RVN:"rvn",     DGB:"dgb",
};

// Extra SimpleSwap network aliases (ticker → try these network ids in order)
const SS_NETWORK_ALIASES = {
  FTM: ["ftm", "fantom", "opera"],
  MATIC: ["matic", "polygon"],
  AVAX: ["avax", "cchain"],
};

// ChangeNOW network hints. For multi-chain tokens (USDT/USDC/etc),
// we try several common networks because provider-side defaults vary by pair.
const CN_NETWORKS = {
  BTC: ["btc"], ETH: ["eth", "arbitrum", "optimism", "base", "bsc", "matic"], BNB: ["bsc"], SOL: ["sol"], XRP: ["xrp"], TRX: ["trx"],
  MATIC: ["matic"], AVAX: ["avaxc", "avax"], LTC: ["ltc"], BCH: ["bch"], DOGE: ["doge"],
  ADA: ["ada"], XLM: ["xlm"], DOT: ["dot"], ATOM: ["atom"], NEAR: ["near"], TON: ["ton"],
  USDT: ["trx", "eth", "bsc", "sol", "matic", "arbitrum", "optimism", "base"],
  USDC: ["eth", "bsc", "sol", "matic", "avaxc", "arbitrum", "optimism", "base"],
  DAI: ["eth", "bsc", "matic"],
  BUSD: ["bsc", "eth"],
  TUSD: ["eth", "bsc"],
};

/** ChangeNOW tickers that already encode the network (usdcarb, ethbase, …) — no multi-network grid. */
function isCompositeCnTicker(t) {
  const x = String(t || "").toLowerCase();
  const standalone = new Set([
    "btc", "eth", "bnb", "sol", "xrp", "ada", "doge", "ltc", "bch", "avax", "matic", "trx", "atom", "near", "ftm", "dot", "ton",
    "usdt", "usdc", "dai", "busd", "tusd", "xlm", "etc", "arb", "op", "algo", "apt", "sui", "sei", "cro", "xmr", "zec", "dash",
  ]);
  if (standalone.has(x)) return false;
  if (x.length <= 4) return false;
  if (x.length > 6) return true;
  return /(arb|base|op|bsc|trc|erc|arc|apt|celo|zksync|strk|lna|mon|algo|sui|avax|nft|matic|sol|trx)/.test(x);
}

// ── Normalised quote shape returned to the browser ─────────────
// {
//   provider: string,
//   fromToken: string,
//   toToken: string,
//   amountIn: number,
//   amountOut: number,
//   rate: number,            — amountOut / amountIn
//   estimatedTime: string,
//   fees: number,            — % fee already included in rate
//   minAmount: number,       — minimum input for this pair
//   quotaId: string,         — Swapzone only
//   simulated: boolean,      — true = fell back to estimate
//   error: string | null,
// }

// ─────────────────────────────────────────────────────────────
// ChangeNOW — V2 rate + V1 minimum (parallel)
// ─────────────────────────────────────────────────────────────
async function rateChangeNow(from, to, amount) {
  if (!CN_KEY) return { provider: "ChangeNOW", error: "No API key configured", simulated: true };

  try {
    const fromLc = String(from || "").toLowerCase();
    const toLc = String(to || "").toLowerCase();
    const fromCoin = String(from || "").toUpperCase();
    const toCoin = String(to || "").toUpperCase();

    const fromNetworks = isCompositeCnTicker(fromLc)
      ? [undefined]
      : CN_NETWORKS[fromCoin] || [fromLc];
    const toNetworks = isCompositeCnTicker(toLc)
      ? [undefined]
      : CN_NETWORKS[toCoin] || [toLc];

    const networkPairs = [];
    toNetworks.forEach((tn) => networkPairs.push({ fromNetwork: undefined, toNetwork: tn }));
    fromNetworks.forEach((fn) => networkPairs.push({ fromNetwork: fn, toNetwork: undefined }));
    fromNetworks.forEach((fn) => {
      toNetworks.forEach((tn) => networkPairs.push({ fromNetwork: fn, toNetwork: tn }));
    });
    networkPairs.push({ fromNetwork: undefined, toNetwork: undefined });

    let amountOut = 0;
    let lastErr = "";

    const tryPair = async (pair) => {
      const qs = new URLSearchParams({
        fromCurrency: fromLc,
        toCurrency: toLc,
        fromAmount: String(amount),
        flow: "standard",
        type: "direct",
      });
      if (pair.fromNetwork) qs.set("fromNetwork", pair.fromNetwork);
      if (pair.toNetwork) qs.set("toNetwork", pair.toNetwork);

      const rateRes = await fetch(
        `${CN_V2}/exchange/estimated-amount?${qs.toString()}`,
        { headers: { "x-changenow-api-key": CN_KEY }, signal: AbortSignal.timeout(8000) }
      );
      if (!rateRes.ok) {
        const body = await rateRes.text().catch(() => "");
        lastErr = `CN HTTP ${rateRes.status}: ${body}`;
        return 0;
      }
      const rateData = await rateRes.json().catch(() => ({}));
      const parsedOut = parseFloat(rateData?.toAmount || rateData?.estimatedAmount || 0);
      if (parsedOut && !isNaN(parsedOut)) return parsedOut;
      lastErr = "CN: empty amount";
      return 0;
    };

    const BATCH = 8;
    for (let i = 0; i < networkPairs.length; i += BATCH) {
      const chunk = networkPairs.slice(i, i + BATCH);
      const outs = await Promise.all(chunk.map((pair) => tryPair(pair)));
      const localMax = Math.max(0, ...outs);
      if (localMax > amountOut) amountOut = localMax;
    }

    if (!amountOut || isNaN(amountOut)) {
      // Final fallback: V1 endpoint
      const v1Res = await fetch(
        `${CN_V1}/exchange-amount/${amount}/${from.toLowerCase()}_${to.toLowerCase()}?api_key=${CN_KEY}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!v1Res.ok) throw new Error(lastErr || `CN V1 HTTP ${v1Res.status}`);
      const v1Data = await v1Res.json().catch(() => ({}));
      amountOut = parseFloat(v1Data?.estimatedAmount || v1Data?.toAmount || 0);
      if (!amountOut || isNaN(amountOut)) throw new Error(lastErr || "CN V1: no amount");
    }

    const minRes = await fetch(
      `${CN_V1}/min-amount/${from.toLowerCase()}_${to.toLowerCase()}?api_key=${CN_KEY}`,
      { signal: AbortSignal.timeout(5000) }
    );

    let minAmount = 0;
    if (minRes.ok) {
      const minData = await minRes.json();
      minAmount = parseFloat(minData?.minAmount || minData?.min_amount || 0);
    }

    return {
      provider: "ChangeNOW", fromToken: from, toToken: to,
      amountIn: amount, amountOut, rate: amountOut / amount,
      estimatedTime: "2–5 min", fees: 0.4, minAmount,
      quotaId: "", simulated: false, error: null,
    };
  } catch (err) {
    console.error("[CN rate]", err.message);
    return {
      provider: "ChangeNOW", fromToken: from, toToken: to,
      amountIn: amount, amountOut: 0, rate: 0,
      estimatedTime: "2–5 min", fees: 0.4, minAmount: 0,
      quotaId: "", simulated: true, error: err.message,
    };
  }
}

// ─────────────────────────────────────────────────────────────
// SimpleSwap — V3 estimates
// ─────────────────────────────────────────────────────────────
async function rateSimpleSwap(from, to, amount) {
  if (!SS_KEY) return { provider: "SimpleSwap", error: "No API key configured", simulated: true };

  const fromLc = String(from || "").toLowerCase();
  const toLc = String(to || "").toLowerCase();
  const fromP = parseCnTickerForSimpleSwap(fromLc);
  const toP = parseCnTickerForSimpleSwap(toLc);
  const symFromU = fromP.ticker.toUpperCase();
  const symToU = toP.ticker.toUpperCase();

  const netFromDefault = fromP.network;
  const netToDefault = toP.network;

  try {
    const parseAmount = (data) => {
      const pick = (v) => {
        const n = parseFloat(v);
        return Number.isFinite(n) && n > 0 ? n : 0;
      };
      const candidates = [
        data?.result?.amountTo,
        data?.result?.expectedAmount,
        data?.result?.toAmount,
        typeof data?.result === "string" || typeof data?.result === "number" ? data.result : null,
        data?.data?.amountTo,
        data?.amountTo,
        data?.toAmount,
        data?.expectedAmount,
        data?.estimatedAmount,
      ];
      for (const c of candidates) {
        const n = pick(c);
        if (n) return n;
      }
      return 0;
    };

    const requestEstimate = async (networkFrom, networkTo, tickerFrom = fromP.ticker, tickerTo = toP.ticker) => {
      const qs = new URLSearchParams({
        tickerFrom: String(tickerFrom).toLowerCase(),
        networkFrom: networkFrom,
        tickerTo: String(tickerTo).toLowerCase(),
        networkTo: networkTo,
        amount: String(amount),
        fixed: "false",
      });

      const res = await fetch(`${SS_V3}/estimates?${qs.toString()}`, {
        headers: { "x-api-key": SS_KEY, "Accept": "application/json" },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return { ok: false, amount: 0, err: `SS HTTP ${res.status}: ${body.slice(0, 200)}` };
      }
      const data = await res.json().catch(() => ({}));
      const parsed = parseAmount(data);
      return { ok: true, amount: parsed, err: parsed ? "" : "SS: empty amount" };
    };

    const toNetworkCandidates = [
      netToDefault,
      ...(symToU === "USDT" ? ["eth", "trx", "bsc", "sol", "matic", "arbitrum", "optimism", "base"] : []),
      ...(symToU === "USDC" ? ["eth", "bsc", "sol", "matic", "cchain", "arbitrum", "optimism", "base"] : []),
      "eth", "bsc", "trx", "sol", "matic", "arbitrum", "optimism", "base",
    ].filter((v, i, arr) => v && arr.indexOf(v) === i);
    const fromAliases = SS_NETWORK_ALIASES[symFromU] || [];
    const fromNetworkCandidates = [
      netFromDefault,
      ...fromAliases,
      ...(symFromU === "USDT" ? ["eth", "trx", "bsc", "sol", "matic", "arbitrum", "optimism", "base"] : []),
      ...(symFromU === "USDC" ? ["eth", "bsc", "sol", "matic", "cchain", "arbitrum", "optimism", "base"] : []),
      netToDefault,
    ].filter((v, i, arr) => v && arr.indexOf(v) === i);

    const pairs = [];
    for (const networkFrom of fromNetworkCandidates.slice(0, 8)) {
      for (const networkTo of toNetworkCandidates.slice(0, 8)) {
        pairs.push({ networkFrom, networkTo });
      }
    }
    const cappedPairs = pairs.slice(0, 24);

    let amountOut = 0;
    let lastErr = "";
    const prim = await requestEstimate(fromP.network, toP.network);
    if (prim.ok && prim.amount && !isNaN(prim.amount) && prim.amount > amountOut) amountOut = prim.amount;
    lastErr = prim.err || lastErr;

    const batchSize = 12;
    for (let i = 0; i < cappedPairs.length; i += batchSize) {
      const batch = cappedPairs.slice(i, i + batchSize);
      const results = await Promise.all(batch.map((p) => requestEstimate(p.networkFrom, p.networkTo)));
      for (const out of results) {
        if (out.ok && out.amount && !isNaN(out.amount) && out.amount > amountOut) amountOut = out.amount;
        lastErr = out.err || lastErr || "SS: empty amount";
      }
    }

    if (!amountOut || isNaN(amountOut)) throw new Error(lastErr || "SS: empty amount");

    return {
      provider: "SimpleSwap", fromToken: from, toToken: to,
      amountIn: amount, amountOut, rate: amountOut / amount,
      estimatedTime: "5–20 min", fees: 0.4, minAmount: 0,
      quotaId: "", simulated: false, error: null,
    };
  } catch (err) {
    console.error("[SS rate]", err.message);
    return {
      provider: "SimpleSwap", fromToken: from, toToken: to,
      amountIn: amount, amountOut: 0, rate: 0,
      estimatedTime: "5–20 min", fees: 0.4, minAmount: 0,
      quotaId: "", simulated: true, error: err.message,
    };
  }
}

// ─────────────────────────────────────────────────────────────
// Swapzone — returns quotaId for create call
// ─────────────────────────────────────────────────────────────
function parseSwapzoneAmountTo(data) {
  const pick = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  const tryObj = (obj) => {
    if (!obj || typeof obj !== "object") return 0;
    const keys = [
      "amountTo", "amount_to", "amountReceive", "amountOut", "toAmount",
      "estimateAmountTo", "withdrawalAmount",
    ];
    for (const k of keys) {
      const n = pick(obj[k]);
      if (n) return n;
    }
    return 0;
  };
  let n = tryObj(data);
  if (n) return n;
  n = tryObj(data?.data);
  if (n) return n;
  n = tryObj(data?.data?.data);
  if (n) return n;
  n = tryObj(data?.transaction);
  if (n) return n;
  n = tryObj(data?.result);
  if (n) return n;
  n = tryObj(data?.rate);
  if (n) return n;
  if (Array.isArray(data?.offers) && data.offers[0]) {
    n = tryObj(data.offers[0]);
    if (n) return n;
  }
  return 0;
}

async function rateSwapzone(from, to, amount) {
  if (!SZ_KEY) return { provider: "Swapzone", error: "No API key configured", simulated: true };

  try {
    const base = `${SZ_V1}/exchange/get-rate`;
    const qs = new URLSearchParams({
      from: from.toLowerCase(),
      to: to.toLowerCase(),
      amount: String(amount),
      rateType: "all",
      chooseRate: "best",
      noRefundAddress: "false",
      apikey: SZ_KEY,
    });
    const qsAlt = new URLSearchParams({
      from: from.toLowerCase(),
      to: to.toLowerCase(),
      amountDeposit: String(amount),
      rateType: "all",
      chooseRate: "best",
      noRefundAddress: "false",
      apikey: SZ_KEY,
    });

    const fetchSz = async (url) =>
      fetch(url, {
        headers: { "x-api-key": SZ_KEY, Accept: "application/json" },
        signal: AbortSignal.timeout(12000),
      });

    let res = await fetchSz(`${base}?${qs.toString()}`);
    if (!res.ok) {
      res = await fetchSz(`${base}?${qsAlt.toString()}`);
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`SZ HTTP ${res.status}: ${body.slice(0, 200)}`);
    }

    let data = await res.json();
    let amountOut = parseSwapzoneAmountTo(data);
    if (!amountOut || isNaN(amountOut)) {
      const res2 = await fetchSz(`${base}?${qsAlt.toString()}`);
      if (res2.ok) {
        data = await res2.json();
        amountOut = parseSwapzoneAmountTo(data);
      }
    }
    if (!amountOut || isNaN(amountOut)) throw new Error("SZ: empty amount");

    const quotaId =
      data?.quotaId ??
      data?.data?.quotaId ??
      data?.transaction?.quotaId ??
      data?.data?.transaction?.quotaId ??
      "";

    return {
      provider: "Swapzone", fromToken: from, toToken: to,
      amountIn: amount, amountOut, rate: amountOut / amount,
      estimatedTime: "5–30 min", fees: 0.4, minAmount: 0,
      quotaId: quotaId || "",
      simulated: false,
      error: null,
    };
  } catch (err) {
    console.error("[SZ rate]", err.message);
    return {
      provider: "Swapzone", fromToken: from, toToken: to,
      amountIn: amount, amountOut: 0, rate: 0,
      estimatedTime: "5–30 min", fees: 0.4, minAmount: 0,
      quotaId: "", simulated: true, error: err.message,
    };
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/swap/rate
// Body: { from: "BTC", to: "ETH", amount: 0.1 }
// Returns: { quotes: [...], best: {...}, minAmount: number }
// ─────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const { from, to, amount } = await request.json();

    if (!from || !to || !amount || isNaN(parseFloat(amount))) {
      return Response.json({ error: "Missing required fields: from, to, amount" }, { status: 400 });
    }

    const parsed = parseFloat(amount);

    // All 3 providers in parallel — one failure never blocks the others
    const [cn, ss, sz] = await Promise.allSettled([
      rateChangeNow(from, to, parsed),
      rateSimpleSwap(from, to, parsed),
      rateSwapzone(from, to, parsed),
    ]);

    const allQuotes = [cn, ss, sz].map(r =>
      r.status === "fulfilled" ? r.value : { simulated: true, amountOut: 0, error: r.reason?.message }
    );

    // Live quotes sorted best-first
    const liveQuotes = allQuotes
      .filter(q => !q.simulated && q.amountOut > 0)
      .sort((a, b) => b.amountOut - a.amountOut);

    const best = liveQuotes[0] || allQuotes.find(q => q.amountOut > 0) || allQuotes[0];

    // Real minimum from ChangeNOW with 10% safety buffer
    const cnQ    = cn.status === "fulfilled" ? cn.value : null;
    const rawMin = cnQ?.minAmount || 0;
    const minAmount = rawMin > 0
      ? parseFloat((rawMin * 1.1).toPrecision(4))
      : 0;

    const comparison = allQuotes.map((q) => ({
      provider: q.provider,
      rate: q.amountOut,
      rawRate: q.rate,
      simulated: q.simulated,
      available: q.available !== false,
      quotaId: q.quotaId || "",
    }));

    return Response.json({
      ok: true,
      quotes: allQuotes,
      comparison,
      best: best || null,
      minAmount,
      selectionMode: "max_amount_out",
      timestamp: Date.now(),
    });

  } catch (err) {
    console.error("[/api/swap/rate]", err);
    return Response.json({ error: "Rate fetch failed", detail: err.message }, { status: 500 });
  }
}

// Health check
export async function GET() {
  return Response.json({
    status: "ok",
    providers: {
      ChangeNOW:  !!CN_KEY,
      SimpleSwap: !!SS_KEY,
      Swapzone:   !!SZ_KEY,
    },
    timestamp: Date.now(),
  });
}
