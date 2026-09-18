const API="/api";
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",""":"&quot;","'":"&#39;"}[c]));
const api=async(path,html=false)=>{
  const r=await fetch(API+path,{headers:{Accept:html?"text/html":"application/json"}});
  if(!r.ok)throw Error("API HTTP "+r.status);
  return html?r.text():r.json();
};

function imageUrl(u){
  if(!u)return "";
  if(u.startsWith("//"))return "https:"+u;
  return u;
}

function parseCatalogHtml(html,type){
  const doc=new DOMParser().parseFromString(html,"text/html");
  const out=[],seen=new Set();
  const pattern=type==="filme"?/\/filme\/([^/?#]+)/i:/\/serie\/([^/?#]+)/i;
  doc.querySelectorAll("a[href]").forEach(a=>{
    const href=a.getAttribute("href")||"";
    const m=href.match(pattern);
    if(!m)return;
    const id=m[1];
    if(seen.has(id))return;
    const img=a.querySelector("img");
    const title=(img?.getAttribute("alt")||a.textContent||"").replace(/\s+/g," ").trim();
    const poster=img?.getAttribute("src")||img?.getAttribute("data-src")||img?.getAttribute("data-lazy-src")||"";
    const text=(a.textContent||"").replace(/\s+/g," ");
    const year=(text.match(/\b(?:19|20)\d{2}\b/)||[])[0]||"";
    if(!title && !poster)return;
    seen.add(id);
    out.push({id,type,title:title||("ID "+id),poster,year});
  });
  return out;
}

async function getCatalog(type,limit=24){
  const page=type==="filme"?"filmes":type==="serie"?"series":type==="anime"?"animes":"doramas";
  const html=await api("/"+page+"?sort=date","html");
  const parsed=parseCatalogHtml(html,type);
  if(!parsed.length)throw Error("Catálogo vazio");
  return parsed.slice(0,limit);
}

function makeCard(n){
  const e=document.createElement("article");
  e.className="card";
  e.innerHTML=(imageUrl(n.poster)?'<img loading="lazy" src="'+esc(imageUrl(n.poster))+'" alt="'+esc(n.title)+'">':'<div class="no-poster">🎬</div>')+
    '<div class="card-info"><strong>'+esc(n.title)+'</strong><span>'+esc(n.year||"")+'</span></div>';
  e.onclick=()=>location.href="player.html?"+new URLSearchParams({id:n.id,type:n.type});
  return e;
}

async function renderSection(title,type,limit=18){
  const s=document.createElement("section");
  s.className="section";
  s.innerHTML='<div class="section-head"><h2>'+esc(title)+'</h2><button class="section-more" data-type="'+type+'">Ver tudo</button></div><div class="row"><span class="loading">Carregando...</span></div>';
  $("#content").append(s);
  try{
    const items=await getCatalog(type,limit);
    const row=s.querySelector(".row");row.innerHTML="";
    items.forEach(x=>row.appendChild(makeCard(x)));
    s.querySelector(".section-more").onclick=()=>category(type);
  }catch(e){
    console.error(e);
    s.querySelector(".row").innerHTML='<span class="error">Não foi possível carregar este catálogo.</span>';
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
    arr.slice(0,48).forEach(raw=>{
      const n={id:String(raw?.id??raw?.tmdb_id??raw?.slug??""),type:"canal",title:raw?.title??raw?.name??raw?.channel_name??"Canal",poster:raw?.poster??raw?.logo??raw?.image??raw?.image_url??"",year:""};
      grid.appendChild(makeCard(n));
    });
    if(!arr.length)grid.innerHTML='<span class="empty">Nenhum canal retornado.</span>';
  }catch(e){
    s.querySelector(".grid").innerHTML='<span class="error">Não foi possível carregar os canais.</span>';
  }
}

async function home(){
  $("#content").innerHTML="";
  await Promise.all([
    renderSection("🎬 Filmes","filme",18),
    renderSection("📺 Séries","serie",18),
    renderSection("✨ Animes","anime",18),
    renderSection("💫 Doramas","dorama",18)
  ]);
  await renderChannels();
}

async function category(type){
  const names={filme:"🎬 Filmes",serie:"📺 Séries",anime:"✨ Animes",dorama:"💫 Doramas"};
  $("#content").innerHTML="";
  await renderSection(names[type]||"Catálogo",type,48);
}

async function search(q){
  $("#content").innerHTML='<section class="section"><div class="section-head"><h2>Resultados</h2></div><div class="grid" id="results"><span class="loading">Pesquisando...</span></div></section>';
  try{
    const data=await api("/lista?category=pesquisa&q="+encodeURIComponent(q)+"&limit=48&format=json");
    const arr=Array.isArray(data)?data:(data?.items||data?.results||[]);
    const grid=$("#results");grid.innerHTML="";
    arr.forEach(raw=>{
      const t=String(raw?.type??raw?.media_type??"").toLowerCase();
      const type=t.includes("serie")||t==="tv"||t.includes("anime")||t.includes("dorama")?"serie":"filme";
      grid.appendChild(makeCard({id:String(raw?.id??raw?.tmdb_id??raw?.imdb_id??""),type,title:raw?.title??raw?.name??"Sem título",poster:raw?.poster??raw?.poster_path??raw?.image??raw?.image_url??"",year:raw?.year??""}));
    });
    if(!arr.length)grid.innerHTML='<span class="empty">Nenhum resultado encontrado.</span>';
  }catch(e){$("#results").innerHTML='<span class="error">Erro na busca.</span>';}
}

function setup(){
  document.querySelectorAll("[data-category]").forEach(b=>b.onclick=()=>{
    const c=b.dataset.category;
    if(c==="home")home();
    else if(c==="canais"){ $("#content").innerHTML="";renderChannels(); }
    else category(c);
  });
  $("#searchForm").onsubmit=e=>{e.preventDefault();const q=$("#search").value.trim();if(q)search(q);};
}
setup();
home();