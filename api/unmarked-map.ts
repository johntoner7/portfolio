import type { VercelRequest, VercelResponse } from "@vercel/node";

const DEFAULT_MAP_URL = "https://unmarked-game.vercel.app/api/players/salah/map";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const upstream = await fetch(process.env.UNMARKED_MAP_URL ?? DEFAULT_MAP_URL, {
      headers: { Accept: "application/json" },
    });

    const body = await upstream.text();
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    res.setHeader("Content-Type", "application/json");
    return res.status(upstream.status).send(body);
  } catch {
    return res.status(502).json({ error: "Unmarked map unavailable" });
  }
}
