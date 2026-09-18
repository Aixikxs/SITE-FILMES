const API="/api";
const DIRECT="https://superflixapi.monster";
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function api(path){
  const r=await fetch(API+path,{headers:{Accept:"application/json,text/plain,*/*"},cache:"no-store"});
  const type=r.headers.get("content-type")||"";
  const text=await r.text();
  if(!r.ok)throw Error("HTTP "+r.status);
  if(!type.includes("json"))throw Error("Resposta não-JSON");
  try{return JSON.parse(text)}catch{throw Error("JSON inválido")}
}
function items(d){return Array.isArray(d)?d:(Array.isArray(d?.items)?d.items:Array.isArray(d?.results)?d.results:Array.isArray(d?.data)?d.data:[])}
async function jsonUrl(url){
  const r=await fetch(url,{headers:{Accept:"application/json,text/plain,*/*"},cache:"no-store"});
  const type=r.headers.get("content-type")||"";
  const text=await r.text();
  if(!r.ok)throw Error("HTTP "+r.status);
  if(!type.includes("json"))throw Error("Resposta não-JSON");
  try{return JSON.parse(text)}catch{throw Error("JSON inválido")}
}
async function list(category,extra=""){
  const q="/lista?category="+encodeURIComponent(category)+"&type=tmdb&format=json"+extra;
  try{return items(await api(q))}
  catch(primary){
    try{return items(await jsonUrl(DIRECT+q))}
    catch(fallback){throw Error(primary.message+"; direto: "+fallback.message)}
  }
}
function norm(x,type){
  if(typeof x==="string"||typeof x==="number")return{id:String(x),type,title:"",poster:"",year:""};
  x=x||{};
  return {
    id:String(x.id??x.tmdb_id??x.imdb_id??x.slug??x.uid??""),
    type,
    title:x.title??x.name??x.original_title??x.original_name??x.label??x.channel_name??x.titulo??x.nome??"",
    poster:x.poster??x.poster_path??x.image??x.image_url??x.poster_url??x.logo??x.img??x.thumb??x.thumbnail??x.capa??"",
    year:x.year??String(x.release_date??x.first_air_date??x.release_year??"").slice(0,4)
  };
}
function img(u){
  if(!u)return"";
  return /^https?:\/\//i.test(u)?u:u.startsWith("/")?"https://image.tmdb.org/t/p/w500"+u:u;
}
function renderCard(e,m){
  e.innerHTML=(img(m.poster)?'<img loading="lazy" src="'+esc(img(m.poster))+'" alt="">':'<div class="no-poster">🎬</div>')+
    '<div class="card-info"><strong>'+esc(m.title||"ID "+m.id)+'</strong><span>'+esc(m.year||m.id)+'</span></div>';
}
async function metadata(n){
  if(n.type==="canal"||(n.title&&n.poster))return n;
  try{return {...n,...await api("/meta?type="+encodeURIComponent(n.type)+"&id="+encodeURIComponent(n.id))}}catch{return n}
}
function card(x,onClick){
  const n=norm(x,x.type),e=document.createElement("article");
  e.className="card";
  renderCard(e,n);
  e.onclick=onClick||(()=>location.href="player.html?id="+encodeURIComponent(n.id)+"&type="+encodeURIComponent(n.type));
  metadata(n).then(m=>renderCard(e,m));
  return e;
}
async function section(title,cat,type,limit=18){
  const s=document.createElement("section");
  s.className="section";
  s.innerHTML='<div class="section-head"><h2>'+esc(title)+'</h2></div><div class="row"><span class="loading">Carregando...</span></div>';
  $("#content").append(s);
  try{
    const raw=(await list(cat)).slice(0,limit),r=s.querySelector(".row");
    r.innerHTML="";
    if(!raw.length){r.innerHTML='<span class="empty">Nenhum item retornado pela API.</span>';return}
    raw.forEach(x=>r.append(card({...norm(x,type),type})));
  }catch(e){
    s.querySelector(".row").innerHTML='<span class="error">Não foi possível carregar esta seção.</span>';
    console.error("[SiteFlix]",cat,e);
  }
}
function channelUrl(x){return x?.stream_url||x?.m3u8_url||x?.hls_url||x?.m3u8||x?.play_url||x?.player_url||x?.embed_url||x?.iframe_url||""}
async function channels(){
  const s=document.createElement("section");
  s.className="section";
  s.innerHTML='<div class="section-head"><h2>📡 Canais</h2></div><div class="grid"><span class="loading">Carregando...</span></div>';
  $("#content").append(s);
  try{
    let a;
    try{a=items(await api("/lista?category=canais&format=json"))}
    catch(primary){
      try{a=items(await jsonUrl(DIRECT+"/lista?category=canais&format=json"))}
      catch(fallback){throw Error(primary.message+"; direto: "+fallback.message)}
    }
    const r=s.querySelector(".grid");
    r.innerHTML="";
    a.slice(0,60).forEach(x=>{
      const n=norm(x,"canal"),id=n.id||x.slug||x.name||x.channel_name||"",src=channelUrl(x);
      r.append(card({...n,id,type:"canal"},()=>location.href="player.html?type=canal&id="+encodeURIComponent(id)+(src?"&src="+encodeURIComponent(src):"")));
    });
    if(!a.length)r.innerHTML='<span class="empty">Nenhum canal retornado pela API.</span>';
  }catch(e){
    s.querySelector(".grid").innerHTML='<span class="error">Não foi possível carregar os canais.</span>';
    console.error("[SiteFlix] canais",e);
  }
}
async function home(){
  $("#content").innerHTML="";
  await section("🎬 Filmes","filme","filme");
  await section("📺 Séries","serie","serie");
  await section("✨ Animes","anime","anime");
  await section("💫 Doramas","dorama","dorama");
  await channels();
}
async function category(c,t,name){$("#content").innerHTML="";await section(name,c,t,60)}
async function search(q){
  $("#content").innerHTML='<section class="section"><div class="section-head"><h2>Busca: '+esc(q)+'</h2></div><div class="grid" id="results"><span class="loading">Pesquisando...</span></div></section>';
  try{
    const raw=await list("pesquisa","&q="+encodeURIComponent(q)+"&limit=60"),r=$("#results");
    r.innerHTML="";
    raw.forEach(x=>{
      const m=String(x.type||x.media_type||"").toLowerCase();
      const t=m.includes("serie")||m==="tv"||m.includes("anime")||m.includes("dorama")?"serie":"filme";
      r.append(card({...norm(x,t),type:t}));
    });
    if(!raw.length)r.innerHTML='<span class="empty">Nenhum resultado encontrado.</span>';
  }catch(e){$("#results").innerHTML='<span class="error">Erro na pesquisa.</span>';console.error(e)}
}
function setup(){
  document.querySelectorAll("[data-category]").forEach(b=>b.onclick=()=>{
    const c=b.dataset.category;
    if(c==="home")home();
    else if(c==="filme")category("filme","filme","🎬 Filmes");
    else if(c==="serie")category("serie","serie","📺 Séries");
    else if(c==="anime")category("anime","anime","✨ Animes");
    else if(c==="dorama")category("dorama","dorama","💫 Doramas");
    else channels();
  });
  $("#search").onkeydown=e=>{if(e.key==="Enter"&&e.target.value.trim())search(e.target.value.trim())};
}
setup();
home();
