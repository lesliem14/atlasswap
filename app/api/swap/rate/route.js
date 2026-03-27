import { NextResponse } from "next/server";

const BASE_RATES = {
  BTC:87500, ETH:3350, USDT:1, BNB:590, SOL:178,
  USDC:1, XRP:0.61, DOGE:0.13, ADA:0.47, TRX:0.13,
  AVAX:37, TON:5.8, DOT:7.2, MATIC:0.58, LTC:92,
  BCH:480, ATOM:8.2, NEAR:4.5, FTM:0.85, ALGO:0.19,
  XLM:0.12, VET:0.038, HBAR:0.085, ICP:11, APT:8.9,
  SUI:1.4, SEI:0.42, STX:1.8, EGLD:28, FIL:5.2,
  UNI:9.5, LINK:15, AAVE:185, CRV:0.38, MKR:1800,
  SNX:2.1, COMP:52, LDO:1.8, CAKE:2.4, "1INCH":0.38,
  ARB:1.12, OP:1.85, IMX:1.6, STRK:0.42, MANTA:1.2,
  SHIB:0.000024, PEPE:0.0000085, FLOKI:0.000085, BONK:0.000025, WIF:2.8,
  XMR:165, ZEC:32, DASH:29, XVG:0.007,
  CRO:0.095, OKB:48, HT:2.8,
  OSMO:0.65, INJ:22, KAVA:0.62, JUNO:0.28, STARS:0.014,
  DAI:1, BUSD:1, TUSD:1,
  SAND:0.38, MANA:0.42, AXS:6.5, ENJ:0.18, GALA:0.023,
  FET:1.8, OCEAN:0.82, RNDR:6.2, WLD:2.1,
  GRT:0.19, LRC:0.22, CHZ:0.085, BAT:0.22, ZIL:0.012,
  IOTA:0.18, THETA:0.92, EOS:0.72, XTZ:0.82, XEM:0.028,
  WAVES:2.1, QTUM:2.8, KCS:11, ROSE:0.09, CFX:0.18,
  KSM:28, ZEN:10, DCR:18, RVN:0.018, SC:0.0045,
  DGB:0.0095,
};

// Support both server-only and legacy NEXT_PUBLIC env var names.
// Using these on the server does not expose them to the client bundle.
const CN_KEY =
  process.env.CHANGENOW_API_KEY ||
  process.env.NEXT_PUBLIC_CHANGENOW_API_KEY ||
  process.env.NEXT_PUBLIC_CHANGENOW_KEY ||
  process.env.NEXT_PUBLIC_CN_API_KEY ||
  process.env.NEXT_PUBLIC_CN_KEY ||
  "";
const SS_KEY =
  process.env.SIMPLESWAP_API_KEY ||
  process.env.NEXT_PUBLIC_SIMPLESWAP_API_KEY ||
  process.env.NEXT_PUBLIC_SIMPLESWAP_KEY ||
  process.env.NEXT_PUBLIC_SS_API_KEY ||
  process.env.NEXT_PUBLIC_SS_KEY ||
  "";
const SZ_KEY =
  process.env.SWAPZONE_API_KEY ||
  process.env.NEXT_PUBLIC_SWAPZONE_API_KEY ||
  process.env.NEXT_PUBLIC_SWAPZONE_KEY ||
  process.env.NEXT_PUBLIC_SZ_API_KEY ||
  process.env.NEXT_PUBLIC_SZ_KEY ||
  "";

const CN_V1 = "https://api.changenow.io/v1";
const CN_V2 = "https://api.changenow.io/v2";
const SS_BASE = "https://api.simpleswap.io/v3";
const SZ_BASE = "https://api.swapzone.io/v1";

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

const fallbackRate = (from, to, amount, discount) =>
  ((amount * (BASE_RATES[from] || 1)) / (BASE_RATES[to] || 1)) * discount;

async function fetchChangeNowRate(from, to, amount) {
  try {
    if (!CN_KEY) throw new Error("No CN key");
    const [rateRes, minRes] = await Promise.all([
      fetchWithTimeout(
        `${CN_V2}/exchange/estimated-amount?fromCurrency=${from.toLowerCase()}&toCurrency=${to.toLowerCase()}&fromAmount=${amount}&flow=standard&type=direct`,
        { headers: { "x-changenow-api-key": CN_KEY }, cache: "no-store" }
      ),
      fetchWithTimeout(
        `${CN_V1}/min-amount/${from.toLowerCase()}_${to.toLowerCase()}?api_key=${CN_KEY}`,
        { cache: "no-store" }
      ),
    ]);
    if (!rateRes.ok) throw new Error(`ChangeNOW ${rateRes.status}`);
    const data = await rateRes.json();
    const estimated = parseFloat(data?.toAmount || data?.estimatedAmount || 0);
    if (!estimated || Number.isNaN(estimated)) throw new Error("No CN amount");

    let minAmount = 0;
    if (minRes.ok) {
      const minData = await minRes.json();
      minAmount = parseFloat(minData?.minAmount || minData?.min_amount || 0);
    }

    return {
      provider: "ChangeNOW",
      rate: estimated,
      rawRate: estimated / amount,
      minAmount,
      available: true,
      simulated: false,
      diagnostics: { status: "ok", httpStatus: 200 },
    };
  } catch (err) {
    const m = String(err?.message || "");
    const statusMatch = m.match(/(\d{3})/);
    const httpStatus = statusMatch ? Number(statusMatch[1]) : 0;
    const rate = fallbackRate(from, to, amount, 0.996);
    return {
      provider: "ChangeNOW",
      rate,
      rawRate: rate / amount,
      available: true,
      simulated: true,
      diagnostics: {
        status: "fallback",
        httpStatus,
        reason: m || "unknown_error",
      },
    };
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
    return {
      provider: "SimpleSwap",
      rate: estimated,
      rawRate: estimated / amount,
      available: true,
      simulated: false,
      diagnostics: { status: "ok", httpStatus: 200 },
    };
  } catch (err) {
    const m = String(err?.message || "");
    const statusMatch = m.match(/(\d{3})/);
    const httpStatus = statusMatch ? Number(statusMatch[1]) : 0;
    const rate = fallbackRate(from, to, amount, 0.992);
    return {
      provider: "SimpleSwap",
      rate,
      rawRate: rate / amount,
      available: true,
      simulated: true,
      diagnostics: {
        status: "fallback",
        httpStatus,
        reason: m || "unknown_error",
      },
    };
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
      diagnostics: { status: "ok", httpStatus: 200 },
    };
  } catch (err) {
    const m = String(err?.message || "");
    const statusMatch = m.match(/(\d{3})/);
    const httpStatus = statusMatch ? Number(statusMatch[1]) : 0;
    const rate = fallbackRate(from, to, amount, 0.989);
    return {
      provider: "Swapzone",
      rate,
      rawRate: rate / amount,
      available: true,
      simulated: true,
      diagnostics: {
        status: "fallback",
        httpStatus,
        reason: m || "unknown_error",
      },
    };
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

    const cnResult = cn.status === "fulfilled" ? cn.value : null;
    const realMin = cnResult?.minAmount || 0;
    const minAmount = realMin > 0
      ? parseFloat((realMin * 1.1).toPrecision(4))
      : parseFloat((2 / (BASE_RATES[from] || 1)).toPrecision(4));

    const best = comparison[0] || {
      provider: "ChangeNOW",
      rate: fallbackRate(from, to, amount, 0.996),
      rawRate: fallbackRate(from, to, amount, 0.996) / amount,
      available: true,
      simulated: true,
    };

    const diagnostics = Object.fromEntries(
      comparison.map((q) => [q.provider, q.diagnostics || null])
    );
    return NextResponse.json({ ok: true, best, comparison, minAmount, diagnostics }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to fetch rates" }, { status: 500 });
  }
}
