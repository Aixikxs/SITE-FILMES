const ORIGIN = "https://superflixapi.monster";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      const target = new URL(ORIGIN + url.pathname.slice(4));
      target.search = url.search;

      const upstream = await fetch(target.toString(), {
        method: request.method,
        headers: {
          Accept: request.headers.get("Accept") || "application/json"
        }
      });

      const headers = new Headers(upstream.headers);
      headers.set("Access-Control-Allow-Origin", "*");
      headers.set("Cache-Control", "no-store");

      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers
      });
    }

    return env.ASSETS.fetch(request);
  }
};
