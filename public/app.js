const API="/api";
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function requestJson(url,timeout=7000){
  const ctl=new AbortController(), timer=setTimeout(()=>ctl.abort(),timeout);
  try{
    const r=await fetch(url,{headers:{Accept:"application/json,text/plain,*/*"},cache:"no-store",signal:ctl.signal});
    const text=await r.text();
    if(!r.ok)throw new Error("HTTP "+r.status);
    const type=r.headers.get("content-type")||"";
    if(!type.includes("json"))throw new Error("Resposta não-JSON");
    return JSON.parse(text);
  }finally{clearTimeout(timer)}
}
async function api(path){
  let last;
  for(let i=0;i<2;i++){
    try{return await requestJson(API+path,7000)}
    catch(e){last=e;if(i===0)await sleep(250)}
  }
  throw last;
}
function items(d){return Array.isArray(d)?d:Array.isArray(d?.items)?d.items:Array.isArray(d?.results)?d.results:Array.isArray(d?.data)?d.data:[]}

async function list(category,extra=""){
  const aliases={filme:"filme",serie:"serie",anime:"animes",dorama:"dorama",canais:"canais",pesquisa:"pesquisa"};
  const q="/lista?category="+encodeURIComponent(aliases[category]||category)+
    (category==="pesquisa"?"":"&type=tmdb")+"&format=json"+extra;
  try{return items(await api(q))}
  catch(e){
    console.warn("[SiteFlix] API falhou",q,e);
    throw new Error(e?.message||"Falha na API");
  }
}
}
function norm(x,type){
  if(typeof x==="string"||typeof x==="number")return{id:String(x),type,title:"",poster:"",year:""};
  x=x||{};
  return{id:String(x.id??x.tmdb_id??x.imdb_id??x.slug??x.uid??""),type,
    title:x.title??x.name??x.original_title??x.original_name??x.label??x.channel_name??x.titulo??x.nome??"",
    poster:x.poster??x.poster_path??x.image??x.image_url??x.poster_url??x.logo??x.img??x.thumb??x.thumbnail??x.capa??"",
    year:String(x.year??String(x.release_date??x.first_air_date??x.release_year??"")).slice(0,4)}
}
function img(u){if(!u)return"";return/^https?:\/\//i.test(u)?u:u.startsWith("/")?"https://image.tmdb.org/t/p/w500"+u:u}
function renderCard(e,m){e.innerHTML=(img(m.poster)?'<img loading="lazy" src="'+esc(img(m.poster))+'" alt="">':'<div class="no-poster">🎬</div>')+'<div class="card-info"><strong>'+esc(m.title||"ID "+m.id)+'</strong><span>'+esc(m.year||m.id)+'</span></div>'}
async function metadata(n){
  if(n.type==="canal"||(n.title&&n.poster))return n;
  try{return {...n,...await api("/meta?type="+encodeURIComponent(n.type)+"&id="+encodeURIComponent(n.id))}}catch{return n}
}
function card(x,onClick){
  const n=norm(x,x?.type),e=document.createElement("article");
  e.className="card";renderCard(e,n);
  e.onclick=onClick||(()=>location.href="player.html?id="+encodeURIComponent(n.id)+"&type="+encodeURIComponent(n.type));
  return{el:e,item:n}
}
function hydrate(entries){
  let i=0;
  const worker=async()=>{while(i<entries.length){const x=entries[i++];renderCard(x.el,await metadata(x.item))}};
  Promise.all(Array.from({length:Math.min(4,entries.length)},worker)).catch(()=>{});
}
function makeSection(title,grid=false){
  const s=document.createElement("section");s.className="section";
  s.innerHTML='<div class="section-head"><h2>'+esc(title)+'</h2></div><div class="'+(grid?"grid":"row")+'"><span class="loading">Carregando...</span></div>';
  $("#content").append(s);
  return s;
}
async function loadSection(s,cat,type,limit=18){
  const r=s.querySelector(".row,.grid");
  try{
    const raw=(await list(cat)).slice(0,limit);
    r.innerHTML="";
    if(!raw.length){r.innerHTML='<span class="empty">Nenhum item retornado pela API.</span>';return}
    const a=raw.map(x=>card({...norm(x,type),type}));
    a.forEach(x=>r.append(x.el));
    hydrate(a);
  }catch(e){
    r.innerHTML='<span class="error">Não foi possível carregar esta seção.<br><small>'+esc(e.message)+'</small></span>';
    console.error("[SiteFlix]",cat,e);
  }
}
function channelUrl(x){return x?.stream_url||x?.m3u8_url||x?.hls_url||x?.m3u8||x?.play_url||x?.player_url||x?.embed_url||x?.iframe_url||""}
async function loadChannels(s){
  const g=s.querySelector(".grid");
  try{
    const a=(await list("canais")).slice(0,60);g.innerHTML="";
    a.forEach(x=>{
      const n=norm(x,"canal"),id=n.id||x.slug||x.name||x.channel_name||"",src=channelUrl(x);
      g.append(card({...n,id,type:"canal"},()=>location.href="player.html?type=canal&id="+encodeURIComponent(id)+(src?"&src="+encodeURIComponent(src):"")).el)
    });
    if(!a.length)g.innerHTML='<span class="empty">Nenhum canal retornado pela API.</span>';
  }catch(e){g.innerHTML='<span class="error">Não foi possível carregar os canais.<br><small>'+esc(e.message)+'</small></span>';console.error("[SiteFlix] canais",e)}
}
function channels(){
  $("#content").innerHTML="";
  const s=makeSection("📡 Canais",true);
  loadChannels(s);
}
function home(){
  $("#content").innerHTML="";
  const defs=[
    ["🎬 Filmes","filme","filme"],["📺 Séries","serie","serie"],
    ["✨ Animes","anime","serie"],["💫 Doramas","dorama","serie"]
  ];
  const sections=defs.map(d=>makeSection(d[0]));
  const channel=makeSection("📡 Canais",true);
  defs.forEach((d,i)=>loadSection(sections[i],d[1],d[2],18));
  loadChannels(channel);
}
function category(c,t,name){
  $("#content").innerHTML="";
  const s=makeSection(name);loadSection(s,c,t,60);
}
async function search(q){
  q=q.trim();if(!q)return;
  $("#content").innerHTML='<section class="section"><div class="section-head"><h2>Busca: '+esc(q)+'</h2></div><div class="grid" id="results"><span class="loading">Pesquisando...</span></div></section>';
  try{
    const raw=await list("pesquisa","&q="+encodeURIComponent(q)+"&limit=60"),r=$("#results");r.innerHTML="";
    raw.forEach(x=>{
      const k=String(x?.type||x?.media_type||"").toLowerCase();
      const t=k.includes("serie")||k==="tv"||k.includes("anime")||k.includes("dorama")?"serie":"filme";
      r.append(card({...norm(x,t),type:t}).el);
    });
    if(!raw.length)r.innerHTML='<span class="empty">Nenhum resultado encontrado.</span>';
  }catch(e){$("#results").innerHTML='<span class="error">Erro na pesquisa.<br><small>'+esc(e.message)+'</small></span>';console.error("[SiteFlix] pesquisa",e)}
}
function setup(){
  document.querySelectorAll("[data-category]").forEach(b=>b.onclick=()=>{
    const c=b.dataset.category;
    if(c==="home")home();
    else if(c==="filme")category("filme","filme","🎬 Filmes");
    else if(c==="serie")category("serie","serie","📺 Séries");
    else if(c==="anime")category("anime","serie","✨ Animes");
    else if(c==="dorama")category("dorama","serie","💫 Doramas");
    else if(c==="canais") channels();
  });
  $("#search")?.addEventListener("keydown",e=>{if(e.key==="Enter")search(e.target.value)});
}
setup();home();