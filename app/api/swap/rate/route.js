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
    const [rateRes, minRes] = await Promise.all([
      fetch(
        `${CN_V2}/exchange/estimated-amount?fromCurrency=${from.toLowerCase()}&toCurrency=${to.toLowerCase()}&fromAmount=${amount}&flow=standard&type=direct`,
        { headers: { "x-changenow-api-key": CN_KEY }, signal: AbortSignal.timeout(8000) }
      ),
      fetch(
        `${CN_V1}/min-amount/${from.toLowerCase()}_${to.toLowerCase()}?api_key=${CN_KEY}`,
        { signal: AbortSignal.timeout(5000) }
      ),
    ]);

    if (!rateRes.ok) {
      const body = await rateRes.text();
      // ChangeNOW V2 sometimes rejects — try V1 fallback
      const v1Res = await fetch(
        `${CN_V1}/exchange-amount/${amount}/${from.toLowerCase()}_${to.toLowerCase()}?api_key=${CN_KEY}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!v1Res.ok) throw new Error(`CN HTTP ${rateRes.status}: ${body}`);
      const v1Data = await v1Res.json();
      const amountOut = parseFloat(v1Data?.estimatedAmount || 0);
      if (!amountOut) throw new Error("CN V1: no amount");
      return {
        provider: "ChangeNOW", fromToken: from, toToken: to,
        amountIn: amount, amountOut, rate: amountOut / amount,
        estimatedTime: "2–5 min", fees: 0.4, minAmount: 0,
        quotaId: "", simulated: false, error: null,
      };
    }

    const rateData = await rateRes.json();
    const amountOut = parseFloat(rateData?.toAmount || rateData?.estimatedAmount || 0);
    if (!amountOut || isNaN(amountOut)) throw new Error("CN: empty amount");

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

  const netFrom = SS_NETWORKS[from.toUpperCase()] || from.toLowerCase();
  const netTo   = SS_NETWORKS[to.toUpperCase()]   || to.toLowerCase();

  try {
    const res = await fetch(
      `${SS_V3}/estimates?tickerFrom=${from.toLowerCase()}&networkFrom=${netFrom}&tickerTo=${to.toLowerCase()}&networkTo=${netTo}&amount=${amount}&fixed=false`,
      {
        headers: { "x-api-key": SS_KEY, "Accept": "application/json" },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`SS HTTP ${res.status}: ${body}`);
    }

    const data = await res.json();
    // V3 may return: { result: { amountTo } } or { result: "0.123" }
    const amountOut = parseFloat(
      data?.result?.amountTo ?? data?.result ?? data?.amountTo ?? 0
    );
    if (!amountOut || isNaN(amountOut)) throw new Error("SS: empty amount");

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
async function rateSwapzone(from, to, amount) {
  if (!SZ_KEY) return { provider: "Swapzone", error: "No API key configured", simulated: true };

  try {
    const res = await fetch(
      `${SZ_V1}/exchange/get-rate?from=${from.toLowerCase()}&to=${to.toLowerCase()}&amount=${amount}&rateType=all&chooseRate=best&noRefundAddress=false&apikey=${SZ_KEY}`,
      {
        headers: { "x-api-key": SZ_KEY },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`SZ HTTP ${res.status}: ${body}`);
    }

    const data = await res.json();
    const amountOut = parseFloat(data?.amountTo ?? 0);
    if (!amountOut || isNaN(amountOut)) throw new Error("SZ: empty amount");

    return {
      provider: "Swapzone", fromToken: from, toToken: to,
      amountIn: amount, amountOut, rate: amountOut / amount,
      estimatedTime: "5–30 min", fees: 0.4, minAmount: 0,
      quotaId: data?.quotaId || "", simulated: false, error: null,
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

    return Response.json({
      quotes:     allQuotes,
      best:       best || null,
      minAmount,
      timestamp:  Date.now(),
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
