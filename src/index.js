const ORIGIN = "https://superflixapi.monster";

function meta(html, name) {
  const re = new RegExp("<meta[^>]+(?:property|name)=['\"]" + name + "['\"][^>]+content=['\"]([^'\"]*)['\"]", "i");
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
function typePath(type) {
  return type === "filme" || type === "movie" ? "movie" : "tv";
}
function cors(headers) {
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Accept");
  return headers;
}
async function upstreamFetch(target, request, accept = "application/json,text/plain,*/*") {
  return fetch(target.toString(), {
    method: request.method === "HEAD" ? "HEAD" : "GET",
    headers: { Accept: accept },
    redirect: "follow"
  });
}
async function proxy(request, url) {
  const target = new URL(ORIGIN + url.pathname.slice(4));
  target.search = url.search;
  const isList = target.pathname === "/lista";
  try {
    const upstream = await upstreamFetch(target, request);
    const headers = cors(new Headers(upstream.headers));
    headers.delete("content-security-policy");
    headers.delete("x-frame-options");
    headers.set("Cache-Control", isList ? "public, max-age=60" : "no-store");
    headers.set("X-SiteFlix-Upstream-Status", String(upstream.status));
    headers.set("X-SiteFlix-Upstream-Type", headers.get("content-type") || "");
    return new Response(upstream.body, {status: upstream.status, statusText: upstream.statusText, headers});
  } catch (e) {
    return new Response(JSON.stringify({error:"upstream_fetch_failed",message:String(e?.message||e)}), {
      status:502, headers:cors(new Headers({"Content-Type":"application/json; charset=utf-8"}))
    });
  }
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null,{status:204,headers:cors(new Headers())});

    if (url.pathname === "/api/health") {
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
          const r = await fetch(ORIGIN + path, {headers:{Accept:"application/json,text/plain,*/*"},redirect:"follow"});
          const body = await r.text();
          result[name] = {status:r.status, contentType:r.headers.get("content-type"), length:body.length, sample:body.slice(0,300)};
        } catch(e) {
          result[name] = {error:String(e?.message||e)};
        }
      }
      return Response.json({origin:ORIGIN,tests:result,time:new Date().toISOString()}, {
        headers:cors(new Headers({"Cache-Control":"no-store"}))
      });
    }

    if (url.pathname === "/api/meta") {
      const type=(url.searchParams.get("type")||"filme").toLowerCase();
      const id=url.searchParams.get("id")||"";
      if(!id)return new Response("Missing id",{status:400});
      try {
        const tmdb="https://www.themoviedb.org/"+typePath(type)+"/"+encodeURIComponent(id)+"?language=pt-BR";
        const r=await fetch(tmdb,{headers:{"User-Agent":"Mozilla/5.0","Accept":"text/html"},redirect:"follow"});
        const h=await r.text();
        return Response.json(htmlMeta(h),{headers:cors(new Headers({"Cache-Control":"public, max-age=3600"}))});
      } catch {
        return Response.json({},{status:502,headers:cors(new Headers())});
      }
    }
    if(url.pathname.startsWith("/api/")) return proxy(request,url);
    const response = await env.ASSETS.fetch(request);\n    if (url.pathname === "/" || url.pathname === "/index.html" || url.pathname === "/app.js") {\n      const headers = new Headers(response.headers);\n      headers.set("Cache-Control", "no-store, no-cache, must-revalidate");\n      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });\n    }\n    return response;
  }
};