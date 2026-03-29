// Proxies ChangeNOW active currencies for network-aware asset picker.
// Cached briefly to reduce load on ChangeNOW.

export const runtime = "nodejs";

const CN_V1 = "https://api.changenow.io/v1/currencies";

let memoryCache = { data: null, expiresAt: 0 };
const TTL_MS = 60 * 60 * 1000; // 1 hour

export async function GET() {
  try {
    const now = Date.now();
    if (memoryCache.data && now < memoryCache.expiresAt) {
      return Response.json(memoryCache.data, {
        headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
      });
    }

    const res = await fetch(`${CN_V1}?active=true`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      const text = await res.text();
      return Response.json(
        { ok: false, error: `ChangeNOW ${res.status}`, detail: text.slice(0, 200) },
        { status: 502 }
      );
    }

    const raw = await res.json();
    const currencies = Array.isArray(raw)
      ? raw.map((c) => ({
          ticker: String(c.ticker || "").toLowerCase(),
          name: c.name || c.ticker,
          image: c.image || "",
          featured: !!c.featured,
          isStable: !!c.isStable,
        }))
      : [];

    const payload = { ok: true, currencies, count: currencies.length, fetchedAt: now };
    memoryCache = { data: payload, expiresAt: now + TTL_MS };

    return Response.json(payload, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (err) {
    console.error("[/api/swap/currencies]", err);
    return Response.json({ ok: false, error: err.message || "Currencies fetch failed" }, { status: 500 });
  }
}
