import { NextResponse } from "next/server";

const CN_KEY = process.env.CHANGENOW_API_KEY || process.env.NEXT_PUBLIC_CHANGENOW_API_KEY || "";
const SS_KEY = process.env.SIMPLESWAP_API_KEY || process.env.NEXT_PUBLIC_SIMPLESWAP_API_KEY || "";
const SZ_KEY = process.env.SWAPZONE_API_KEY || process.env.NEXT_PUBLIC_SWAPZONE_API_KEY || "";

const CN_CREATE_BASE = "https://api.changenow.io/v1";
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

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function firstNonEmptyString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function normalizeCreateResult(provider, data) {
  const root = data?.data || data?.result || data || {};
  const exchangeId = firstNonEmptyString(
    root?.id,
    root?.exchangeId,
    root?.requestId,
    root?.orderId,
    root?.transactionId
  );

  if (provider === "ChangeNOW") {
    return {
      depositAddress: firstNonEmptyString(
        root?.payinAddress,
        root?.payinAddressWithTag,
        root?.payin?.address,
        root?.payin?.walletAddress,
        root?.depositAddress,
        root?.paymentAddress,
        root?.addressDeposit
      ),
      depositExtraId: firstNonEmptyString(
        root?.payinExtraId,
        root?.payin?.extraId,
        root?.payinMemo,
        root?.memo,
        root?.destinationTag,
        root?.tag
      ),
      exchangeId,
      provider,
    };
  }

  if (provider === "SimpleSwap") {
    return {
      depositAddress: firstNonEmptyString(
        root?.addressFrom,
        root?.depositAddress,
        root?.payinAddress
      ),
      depositExtraId: firstNonEmptyString(
        root?.extraIdFrom,
        root?.addressFromExtraId,
        root?.memo
      ),
      exchangeId,
      provider,
    };
  }

  return {
    depositAddress: firstNonEmptyString(
      root?.addressDeposit,
      root?.transaction?.addressDeposit,
      root?.depositAddress,
      root?.payinAddress
    ),
    depositExtraId: firstNonEmptyString(
      root?.extraIdDeposit,
      root?.transaction?.extraIdDeposit,
      root?.memo
    ),
    exchangeId,
    provider,
  };
}

function extractSwapzoneQuotaId(data) {
  const direct = firstNonEmptyString(
    data?.quotaId,
    data?.data?.quotaId,
    data?.result?.quotaId,
    data?.transaction?.quotaId
  );
  if (direct) return direct;
  if (Array.isArray(data)) {
    for (const item of data) {
      const q = firstNonEmptyString(item?.quotaId, item?.data?.quotaId, item?.result?.quotaId);
      if (q) return q;
    }
  }
  if (Array.isArray(data?.data)) {
    for (const item of data.data) {
      const q = firstNonEmptyString(item?.quotaId, item?.data?.quotaId, item?.result?.quotaId);
      if (q) return q;
    }
  }
  return "";
}

async function createWithProvider(provider, from, to, amount, destAddress, extraData = {}) {
  if (provider === "ChangeNOW") {
    if (!CN_KEY) throw new Error("ChangeNOW API key missing");
    const amountStr = String(amount);
    const lowerFrom = from.toLowerCase();
    const lowerTo = to.toLowerCase();
    const endpoints = [
      {
        url: `${CN_CREATE_BASE}/transactions/${CN_KEY}`,
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: {
          from: lowerFrom,
          to: lowerTo,
          amount: amountStr,
          address: destAddress,
        },
      },
      {
        url: `${CN_CREATE_BASE}/transactions/${CN_KEY}`,
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: {
          from: lowerFrom,
          to: lowerTo,
          amount,
          address: destAddress,
        },
      },
      {
        url: `${CN_CREATE_BASE}/transactions/${CN_KEY}`,
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: {
          fromCurrency: lowerFrom,
          toCurrency: lowerTo,
          fromAmount: amountStr,
          toAddress: destAddress,
          flow: "standard",
          type: "direct",
        },
      },
      {
        url: `${CN_CREATE_BASE}/transactions/${CN_KEY}/`,
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: {
          from: lowerFrom,
          to: lowerTo,
          amount: amountStr,
          address: destAddress,
        },
      },
      {
        url: "https://api.changenow.io/v2/exchange",
        headers: {
          "x-changenow-api-key": CN_KEY,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: {
          fromCurrency: lowerFrom,
          toCurrency: lowerTo,
          fromAmount: amountStr,
          toAddress: destAddress,
          flow: "standard",
          type: "direct",
        },
      },
    ];

    const errors = [];
    for (const attempt of endpoints) {
      const res = await fetchWithTimeout(attempt.url, {
        method: "POST",
        headers: attempt.headers,
        body: JSON.stringify(attempt.body),
      });
      const data = await parseJsonSafe(res);
      const normalized = normalizeCreateResult(provider, data);
      if (res.ok && normalized.depositAddress) return normalized;
      errors.push(`CN create ${res.status} at ${attempt.url}: ${JSON.stringify(data)}`);
    }
    throw new Error(errors.join(" | ") || "ChangeNOW create failed");
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
    const data = await parseJsonSafe(res);
    if (!res.ok) throw new Error(`SS create ${res.status}: ${JSON.stringify(data)}`);
    const normalized = normalizeCreateResult(provider, data);
    if (!normalized.depositAddress) throw new Error("SimpleSwap did not return a deposit address");
    return normalized;
  }

  if (provider === "Swapzone") {
    if (!SZ_KEY) throw new Error("Swapzone API key missing");
    const fetchSwapzoneQuotaId = async () => {
      const params = new URLSearchParams({
        from: from.toLowerCase(),
        to: to.toLowerCase(),
        amount: String(amount),
        rateType: "all",
        chooseRate: "best",
        noRefundAddress: "false",
        apikey: SZ_KEY,
      });
      const quotaRes = await fetchWithTimeout(`${SZ_BASE}/exchange/get-rate?${params.toString()}`, {
        headers: { "x-api-key": SZ_KEY },
      });
      const quotaData = await parseJsonSafe(quotaRes);
      const extractedQuotaId = extractSwapzoneQuotaId(quotaData);
      if (!quotaRes.ok || !extractedQuotaId) {
        throw new Error(`SZ quota fetch failed ${quotaRes.status}: ${JSON.stringify(quotaData)}`);
      }
      return extractedQuotaId;
    };

    const createWithQuota = async (quotaId) => {
      const body = {
        from: from.toLowerCase(),
        to: to.toLowerCase(),
        amountDeposit: amount,
        addressReceive: destAddress,
        apikey: SZ_KEY,
      };
      if (quotaId) body.quotaId = quotaId;
      return fetchWithTimeout(`${SZ_BASE}/exchange/create`, {
        method: "POST",
        headers: {
          "x-api-key": SZ_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    };

    let quotaId = firstNonEmptyString(extraData?.quotaId);
    if (!quotaId) quotaId = await fetchSwapzoneQuotaId();

    let res = await createWithQuota(quotaId);
    let data = await parseJsonSafe(res);
    const quotaErrorText = JSON.stringify(data).toLowerCase();
    const shouldRefreshQuota = !res.ok && (quotaErrorText.includes("quota") || quotaErrorText.includes("expired"));
    if (shouldRefreshQuota) {
      quotaId = await fetchSwapzoneQuotaId();
      res = await createWithQuota(quotaId);
      data = await parseJsonSafe(res);
    }

    if (!res.ok) throw new Error(`SZ create ${res.status}: ${JSON.stringify(data)}`);
    const normalized = normalizeCreateResult(provider, data);
    if (!normalized.depositAddress) throw new Error("Swapzone did not return a deposit address");
    return normalized;
  }

  throw new Error("Unknown provider");
}

async function createExchange(provider, from, to, amount, destAddress, extraData = {}) {
  const orderedProviders = [provider, ...PROVIDERS.filter((p) => p !== provider)];
  const failures = [];
  for (const currentProvider of orderedProviders) {
    try {
      return await createWithProvider(currentProvider, from, to, amount, destAddress, extraData);
    } catch (err) {
      failures.push({ provider: currentProvider, message: err?.message || "Unknown provider failure" });
    }
  }
  const requestedFailure = failures.find((f) => f.provider === provider);
  const fallbackFailures = failures.filter((f) => f.provider !== provider);
  const messageParts = [];
  if (requestedFailure) messageParts.push(`Requested provider ${provider} failed: ${requestedFailure.message}`);
  if (fallbackFailures.length > 0) {
    messageParts.push(`Fallback providers failed: ${fallbackFailures.map((f) => `${f.provider}: ${f.message}`).join(" | ")}`);
  }
  throw new Error(messageParts.join(" -- ") || "All providers failed");
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
