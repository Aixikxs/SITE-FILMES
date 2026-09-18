const ORIGIN="https://superflixapi.monster";
const BROWSER_HEADERS={
  "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  "Accept-Language":"pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  "Referer":ORIGIN+"/",
  "Origin":ORIGIN
};
function meta(html,name){const re=new RegExp("<meta[^>]+(?:property|name)=['\"]"+name+"['\"][^>]+content=['\"]([^'\"]*)['\"]","i");const m=html.match(re);return m?m[1].replace(/&amp;/g,"&").replace(/&quot;/g,'"'):""}
function htmlMeta(html){return{title:meta(html,"og:title")||meta(html,"twitter:title"),poster:meta(html,"og:image")||meta(html,"twitter:image"),description:meta(html,"og:description")||meta(html,"description")}}
function typePath(type){return type==="filme"||type==="movie"?"movie":"tv"}
export default{async fetch(request,env){const url=new URL(request.url);
if(url.pathname==="/api/meta"){const type=(url.searchParams.get("type")||"filme").toLowerCase(),id=url.searchParams.get("id")||"";if(!id)return new Response("Missing id",{status:400});const tmdb="https://www.themoviedb.org/"+typePath(type)+"/"+encodeURIComponent(id)+"?language=pt-BR";try{const r=await fetch(tmdb,{headers:{"User-Agent":"Mozilla/5.0","Accept":"text/html"}});const h=await r.text();return Response.json(htmlMeta(h),{headers:{"Access-Control-Allow-Origin":"*","Cache-Control":"public, max-age=3600"}})}catch(e){return Response.json({},{status:502,headers:{"Access-Control-Allow-Origin":"*"}})}}
if(url.pathname.startsWith("/api/")){const target=new URL(ORIGIN+url.pathname.slice(4));target.search=url.search;const upstream=await fetch(target.toString(),{method:request.method,headers:{Accept:request.headers.get("Accept")||"application/json",...BROWSER_HEADERS}});const headers=new Headers(upstream.headers);headers.set("Access-Control-Allow-Origin","*");headers.set("Cache-Control","no-store");headers.delete("content-security-policy");headers.delete("x-frame-options");return new Response(upstream.body,{status:upstream.status,statusText:upstream.statusText,headers})}
return env.ASSETS.fetch(request)}};
