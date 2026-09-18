const API="/api";
const $=selector=>document.querySelector(selector);
const esc=value=>String(value??"").replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
const requestCache=new Map();
let searchTimer;
let searchController;
let navigationToken=0;

async function request(path,signal){
  if(requestCache.has(path)) return requestCache.get(path);
  const task=fetch(API+path,{headers:{Accept:"application/json"},cache:"no-store",signal}).then(async response=>{
    if(!response.ok) throw new Error("catalog-unavailable");
    const data=await response.json();
    return Array.isArray(data)?data:(data?.items||data?.results||data?.data||[]);
  });
  requestCache.set(path,task);
  try{return await task}catch(error){requestCache.delete(path);throw error}
}
function normalize(item,type){
  if(!item||typeof item!=="object")return{id:String(item||""),type,title:"",poster:"",year:""};
  return{id:String(item.id??item.tmdb_id??item.imdb_id??item.slug??item.uid??""),type,title:item.title??item.name??item.original_title??item.original_name??item.label??item.channel_name??"",poster:item.poster??item.poster_path??item.image??item.image_url??item.poster_url??item.logo??item.img??item.thumbnail??"",year:String(item.year??item.release_date??item.first_air_date??"").slice(0,4)}
}
function image(url){if(!url)return"";return/^https?:\/\//i.test(url)?url:url.startsWith("/")?"https://image.tmdb.org/t/p/w500"+url:url}
function card(item){
  const content=normalize(item,item.type||"filme"),element=document.createElement("article");
  element.className="card";element.tabIndex=0;element.setAttribute("role","link");
  element.innerHTML=(image(content.poster)?`<img loading="lazy" decoding="async" src="${esc(image(content.poster))}" alt="Pôster de ${esc(content.title||"conteúdo")}">`:`<div class="no-poster" aria-label="Sem pôster"><span>SF</span></div>`)+`<span class="play-dot" aria-hidden="true">▶</span><div class="card-info"><strong title="${esc(content.title||"Conteúdo")}">${esc(content.title||"Conteúdo")}</strong><span>${esc(content.year||"Catálogo")}</span></div>`;
  const open=()=>location.href="/player.html?id="+encodeURIComponent(content.id)+"&type="+encodeURIComponent(content.type);
  element.onclick=open;element.onkeydown=event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();open()}};
  return element
}
function section(title,category,type,mode="row",token=navigationToken){
  const sectionElement=document.createElement("section");sectionElement.className="section";sectionElement.innerHTML=`<div class="section-head"><div><h2>${esc(title)}</h2><p>Conteúdos disponíveis agora</p></div></div><div class="${mode}"><span class="loading">Carregando catálogo...</span></div>`;$("#content").append(sectionElement);
  load(sectionElement.querySelector("."+mode),category,type,token);return sectionElement
}
async function load(target,category,type,token){
  try{
    const data=(await request(`/lista?category=${encodeURIComponent(category)}${category!=="canais"?"&type=tmdb":""}&format=json`)).slice(0,category==="canais"?60:20);
    if(token!==navigationToken)return;target.innerHTML="";
    if(!data.length){target.innerHTML='<span class="empty">Nenhum conteúdo retornado pela API.</span>';return}
    data.forEach(item=>target.append(card({...normalize(item,type),type})))
  }catch(error){if(error.name==="AbortError")return;target.innerHTML='<span class="error"><strong>Catálogo temporariamente indisponível</strong><br><small>Tente novamente em instantes.</small></span>';console.error("[v0] Falha ao carregar catálogo",category,error)}
}
function activate(active){document.querySelectorAll("[data-category]").forEach(button=>button.classList.toggle("active",button.dataset.category===active))}
function home(){navigationToken++;$("#hero").hidden=false;$("#content").innerHTML="";section("Filmes","filme","filme");section("Séries","serie","serie");section("Animes","anime","serie");section("Doramas","dorama","serie");section("Canais","canais","canal","grid");activate("home")}
function category(category,type,title){navigationToken++;$("#hero").hidden=true;$("#content").innerHTML="";section(title,category,type,"grid",navigationToken);activate(category)}
async function search(query){
  const value=query.trim();if(!value){history.replaceState({},"","/");home();return}
  navigationToken++;const token=navigationToken;$("#hero").hidden=true;$("#content").innerHTML=`<section class="section"><div class="section-head"><div><h2>Resultados para “${esc(value)}”</h2><p>Busca no catálogo da API</p></div></div><div class="grid" id="results"><span class="loading">Pesquisando...</span></div></section>`;const results=$("#results");
  if(searchController)searchController.abort();searchController=new AbortController();
  try{const data=await request("/lista?category=pesquisa&q="+encodeURIComponent(value)+"&limit=60&format=json",searchController.signal);if(token!==navigationToken)return;results.innerHTML="";if(!data.length){results.innerHTML='<span class="empty">Nenhum resultado encontrado.</span>';return}data.forEach(item=>{const raw=String(item?.type||item?.media_type||"").toLowerCase(),mediaType=raw.includes("serie")||raw==="tv"?"serie":"filme";results.append(card({...normalize(item,mediaType),type:mediaType}))})}catch(error){if(error.name==="AbortError")return;results.innerHTML='<span class="error"><strong>Busca temporariamente indisponível</strong><br><small>Tente novamente em instantes.</small></span>';console.error("[v0] Falha na busca",error)}
}
function route(){
  const path=location.pathname.replace(/\/$/,"")||"/";const routes={"/filmes":["filme","filme","Filmes"],"/series":["serie","serie","Séries"],"/animes":["anime","serie","Animes"],"/doramas":["dorama","serie","Doramas"],"/canais":["canais","canal","Canais"]};
  if(path==="/buscar"){const query=new URLSearchParams(location.search).get("q")||"";$("#search").value=query;search(query);return}if(routes[path]){category(...routes[path]);return}home()
}
document.querySelectorAll("[data-category]").forEach(button=>button.onclick=()=>{const categoryName=button.dataset.category;const path=categoryName==="home"?"/":"/"+({filme:"filmes",serie:"series",anime:"animes",dorama:"doramas",canais:"canais"}[categoryName]||"");history.pushState({},"",path);route()});
$("#searchForm").onsubmit=event=>{event.preventDefault();const value=$("#search").value.trim();history.pushState({},"","/buscar"+(value?"?q="+encodeURIComponent(value):""));route()};
$("#search").oninput=event=>{clearTimeout(searchTimer);const value=event.target.value.trim();if(value.length>2)searchTimer=setTimeout(()=>{history.pushState({},"","/buscar?q="+encodeURIComponent(value));search(value)},450)};
window.onpopstate=route;route();

// O host precisa encaminhar as rotas acima para este documento; a API continua sendo a única fonte de conteúdo.
