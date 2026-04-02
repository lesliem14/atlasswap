// Server-side exchange creation proxy.

export const runtime = "nodejs";

const CN_KEY = process.env.CHANGENOW_API_KEY  || process.env.NEXT_PUBLIC_CHANGENOW_API_KEY  || "";
const EXOLIX_KEY = process.env.EXOLIX_API_KEY || process.env.NEXT_PUBLIC_EXOLIX_API_KEY || "";
const SZ_KEY = process.env.SWAPZONE_API_KEY   || process.env.NEXT_PUBLIC_SWAPZONE_API_KEY   || "";

const CN_V1 = "https://api.changenow.io/v1";
const EXOLIX_V2 = "https://exolix.com/api/v2";
const SZ_V1 = "https://api.swapzone.io/v1";

const EXOLIX_NETWORKS = {
  BTC: "BTC", ETH: "ETH", USDT: "ETH", BNB: "BSC", SOL: "SOL", USDC: "ETH",
  XRP: "XRP", DOGE: "DOGE", ADA: "ADA", TRX: "TRX", AVAX: "AVAXC", TON: "TON",
  DOT: "DOT", MATIC: "MATIC", LTC: "LTC", BCH: "BCH", ATOM: "ATOM", NEAR: "NEAR",
  XLM: "XLM", ALGO: "ALGO", XMR: "XMR", ZEC: "ZEC", DASH: "DASH", XTZ: "XTZ",
  DAI: "ETH", BUSD: "BSC", TUSD: "ETH", SHIB: "ETH", PEPE: "ETH",
};

function exolixNetworkFor(symbol) {
  return EXOLIX_NETWORKS[String(symbol || "").toUpperCase()] || String(symbol || "").toUpperCase();
}

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

async function createExolix(from, to, amount, address) {
  if (!EXOLIX_KEY) throw new Error("Exolix API key not configured");

  const res = await fetch(`${EXOLIX_V2}/transactions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: EXOLIX_KEY,
    },
    body: JSON.stringify({
      coinFrom: String(from || "").toUpperCase(),
      networkFrom: exolixNetworkFor(from),
      coinTo: String(to || "").toUpperCase(),
      networkTo: exolixNetworkFor(to),
      amount: Number(amount),
      withdrawalAddress: address.trim(),
      rateType: "float",
    }),
    signal: AbortSignal.timeout(15000),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`EXOLIX ${res.status}: ${JSON.stringify(data)}`);

  const depositAddress = data?.depositAddress || "";
  const exchangeId = data?.id || "";
  const payinExtraId = data?.depositExtraId || "";

  if (!depositAddress) throw new Error(`Exolix returned no deposit address. Full response: ${JSON.stringify(data)}`);
  return { depositAddress, exchangeId, payinExtraId, provider: "Exolix" };
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
    const { provider, from, to, amount, address, destAddress, quotaId } = await request.json();
    const destination = address || destAddress;

    if (!provider || !from || !to || !amount || !destination) {
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
      ...["ChangeNOW", "Exolix", "Swapzone"].filter(p => p !== provider),
    ];

    let lastError = null;
    for (const p of order) {
      try {
        let result;
        if (p === "ChangeNOW") result = await createChangeNow(from, to, parsed, destination);
        if (p === "Exolix") result = await createExolix(from, to, parsed, destination);
        if (p === "Swapzone") result = await createSwapzone(from, to, parsed, destination, quotaId);
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
