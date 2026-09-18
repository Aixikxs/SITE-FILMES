const API="/api";
const DIRECT="https://superflixapi.monster";
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function api(path,attempt=0){
  try{
    const r=await fetch(API+path,{headers:{Accept:"application/json,text/plain,*/*"},cache:"no-store"});
    const type=r.headers.get("content-type")||"";
    const text=await r.text();
    if(!r.ok)throw new Error("HTTP "+r.status);
    if(!type.includes("json"))throw new Error("Resposta não-JSON");
    return JSON.parse(text);
  }catch(e){
    if(attempt<2){await sleep(400*(attempt+1));return api(path,attempt+1)}
    throw e;
  }
}
async function jsonUrl(url,attempt=0){
  try{
    const r=await fetch(url,{headers:{Accept:"application/json,text/plain,*/*"},cache:"no-store"});
    const type=r.headers.get("content-type")||"";
    const text=await r.text();
    if(!r.ok)throw new Error("HTTP "+r.status);
    if(!type.includes("json"))throw new Error("Resposta não-JSON");
    return JSON.parse(text);
  }catch(e){
    if(attempt<1){await sleep(500);return jsonUrl(url,attempt+1)}
    throw e;
  }
}
function items(d){return Array.isArray(d)?d:Array.isArray(d?.items)?d.items:Array.isArray(d?.results)?d.results:Array.isArray(d?.data)?d.data:[]}
function cacheKey(p){return"siteflix:"+p}
function readCache(p){try{const x=JSON.parse(sessionStorage.getItem(cacheKey(p))||"null");if(x&&Date.now()-x.time<600000)return x.data}catch{}return null}
function writeCache(p,d){try{sessionStorage.setItem(cacheKey(p),JSON.stringify({time:Date.now(),data:d}))}catch{}}
async function list(category,extra=""){
  const q="/lista?category="+encodeURIComponent(category)+(category==="pesquisa"||category==="busca"?"":"&type=tmdb")+"&format=json"+extra;
  try{const d=items(await api(q));writeCache(q,d);return d}
  catch(primary){
    const c=readCache(q);if(c)return c;
    try{const d=items(await jsonUrl(DIRECT+q));writeCache(q,d);return d}
    catch(fallback){throw new Error(primary.message+"; direto: "+fallback.message)}
  }
}
function norm(x,type){
  if(typeof x==="string"||typeof x==="number")return{id:String(x),type,title:"",poster:"",year:""};
  x=x||{};
  return{id:String(x.id??x.tmdb_id??x.imdb_id??x.slug??x.uid??""),type,title:x.title??x.name??x.original_title??x.original_name??x.label??x.channel_name??x.titulo??x.nome??"",poster:x.poster??x.poster_path??x.image??x.image_url??x.poster_url??x.logo??x.img??x.thumb??x.thumbnail??x.capa??"",year:String(x.year??String(x.release_date??x.first_air_date??x.release_year??"")).slice(0,4)}
}
function img(u){if(!u)return"";return/^https?:\/\//i.test(u)?u:u.startsWith("/")?"https://image.tmdb.org/t/p/w500"+u:u}
function renderCard(e,m){e.innerHTML=(img(m.poster)?'<img loading="lazy" src="'+esc(img(m.poster))+'" alt="">':'<div class="no-poster">🎬</div>')+'<div class="card-info"><strong>'+esc(m.title||"ID "+m.id)+'</strong><span>'+esc(m.year||m.id)+'</span></div>'}
function metadata(n){
  if(n.type==="canal"||(n.title&&n.poster))return Promise.resolve(n);
  const key="siteflix:meta:"+n.type+":"+n.id;
  try{const c=JSON.parse(sessionStorage.getItem(key)||"null");if(c)return Promise.resolve({...n,...c})}catch{}
  return api("/meta?type="+encodeURIComponent(n.type)+"&id="+encodeURIComponent(n.id)).then(m=>{
    const out={title:m?.title||"",poster:m?.poster||"",description:m?.description||""};
    try{sessionStorage.setItem(key,JSON.stringify(out))}catch{}
    return{...n,...out};
  }).catch(()=>n);
}
function card(x,onClick){
  const n=norm(x,x?.type),e=document.createElement("article");
  e.className="card";renderCard(e,n);
  e.onclick=onClick||(()=>location.href="player.html?id="+encodeURIComponent(n.id)+"&type="+encodeURIComponent(n.type));
  return{el:e,item:n};
}
async function hydrate(a,limit=4){
  let i=0;
  async function worker(){while(i<a.length){const n=a[i++];renderCard(n.el,await metadata(n.item))}}
  await Promise.all(Array.from({length:Math.min(limit,a.length)},worker));
}
async function section(title,cat,type,limit=18){
  const s=document.createElement("section");s.className="section";
  s.innerHTML='<div class="section-head"><h2>'+esc(title)+'</h2></div><div class="row"><span class="loading">Carregando...</span></div>';
  $("#content").append(s);const r=s.querySelector(".row");
  try{
    const raw=(await list(cat)).slice(0,limit);r.innerHTML="";
    if(!raw.length){r.innerHTML='<span class="empty">Nenhum item retornado pela API.</span>';return}
    const a=raw.map(x=>card({...norm(x,type),type}));a.forEach(x=>r.append(x.el));hydrate(a,4);
  }catch(e){
    r.innerHTML='<span class="error">Não foi possível carregar esta seção.</span>';
    console.error("[SiteFlix]",cat,e);
  }
}
function channelUrl(x){return x?.stream_url||x?.m3u8_url||x?.hls_url||x?.m3u8||x?.play_url||x?.player_url||x?.embed_url||x?.iframe_url||""}
async function channels(){
  const s=document.createElement("section");s.className="section";
  s.innerHTML='<div class="section-head"><h2>📡 Canais</h2></div><div class="grid"><span class="loading">Carregando...</span></div>';
  $("#content").append(s);const g=s.querySelector(".grid");
  try{
    const a=await list("canais");g.innerHTML="";
    a.slice(0,60).forEach(x=>{const n=norm(x,"canal"),id=n.id||x.slug||x.name||x.channel_name||"",src=channelUrl(x);g.append(card({...n,id,type:"canal"},()=>location.href="player.html?type=canal&id="+encodeURIComponent(id)+(src?"&src="+encodeURIComponent(src):"")).el)});
    if(!a.length)g.innerHTML='<span class="empty">Nenhum canal retornado pela API.</span>';
  }catch(e){g.innerHTML='<span class="error">Não foi possível carregar os canais.</span>';console.error("[SiteFlix] canais",e)}
}
async function home(){$("#content").innerHTML="";await section("🎬 Filmes","filme","filme");await section("📺 Séries","serie","serie");await section("✨ Animes","anime","anime");await section("💫 Doramas","dorama","dorama");await channels()}
async function category(c,t,name){$("#content").innerHTML="";await section(name,c,t,60)}
async function search(q){
  q=q.trim();if(!q)return;
  $("#content").innerHTML='<section class="section"><div class="section-head"><h2>Busca: '+esc(q)+'</h2></div><div class="grid" id="results"><span class="loading">Pesquisando...</span></div></section>';
  try{
    const raw=await list("pesquisa","&q="+encodeURIComponent(q)+"&limit=60"),r=$("#results");r.innerHTML="";
    raw.forEach(x=>{const k=String(x?.type||x?.media_type||"").toLowerCase(),t=k.includes("serie")||k==="tv"||k.includes("anime")||k.includes("dorama")?"serie":"filme";r.append(card({...norm(x,t),type:t}).el)});
    if(!raw.length)r.innerHTML='<span class="empty">Nenhum resultado encontrado.</span>';
  }catch(e){$("#results").innerHTML='<span class="error">Erro na pesquisa.</span>';console.error("[SiteFlix] pesquisa",e)}
}
function setup(){
  document.querySelectorAll("[data-category]").forEach(b=>b.onclick=()=>{const c=b.dataset.category;if(c==="home")home();else if(c==="filme")category("filme","filme","🎬 Filmes");else if(c==="serie")category("serie","serie","📺 Séries");else if(c==="anime")category("anime","anime","✨ Animes");else if(c==="dorama")category("dorama","dorama","💫 Doramas");else channels()});
  $("#search")?.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.value.trim())search(e.target.value.trim())});
}
setup();home();