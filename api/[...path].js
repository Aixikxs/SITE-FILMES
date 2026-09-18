const ORIGIN = "https://superflixapi.monster";

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
}

function typePath(type) {
  return type === "filme" || type === "movie" ? "movie" : "tv";
}

function meta(html, name) {
  const re = new RegExp("<meta[^>]+(?:property|name)=['\\\"]" + name + "['\\\"][^>]+content=['\\\"]([^'\\\"]*)['\\\"]", "i");
  const m = html.match(re);
  return m ? m[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"') : "";
}

function htmlMeta(html) {
  return {
    title: meta(html, "og:title") || meta(html, "twitter:title"),
    poster: meta(html, "og:image") || meta(html, "twitter:image"),
    description: meta(html, "og:description") || meta(html, "description")
  };
}

async function upstream(path, req) {
  const url = new URL(ORIGIN + path);
  const response = await fetch(url, {
    method: req.method === "HEAD" ? "HEAD" : "GET",
    headers: { Accept: "application/json,text/plain,*/*" },
    redirect: "follow"
  });
  return response;
}

export default async function handler(req, res) {
  cors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const parts = Array.isArray(req.query.path)
    ? req.query.path
    : req.query.path
      ? [req.query.path]
      : [];
  const route = "/" + parts.map(String).join("/");

  if (route === "/health") {
    const tests = [
      ["filme", "/lista?category=filme&type=tmdb&format=json"],
      ["serie", "/lista?category=serie&type=tmdb&format=json"],
      ["anime", "/lista?category=anime&type=tmdb&format=json"],
      ["dorama", "/lista?category=dorama&type=tmdb&format=json"],
      ["canais", "/lista?category=canais&format=json"]
    ];
    const result = {};
    for (const [name, path] of tests) {
      try {
        const r = await fetch(ORIGIN + path, {
          headers: { Accept: "application/json,text/plain,*/*" },
          redirect: "follow"
        });
        const body = await r.text();
        result[name] = {
          status: r.status,
          contentType: r.headers.get("content-type"),
          length: body.length,
          sample: body.slice(0, 300)
        };
      } catch (e) {
        result[name] = { error: String(e?.message || e) };
      }
    }
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ origin: ORIGIN, tests: result, time: new Date().toISOString() });
    return;
  }

  if (route === "/meta") {
    const type = String(req.query.type || "filme").toLowerCase();
    const id = String(req.query.id || "");
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }
    try {
      const tmdb = "https://www.themoviedb.org/" + typePath(type) + "/" + encodeURIComponent(id) + "?language=pt-BR";
      const r = await fetch(tmdb, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" },
        redirect: "follow"
      });
      const data = htmlMeta(await r.text());
      res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
      res.status(200).json(data);
    } catch {
      res.status(502).json({});
    }
    return;
  }

  if (!route.startsWith("/")) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  try {
    const r = await upstream(route + (req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""), req);
    const contentType = r.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", route === "/lista"
      ? "public, s-maxage=300, stale-while-revalidate=60"
      : "no-store");
    res.setHeader("X-SiteFlix-Upstream-Status", String(r.status));
    const body = Buffer.from(await r.arrayBuffer());
    res.status(r.status).send(body);
  } catch (e) {
    res.status(502).json({ error: "upstream_fetch_failed", message: String(e?.message || e) });
  }
}
