import { parseCnTickerForSimpleSwap } from "../../../lib/cnTickerMap.js";

// ═══════════════════════════════════════════════════════════════
// FILE: atlasswap/app/api/swap/create/route.js
//
// PURPOSE: Server-side exchange creation proxy.
//   - Browser POSTs to /api/swap/create (your own server)
//   - Your server creates the exchange with ChangeNOW/SS/SZ
//   - API keys NEVER reach the browser
//
// VERCEL ENV VARS NEEDED (no NEXT_PUBLIC_ prefix):
//   CHANGENOW_API_KEY
//   SIMPLESWAP_API_KEY
//   SWAPZONE_API_KEY
// ═══════════════════════════════════════════════════════════════

export const runtime = "nodejs";

const CN_KEY = process.env.CHANGENOW_API_KEY  || process.env.NEXT_PUBLIC_CHANGENOW_API_KEY  || "";
const SS_KEY = process.env.SIMPLESWAP_API_KEY || process.env.NEXT_PUBLIC_SIMPLESWAP_API_KEY || "";
const SZ_KEY = process.env.SWAPZONE_API_KEY   || process.env.NEXT_PUBLIC_SWAPZONE_API_KEY   || "";

const CN_V1 = "https://api.changenow.io/v1";
const SS_V3 = "https://api.simpleswap.io/v3";
const SZ_V1 = "https://api.swapzone.io/v1";

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
  ZIL:"zil",    THETA:"theta",  EOS:"eos",     XTZ:"xtz",
  WAVES:"waves",QTUM:"qtum",    ROSE:"oasis",  CFX:"cfx",
  KSM:"ksm",    ZEN:"zen",      DCR:"dcr",     RVN:"rvn",     DGB:"dgb",
};

// ─────────────────────────────────────────────────────────────
// ChangeNOW create — V1 partner endpoint (key in URL path)
// ─────────────────────────────────────────────────────────────
async function createChangeNow(from, to, amount, address) {
  if (!CN_KEY) throw new Error("ChangeNOW API key not configured");
  if (!address?.trim()) throw new Error("Destination address is required");

  const res = await fetch(`${CN_V1}/transactions/${CN_KEY}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      from:    from.toLowerCase(),
      to:      to.toLowerCase(),
      amount:  Number(amount),
      address: address.trim(),
      flow:    "standard",
    }),
    signal: AbortSignal.timeout(15000),
  });

  const data = await res.json();

  if (!res.ok) {
    // Extract real minimum from error message for friendly handling
    const msg      = data?.message || JSON.stringify(data);
    const minMatch = msg.match(/minimal[:\s]+([0-9.]+)/i);
    const realMin  = minMatch ? parseFloat(minMatch[1]) : null;
    throw new Error(`CN ${res.status} | ${msg}${realMin ? ` | REAL_MIN:${realMin}` : ""}`);
  }

  const depositAddress = data?.payinAddress || data?.payin?.address || "";
  const exchangeId     = data?.id           || data?.requestId      || "";
  const payinExtraId   = data?.payinExtraId || data?.payin?.extraId || "";

  if (!depositAddress) {
    throw new Error(`ChangeNOW returned no deposit address. Full response: ${JSON.stringify(data)}`);
  }

  return { depositAddress, exchangeId, payinExtraId, provider: "ChangeNOW" };
}

// ─────────────────────────────────────────────────────────────
// SimpleSwap create — V3
// ─────────────────────────────────────────────────────────────
async function createSimpleSwap(from, to, amount, address) {
  if (!SS_KEY) throw new Error("SimpleSwap API key not configured");

  const fp = parseCnTickerForSimpleSwap(String(from || "").toLowerCase());
  const tp = parseCnTickerForSimpleSwap(String(to || "").toLowerCase());

  const res = await fetch(`${SS_V3}/exchanges`, {
    method:  "POST",
    headers: {
      "x-api-key":    SS_KEY,
      "Content-Type": "application/json",
      "Accept":       "application/json",
    },
    body: JSON.stringify({
      tickerFrom:  fp.ticker.toLowerCase(),
      networkFrom: fp.network,
      tickerTo:    tp.ticker.toLowerCase(),
      networkTo:   tp.network,
      amount:      String(amount),
      fixed:       false,
      addressTo:   address.trim(),
    }),
    signal: AbortSignal.timeout(15000),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`SS ${res.status}: ${JSON.stringify(data)}`);

  const result       = data?.result ?? data;
  const depositAddress = result?.addressFrom || result?.payin_address || data?.addressFrom || "";
  const exchangeId     = result?.id          || data?.id              || "";
  const payinExtraId   = result?.extraIdFrom || result?.memo          || "";

  if (!depositAddress) {
    throw new Error(`SimpleSwap returned no deposit address. Full response: ${JSON.stringify(data)}`);
  }

  return { depositAddress, exchangeId, payinExtraId, provider: "SimpleSwap" };
}

// ─────────────────────────────────────────────────────────────
// Swapzone create — quotaId required from rate call
// ─────────────────────────────────────────────────────────────
async function createSwapzone(from, to, amount, address, quotaId) {
  if (!SZ_KEY) throw new Error("Swapzone API key not configured");

  const body = {
    from:           from.toLowerCase(),
    to:             to.toLowerCase(),
    amountDeposit:  Number(amount),
    addressReceive: address.trim(),
    apikey:         SZ_KEY,
  };
  if (quotaId) body.quotaId = quotaId;

  const res = await fetch(`${SZ_V1}/exchange/create`, {
    method:  "POST",
    headers: { "x-api-key": SZ_KEY, "Content-Type": "application/json" },
    body:    JSON.stringify(body),
    signal:  AbortSignal.timeout(15000),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`SZ ${res.status}: ${JSON.stringify(data)}`);

  const tx             = data?.transaction ?? data;
  const depositAddress = tx?.addressDeposit  || data?.addressDeposit  || tx?.deposit_address  || "";
  const exchangeId     = tx?.id              || data?.id              || "";
  const payinExtraId   = tx?.extraIdDeposit  || tx?.memo              || "";

  if (!depositAddress) {
    throw new Error(`Swapzone returned no deposit address. Full response: ${JSON.stringify(data)}`);
  }

  return { depositAddress, exchangeId, payinExtraId, provider: "Swapzone" };
}

// ─────────────────────────────────────────────────────────────
// POST /api/swap/create
// Body: { provider, from, to, amount, address, quotaId? }
// Returns: { depositAddress, exchangeId, payinExtraId, provider }
// Falls back through all providers if the primary fails
// ─────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const { provider, from, to, amount, address, quotaId } = await request.json();

    if (!provider || !from || !to || !amount || !address) {
      return Response.json(
        { error: "Missing required fields: provider, from, to, amount, address" },
        { status: 400 }
      );
    }

    const parsed = Number(amount);
    if (isNaN(parsed) || parsed <= 0) {
      return Response.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Try requested provider first, then fall back to others
    const order = [
      provider,
      ...["ChangeNOW", "SimpleSwap", "Swapzone"].filter(p => p !== provider),
    ];

    let lastError = null;
    for (const p of order) {
      try {
        let result;
        if (p === "ChangeNOW")  result = await createChangeNow(from, to, parsed, address);
        if (p === "SimpleSwap") result = await createSimpleSwap(from, to, parsed, address);
        if (p === "Swapzone")   result = await createSwapzone(from, to, parsed, address, quotaId);
        if (result) return Response.json(result);
      } catch (err) {
        console.error(`[create ${p}]`, err.message);
        lastError = err;
      }
    }

    // All providers failed
    return Response.json(
      { error: lastError?.message || "All providers failed" },
      { status: 502 }
    );

  } catch (err) {
    console.error("[/api/swap/create]", err);
    return Response.json({ error: "Create failed", detail: err.message }, { status: 500 });
  }
}
