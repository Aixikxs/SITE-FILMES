const API="https://superflixapi.monster";
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function api(path,html=false){
  const r=await fetch(API+path,{headers:{Accept:html?"text/html":"application/json"}});
  if(!r.ok)throw Error("API HTTP "+r.status);
  return html?r.text():r.json();
}

function normalize(x,type){
  if(typeof x==="string"||typeof x==="number")return{id:String(x),type,title:String(x),poster:""};
  return {
    id:String(x?.id??x?.tmdb_id??x?.imdb_id??x?.slug??""),
    type,
    title:x?.title??x?.name??x?.original_title??x?.original_name??x?.label??"",
    poster:x?.poster??x?.poster_path??x?.image??x?.image_url??x?.logo??"",
    year:x?.year??String(x?.release_date??x?.first_air_date??"").slice(0,4),
    href:x?.page_url??x?.url??x?.link??"",
    play:x?.play_url??x?.player_url??x?.embed_url??x?.stream_url??""
  };
}

function imageUrl(u){
  if(!u)return "";
  return u.startsWith("http")?u:u.startsWith("/")?API+u:u;
}

function makeCard(item){
  const n=normalize(item,item.type);
  const e=document.createElement("article");
  e.className="card";
  e.innerHTML=(imageUrl(n.poster)?'<img loading="lazy" src="'+esc(imageUrl(n.poster))+'" alt="">':'<div class="no-poster">🎬</div>')+
    '<div class="card-info"><strong>'+esc(n.title||("ID "+n.id))+'</strong><span>'+esc(n.year||n.id)+'</span></div>';
  e.onclick=()=>{
    const q=new URLSearchParams({id:n.id,type:n.type});
    if(n.play)q.set("src",n.play);
    location.href="player.html?"+q;
  };
  return e;
}

function parseHtmlCatalog(html,type){
  const doc=new DOMParser().parseFromString(html,"text/html");
  const out=[];
  const seen=new Set();
  const re=type==="filme"?/\/filme\/([^/?#]+)/: /\/serie\/([^/?#]+)/;
  doc.querySelectorAll("a[href]").forEach(a=>{
    const href=a.getAttribute("href")||"";
    const m=href.match(re);
    if(!m)return;
    const id=m[1];
    if(seen.has(id))return;
    const img=a.querySelector("img");
    const title=(img?.alt||a.textContent||"").replace(/\s+/g," ").trim();
    const src=img?.getAttribute("src")||img?.getAttribute("data-src")||"";
    const text=(a.textContent||"").replace(/\s+/g," ");
    const year=(text.match(/\b(19|20)\d{2}\b/)||[])[0]||"";
    seen.add(id);
    out.push({id,type,title:title||("ID "+id),poster:src,year,href:href.startsWith("http")?href:API+href});
  });
  return out;
}

async function getCatalog(category,type,limit=24){
  // The documented JSON catalog returns IDs. The HTML mode contains the
  // rendered title/poster metadata, so use it first and JSON as fallback.
  try{
    const html=await api("/lista?category="+encodeURIComponent(category)+"&format=html","html");
    const parsed=parseHtmlCatalog(html,type);
    if(parsed.length)return parsed.slice(0,limit);
  }catch(e){console.warn("HTML catalog failed",category,e)}
  const data=await api("/lista?category="+encodeURIComponent(category)+"&type=tmdb&format=json");
  const arr=Array.isArray(data)?data:(data?.items||data?.results||[]);
  return arr.slice(0,limit).map(x=>normalize(x,type));
}

async function renderSection(title,category,type,limit=18){
  const s=document.createElement("section");
  s.className="section";
  s.innerHTML='<div class="section-head"><h2>'+esc(title)+'</h2></div><div class="row"><span class="loading">Carregando...</span></div>';
  $("#content").append(s);
  try{
    const items=await getCatalog(category,type,limit);
    const row=s.querySelector(".row"); row.innerHTML="";
    if(!items.length){row.innerHTML='<span class="empty">Nenhum item retornado pela API.</span>';return}
    items.forEach(x=>row.appendChild(makeCard(x)));
  }catch(e){
    console.error(e);
    s.querySelector(".row").innerHTML='<span class="error">Não foi possível carregar esta seção.</span>';
  }
}

async function renderChannels(){
  const s=document.createElement("section");
  s.className="section";
  s.innerHTML='<div class="section-head"><h2>📡 Canais</h2></div><div class="grid"><span class="loading">Carregando...</span></div>';
  $("#content").append(s);
  try{
    const data=await api("/lista?category=canais&format=json");
    const arr=Array.isArray(data)?data:(data?.items||data?.results||[]);
    const grid=s.querySelector(".grid");grid.innerHTML="";
    arr.slice(0,60).forEach(raw=>{
      const n=normalize(raw,"canal");
      const e=makeCard({...raw,...n,type:"canal",title:n.title||raw?.channel_name||raw?.name||"Canal",poster:n.poster||raw?.logo});
      grid.appendChild(e);
    });
    if(!arr.length)grid.innerHTML='<span class="empty">Nenhum canal retornado.</span>';
  }catch(e){
    console.error(e);
    s.querySelector(".grid").innerHTML='<span class="error">Não foi possível carregar os canais.</span>';
  }
}

async function home(){
  $("#content").innerHTML="";
  await renderSection("🎬 Filmes","filme","filme",18);
  await renderSection("📺 Séries","serie","serie",18);
  await renderSection("✨ Animes","anime","anime",18);
  await renderSection("💫 Doramas","dorama","dorama",18);
  await renderChannels();
}

async function category(cat,type,title){
  $("#content").innerHTML="";
  await renderSection(title,cat,type,48);
}

async function search(q){
  $("#content").innerHTML='<section class="section"><div class="section-head"><h2>Busca</h2></div><div class="grid" id="results"><span class="loading">Pesquisando...</span></div></section>';
  try{
    const data=await api("/lista?category=pesquisa&q="+encodeURIComponent(q)+"&limit=48&format=json");
    const arr=Array.isArray(data)?data:(data?.items||data?.results||[]);
    const grid=$("#results");grid.innerHTML="";
    arr.forEach(raw=>{
      const t=String(raw?.type??raw?.media_type??"").toLowerCase();
      const type=t.includes("serie")||t==="tv"||t.includes("anime")||t.includes("dorama")?"serie":"filme";
      grid.appendChild(makeCard(normalize(raw,type)));
    });
    if(!arr.length)grid.innerHTML='<span class="empty">Nenhum resultado encontrado.</span>';
  }catch(e){
    console.error(e);
    $("#results").innerHTML='<span class="error">Erro na busca.</span>';
  }
}

function setup(){
  document.querySelectorAll("[data-category]").forEach(b=>b.onclick=()=>{
    const c=b.dataset.category;
    if(c==="home")home();
    else if(c==="filme")category("filme","filme","🎬 Filmes");
    else if(c==="serie")category("serie","serie","📺 Séries");
    else if(c==="anime")category("anime","anime","✨ Animes");
    else if(c==="dorama")category("dorama","dorama","💫 Doramas");
    else if(c==="canais"){ $("#content").innerHTML=""; renderChannels(); }
  });
  $("#search").onkeydown=e=>{if(e.key==="Enter"&&e.target.value.trim())search(e.target.value.trim())};
}
setup();home();