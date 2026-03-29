/**
 * ChangeNOW uses composite tickers (e.g. usdcarb, usdttrc20, ethbase).
 * SimpleSwap expects { ticker, network } — these helpers bridge the two.
 */

/** Suffix after stablecoin / eth prefix → SimpleSwap network id */
const SUFFIX_TO_SS = {
  "": "eth",
  erc20: "eth",
  trc20: "trx",
  bsc: "bsc",
  sol: "sol",
  matic: "matic",
  arc20: "cchain",
  arb: "arbitrum",
  op: "optimism",
  base: "base",
  ton: "ton",
  celo: "celo",
  apt: "apt",
  algo: "algo",
  sui: "sui",
  zksync: "zksync",
  strk: "starknet",
  lna: "linea",
  mon: "eth",
  assethub: "eth",
  wsol: "sol",
};

const STABLE_PREFIXES = ["usdt", "usdc", "dai", "busd", "tusd"];

/** Top-level coins: ticker → SimpleSwap network */
const SIMPLE_TICKER_NET = {
  btc: "btc",
  ltc: "ltc",
  bch: "bch",
  doge: "doge",
  xrp: "xrp",
  ada: "ada",
  trx: "trx",
  sol: "sol",
  xlm: "xlm",
  xmr: "xmr",
  zec: "zec",
  dash: "dash",
  ton: "ton",
  atom: "atom",
  near: "near",
  dot: "dot",
  matic: "matic",
  avax: "cchain",
  ftm: "ftm",
  algo: "algo",
  sui: "sui",
  apt: "apt",
  sei: "sei",
  bnb: "bsc",
  eth: "eth",
};

/**
 * @param {string} ticker ChangeNOW currency ticker (lowercase)
 * @returns {{ ticker: string, network: string }}
 */
export function parseCnTickerForSimpleSwap(ticker) {
  const t = String(ticker || "").toLowerCase().trim();
  if (!t) return { ticker: "btc", network: "btc" };

  for (const pre of STABLE_PREFIXES) {
    if (t === pre) {
      const def = pre === "usdt" || pre === "usdc" ? "eth" : "eth";
      return { ticker: pre, network: def };
    }
    if (t.startsWith(pre) && t.length > pre.length) {
      const suf = t.slice(pre.length);
      const net = SUFFIX_TO_SS[suf] ?? "eth";
      return { ticker: pre, network: net };
    }
  }

  if (t === "eth") return { ticker: "eth", network: "eth" };
  if (t.startsWith("eth") && t.length > 3) {
    const suf = t.slice(3);
    const map = {
      arb: "arbitrum",
      op: "optimism",
      base: "base",
      bsc: "bsc",
      matic: "matic",
      strk: "starknet",
      zksync: "zksync",
      lna: "linea",
    };
    const net = map[suf] ?? SUFFIX_TO_SS[suf] ?? "eth";
    return { ticker: "eth", network: net };
  }

  if (SIMPLE_TICKER_NET[t] !== undefined) {
    return { ticker: t, network: SIMPLE_TICKER_NET[t] };
  }

  return { ticker: t, network: "eth" };
}

/**
 * Which address validator group to use in the UI (must match ADDRESS_VALIDATORS keys).
 * @param {string} ticker ChangeNOW ticker (e.g. usdcarb, usdcsol, eth)
 * @returns {string}
 */
export function getAddressValidatorKeyForTicker(ticker) {
  const t = String(ticker || "").toLowerCase();
  if (t === "btc" || t.startsWith("btc")) return "BTC";
  if (t.includes("trc20") || t === "trx") return "TRX";
  if (t.includes("wsol") || t.endsWith("sol") || t === "sol") return "SOL";
  if (t === "xrp" || t.includes("xrp")) return "XRP";
  if ((t === "ada" || t.includes("ada")) && !t.startsWith("usdc")) return "ADA";
  if (t.includes("ton") && !t.startsWith("eth") && !t.includes("usdt")) return "TON";
  if (t === "near" || t.includes("near")) return "NEAR";
  if (t === "dot" || (t.includes("dot") && t.length < 8)) return "DOT";
  if (t === "atom" || t.startsWith("cosmos")) return "ATOM";
  return "ETH";
}
