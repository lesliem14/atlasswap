import { NextResponse } from "next/server";

// Support both server-only and legacy NEXT_PUBLIC env var names.
// These keys are used only in API routes (server), not in client bundles.
const CN_KEY = process.env.CHANGENOW_API_KEY || process.env.NEXT_PUBLIC_CHANGENOW_API_KEY || "";
const SS_KEY = process.env.SIMPLESWAP_API_KEY || process.env.NEXT_PUBLIC_SIMPLESWAP_API_KEY || "";
const SZ_KEY = process.env.SWAPZONE_API_KEY || process.env.NEXT_PUBLIC_SWAPZONE_API_KEY || "";

const CN_V1 = "https://api.changenow.io/v1";
const SS_BASE = "https://api.simpleswap.io/v3";
const SZ_BASE = "https://api.swapzone.io/v1";
const PROVIDERS = ["ChangeNOW", "SimpleSwap", "Swapzone"];

async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

const SS_NETWORKS = {
  BTC:"btc", ETH:"eth", USDT:"eth", BNB:"bsc", SOL:"sol",
  USDC:"eth", XRP:"xrp", DOGE:"doge", ADA:"ada", TRX:"trx",
  AVAX:"avax", TON:"ton", DOT:"dot", MATIC:"matic", LTC:"ltc",
  BCH:"bch", ATOM:"atom", NEAR:"near", FTM:"ftm", ALGO:"algo",
  XLM:"xlm", VET:"vet", HBAR:"hbar", ICP:"icp", APT:"apt",
  SUI:"sui", SEI:"sei", STX:"stx", EGLD:"egld", FIL:"fil",
  UNI:"eth", LINK:"eth", AAVE:"eth", CRV:"eth", MKR:"eth",
  SNX:"eth", COMP:"eth", LDO:"eth", CAKE:"bsc", "1INCH":"eth",
  ARB:"arbitrum", OP:"optimism", IMX:"imx", STRK:"starknet", MANTA:"manta",
  SHIB:"eth", PEPE:"eth", FLOKI:"eth", BONK:"sol", WIF:"sol",
  XMR:"xmr", ZEC:"zec", DASH:"dash", XVG:"xvg",
  CRO:"cronos", OKB:"eth", HT:"eth",
  OSMO:"osmo", INJ:"inj", KAVA:"kava", JUNO:"juno", STARS:"stargaze",
  DAI:"eth", BUSD:"bsc", TUSD:"eth",
  SAND:"eth", MANA:"eth", AXS:"eth", ENJ:"eth", GALA:"eth",
  FET:"eth", OCEAN:"eth", RNDR:"eth", WLD:"eth",
  GRT:"eth", LRC:"eth", CHZ:"eth", BAT:"eth", ZIL:"zil",
  IOTA:"iota", THETA:"theta", EOS:"eos", XTZ:"xtz", XEM:"nem",
  WAVES:"waves", QTUM:"qtum", KCS:"kcs", ROSE:"oasis", CFX:"cfx",
  KSM:"ksm", ZEN:"zen", DCR:"dcr", RVN:"rvn", SC:"sc", DGB:"dgb",
};

async function createWithProvider(provider, from, to, amount, destAddress, extraData = {}) {
  if (provider === "ChangeNOW") {
    if (!CN_KEY) throw new Error("ChangeNOW API key missing");
    const res = await fetchWithTimeout(`${CN_V1}/transactions/${CN_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: from.toLowerCase(),
        to: to.toLowerCase(),
        amount: Number(amount),
        address: destAddress.trim(),
        flow: "standard",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      const errMsg = data?.message || JSON.stringify(data);
      const minMatch = errMsg.match(/minimal[:\s]+([0-9.]+)/i);
      const realMin = minMatch ? parseFloat(minMatch[1]) : null;
      throw new Error(`CN create ${res.status} | ${errMsg}${realMin ? ` | REAL_MIN:${realMin}` : ""}`);
    }
    return {
      depositAddress: data?.payinAddress || data?.payin?.address || "",
      exchangeId: data?.id || data?.requestId || "",
      payinExtraId: data?.payinExtraId || data?.payin?.extraId || "",
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
    const result = data?.result ?? data;
    return {
      depositAddress: result?.addressFrom || result?.payin_address || data?.addressFrom || "",
      exchangeId: result?.id || data?.id || "",
      payinExtraId: result?.extraIdFrom || result?.memo || "",
      provider,
    };
  }

  if (provider === "Swapzone") {
    if (!SZ_KEY) throw new Error("Swapzone API key missing");
    let quotaId = extraData?.quotaId || "";
    if (!quotaId) {
      const quoteRes = await fetchWithTimeout(
        `${SZ_BASE}/exchange/get-rate?from=${from.toLowerCase()}&to=${to.toLowerCase()}&amount=${amount}&rateType=all&chooseRate=best&noRefundAddress=false&apikey=${SZ_KEY}`,
        { headers: { "x-api-key": SZ_KEY } }
      );
      if (quoteRes.ok) {
        const quoteData = await quoteRes.json();
        quotaId = quoteData?.quotaId || "";
      }
    }
    if (!quotaId) throw new Error("Swapzone quote expired or unavailable. Please refresh rate and retry.");

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
        quotaId,
        apikey: SZ_KEY,
      }),
    });
    if (!res.ok) throw new Error(`SZ create ${res.status}`);
    const data = await res.json();
    const tx = data?.transaction ?? data;
    return {
      depositAddress: tx?.addressDeposit || data?.addressDeposit || tx?.deposit_address || "",
      exchangeId: tx?.id || data?.id || "",
      payinExtraId: tx?.extraIdDeposit || tx?.memo || "",
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
