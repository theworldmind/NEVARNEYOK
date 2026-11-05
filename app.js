/* Girişten sayfaya: logo süzülerek sayfadaki yerine oturur, gökyüzü yavaşça açılır.
   Akıcı geçiş için: (1) giriş ekranı tek bir katman olarak söner, (2) uçan logo ayrı bir kopya olarak taşınır,
   (3) geçiş bitene kadar gökyüzü animasyonu, hava güncellemesi ve logo kovalamacası bekletilir. */
let spLeft=false,introBusy=true;const afterIntroQ=[];
function afterIntro(fn){if(introBusy)afterIntroQ.push(fn);else fn()}
function introDone(){if(!introBusy)return;introBusy=false;afterIntroQ.splice(0).forEach(f=>{try{f()}catch(e){}})}
function leaveSplash(){if(spLeft)return;spLeft=true;const sp=document.getElementById("splash"),from=sp.querySelector(".sp-logo .logo"),to=document.getElementById("heroLogo"),spl=sp.querySelector(".sp-logo");
  (window.spTimers||[]).forEach(clearTimeout);(window.spAnims||[]).forEach(a=>{try{a.finish()}catch(e){}});
  {const s=sp.querySelector(".sp-logo .O svg");if(s){s.style.opacity=1;const l=s.querySelector(".lq");if(l)l.style.opacity=1}sp.querySelectorAll(".sp-q").forEach(x=>x.remove())}
  sp.classList.add("go");scrollTo(0,0);
  const done=()=>{sp.classList.add("gone");sp.remove();document.documentElement.classList.remove("spl");
    requestAnimationFrame(()=>setTimeout(introDone,250))};
  const rm=matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(rm||!from||!to||parseFloat(getComputedStyle(spl).opacity)<.9||from.getBoundingClientRect().width<10){sp.classList.add("fading");setTimeout(done,820);return}
  from.getAnimations({subtree:true}).forEach(a=>{try{a.finish()}catch(e){}});
  const a=from.getBoundingClientRect(),b=to.getBoundingClientRect(),s=b.width/a.width;
  /* uçan kopya: giriş ekranının dışında, kendi katmanında */
  const fly=from.cloneNode(true);fly.removeAttribute("aria-label");fly.setAttribute("aria-hidden","true");fly.classList.add("fly");
  fly.style.cssText=`position:fixed;left:${a.left}px;top:${a.top}px;margin:0;z-index:66;font-size:${getComputedStyle(from).fontSize};transform-origin:0 0;will-change:transform;pointer-events:none`;
  document.body.append(fly);from.style.visibility="hidden";to.style.opacity="0";
  requestAnimationFrame(()=>{sp.classList.add("leaving");
    const an=fly.animate([{transform:"translate3d(0,0,0) scale(1)"},{transform:`translate3d(${b.left-a.left}px,${b.top-a.top}px,0) scale(${s})`}],{duration:1150,easing:"cubic-bezier(.65,0,.2,1)",fill:"forwards"});
    an.onfinish=()=>{to.style.opacity="";requestAnimationFrame(()=>{fly.remove();done()})}})}
document.getElementById("splash").addEventListener("click",leaveSplash);
{const tx=document.querySelector("#spTap .tx");if(tx&&matchMedia("(hover:hover) and (pointer:fine)").matches)tx.textContent="İlerlemek için tıkla";
  const go=ev=>{if(spLeft)return;if(ev.type==="keydown"&&!["Enter"," ","ArrowDown","Escape","PageDown"].includes(ev.key))return;leaveSplash()};
  addEventListener("keydown",go);addEventListener("wheel",go,{passive:true,once:true});
  try{if(localStorage.getItem("nvny-seen")){document.getElementById("splash").classList.add("quick")}localStorage.setItem("nvny-seen","1")}catch(e){}}
document.getElementById("splash").addEventListener("pointermove",ev=>{const g=document.querySelector(".sp-glow");if(g)g.style.translate=`${(ev.clientX/innerWidth-.5)*8}vw ${(ev.clientY/innerHeight-.5)*8}vh`});

const CATS={konser:"Konser",tiyatro:"Tiyatro",standup:"Stand-up · Komedi",sahne:"Opera · Bale · Dans",cocuk:"Çocuk · Aile",festival:"Festival",parti:"Parti · Gece",atolye:"Atölye · Quiz · Söyleşi",sinema:"Film Gösterimi"};
/* ---------- Etkinlik verisi: data/events.json (index.html yükler; GitHub Actions her gün yeniler) ---------- */
const NVD=window.NVNY_DATA||{updated:null,events:[]};
const SITE=Object.assign({contact:"",instagram:"",repo:""},window.NVNY_SITE||{});
const NEWDAYS=3; /* "Yeni" rozeti: kaç gün içinde eklenenler */
const normT=s=>s.toLocaleLowerCase("tr").replace(/[^a-zçğıöşü0-9]/g,"");
/* FİYAT KURALI: bir fiyat yalnızca toplayıcı onu satış sitesinde son 36 saat içinde doğruladıysa gösterilir.
   Tahmini, eski ya da başka siteden kopyalanmış fiyat asla gösterilmez; doğrulanmamışsa "güncel fiyat bilet sitesinde" yazar. */
const PRICE_MAX_H=36;
const priceFresh=x=>!!(x.price&&!x.est&&x.seen&&x.seen!==NVD.baseline&&(Date.now()-Date.parse(x.seen))/36e5<=PRICE_MAX_H);
const E=NVD.events.map((e,i)=>{const o={t:"",status:"",age:"",dur:"",genre:"",org:"",door:"",desc:"",note:"",...e,id:i,
    tickets:(e.tickets||[]).map(x=>({...x,price:priceFresh(x)?x.price:null,checked:x.seen&&x.seen!==NVD.baseline?x.seen:null}))};
  o.tickets.sort((a,b)=>(a.price==null)-(b.price==null)||(a.price||0)-(b.price||0));const ps=o.tickets.map(x=>x.price).filter(Boolean);
  o.price=ps.length?Math.min(...ps):null;o.site=o.tickets[0]?.site||"";o.url=o.tickets[0]?.url||"#";
  if(o.prevPrice&&!o.price)delete o.prevPrice;return o});
/* "Fiyat 3 saat önce kontrol edildi" */
function agoTxt(iso){if(!iso)return"";const m=Math.max(1,Math.round((Date.now()-Date.parse(iso))/6e4));return m<60?`${m} dk önce`:m<1440?`${Math.round(m/60)} saat önce`:`${Math.round(m/1440)} gün önce`}
/* Ankara aylık iklim normalleri (en yüksek / en düşük, °C); ay ortaları arasında doğrusal geçiş */
const CLIM=[[4,-3],[6,-3],[11,0],[17,4],[22,8],[26,12],[30,15],[30,15],[26,11],[19,6],[11,1],[6,-1]];
function NORMAL(ds){const[y,m,d]=ds.split("-").map(Number),i=m-1,dim=new Date(y,m,0).getDate(),f=(d-15)/dim,j=f>=0?(i+1)%12:(i+11)%12,w=Math.abs(f),
  a=CLIM[i],b=CLIM[j];return[Math.round(a[0]+(b[0]-a[0])*w),Math.round(a[1]+(b[1]-a[1])*w)]}


const DEEP={"konser":["#3d0812","#e8344e"],"tiyatro":["#2e1f02","#b8860b"],"sahne":["#2a0833","#b03cc0"],"festival":["#1c2a04","#6a9a12"],"standup":["#3a1702","#e8670c"],"cocuk":["#062a17","#1f9d55"],"parti":["#150a3a","#6a46e6"],"atolye":["#03262f","#0891b2"],"sinema":["#081638","#3462e0"]};

/* ---------- Hava: Open-Meteo tahmini (16 gün), ötesinde mevsim normali ---------- */
function slotTemp(hi,lo,h){
  if(h<6)return lo+(hi-lo)*.12*(1-h/6);
  if(h<=15)return lo+(hi-lo)*Math.sin((h-6)/9*Math.PI/2);
  return hi-(hi-lo)*Math.min(1,(h-15)/9)*.9;
}
const slotName=h=>h<6?"Gece":h<12?"Sabah":h<17?"Öğleden sonra":h<22?"Akşam":"Gece";
/* ---------- Hava: 1) Open-Meteo canlı (anahtarsız)  2) mevsim normali ---------- */
let OM=null,OMI={},OMD={};
const WMO=c=>c===0?["clear","Açık"]:c===1?["pcloud","Çoğunlukla açık"]:c===2?["pcloud","Parçalı bulutlu"]:c===3?["cloud","Kapalı"]:c<=48?["fog","Sisli"]:c<=57?["drizzle","Çiseleme"]:c===61?["drizzle","Hafif yağmur"]:c<=67?["rain","Yağmurlu"]:c<=77?["snow","Kar yağışlı"]:c===80?["drizzle","Hafif sağanak"]:c<=82?["rain","Sağanak"]:c<=86?["snow","Kar sağanağı"]:["rain","Gök gürültülü sağanak"];
function omSet(j,src){if(!j||!j.hourly||!j.daily)return false;OM={...j,src};OMI={};OMD={};j.hourly.time.forEach((x,i)=>OMI[x]=i);j.daily.time.forEach((x,i)=>OMD[x]=i);return true}
const omAge=()=>OM&&OM.fetched?(Date.now()-Date.parse(OM.fetched))/36e5:1e9;
const hhmm=d=>`${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
async function omFetch(){try{const u="https://api.open-meteo.com/v1/forecast?latitude=39.93&longitude=32.86&timezone=Europe%2FIstanbul&forecast_days=16&current=temperature_2m,weather_code,is_day,precipitation&hourly=temperature_2m,weather_code,precipitation_probability,is_day&daily=temperature_2m_max,temperature_2m_min";
    const r=await fetch(u,{cache:"no-store"});if(!r.ok)return;const j=await r.json();j.fetched=new Date().toISOString();if(omSet(j,"Open-Meteo"))afterIntro(()=>{update(new Date());render()})}catch(e){}}
function wxAt(ds,h){
  const night=h>=18||h<6;
  if(OM&&OMD[ds]!=null&&omAge()<72){const H=String(Math.min(23,Math.floor(h))).padStart(2,"0"),i=OMI[`${ds}T${H}:00`],di=OMD[ds],hi=Math.round(OM.daily.temperature_2m_max[di]),lo=Math.round(OM.daily.temperature_2m_min[di]);
    if(i!=null){const code=OM.hourly.weather_code[i];let[k,txt]=WMO(code);const day=OM.hourly.is_day?OM.hourly.is_day[i]:!night;if(k==="clear"&&!day)k="moon";
      return{src:OM.src+" tahmini",t:Math.round(OM.hourly.temperature_2m[i]),k,txt,pop:OM.hourly.precipitation_probability?.[i]??null,hi,lo,slot:slotName(h),forecast:true}}}
  const[hi,lo]=NORMAL(ds);
  return{src:"Mevsim normali",t:Math.round(slotTemp(hi,lo,h)),k:"normal",txt:"Mevsim normali",pop:null,hi,lo,slot:slotName(h),forecast:false};
}
function forecast(e){const h=e.t?(+e.t.slice(0,2)+(+e.t.slice(3))/60):14;const f=wxAt(e.d,h);f.day=!e.t;return f}
const ICON={clear:"i-sun",moon:"i-moon",pcloud:"i-pcloud",cloud:"i-cloud",drizzle:"i-drizzle",rain:"i-rain",snow:"i-snow",fog:"i-fog",normal:"i-thermo"};


const AY=["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];


const GUN=["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"];
const pd=s=>{const[y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)};
const addDays=(d,n)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()+n);
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const now0=new Date(),today=new Date(now0.getFullYear(),now0.getMonth(),now0.getDate());
const thisSun=addDays(today,(7-today.getDay())%7),nextSun=addDays(thisSun,7);
function fmtR(a,b){return a.getMonth()===b.getMonth()?`${a.getDate()}–${b.getDate()} ${AY[b.getMonth()]}`:`${a.getDate()} ${AY[a.getMonth()]} – ${b.getDate()} ${AY[b.getMonth()]}`}
function period(d){
  if(d<=thisSun)return{k:"a",title:"Bu hafta",rng:fmtR(today,thisSun)};
  if(d<=nextSun)return{k:"b",title:"Gelecek hafta",rng:fmtR(addDays(thisSun,1),nextSun)};
  const mon=addDays(d,-((d.getDay()+6)%7)),sun=addDays(mon,6);
  if(d.getMonth()===today.getMonth())return{k:"w"+mon.getDate(),title:sun.getMonth()!==mon.getMonth()?"Ay sonu":mon.getDate()+"–"+sun.getDate()+" "+AY[mon.getMonth()],rng:fmtR(mon,sun)};
  return{k:"m"+d.getMonth(),title:AY[d.getMonth()],rng:d.getFullYear()+" · ileri tarihli"};
}
const M0=today.getMonth(),M1=(M0+1)%12,Y1=M1===0?today.getFullYear()+1:today.getFullYear();
const RANGES={hepsi:["Tümü",()=>true],yeni:["✦ Yeni eklenenler",null],bugun:["Bugün",d=>+d===+today],yarin:["Yarın",d=>+d===+addDays(today,1)],hafta:["Bu hafta",d=>d<=thisSun],gelecek:["Gelecek hafta",d=>d>thisSun&&d<=nextSun],sonu:["Hafta sonu (Cum–Paz)",d=>[0,5,6].includes(d.getDay())],
  ay0:[AY[M0],d=>d.getMonth()===M0&&d.getFullYear()===today.getFullYear()],ay1:[AY[M1],d=>d.getMonth()===M1&&d.getFullYear()===Y1],fav:["♥ Kaydettiklerim",null]};
/* Yeni eklenen / fiyatı düşen: tarayıcı veriden hesaplar (firstSeen, prevPrice) */
const isNew=e=>e.firstSeen&&(Date.now()-Date.parse(e.firstSeen))/864e5<=NEWDAYS&&NVD.baseline!==e.firstSeen;
const dropOf=e=>e.prevPrice&&e.price&&e.price<e.prevPrice?Math.round((1-e.price/e.prevPrice)*100):0;

let favs=new Set();try{favs=new Set(JSON.parse(localStorage.getItem("nvny-favs")||"[]"))}catch(e){}
const saveFavs=()=>{try{localStorage.setItem("nvny-favs",JSON.stringify([...favs]))}catch(e){}};
const key=e=>e.d+"|"+e.title;
const state={cat:"hepsi",range:"hepsi",q:"",price:"all",venue:"all",ilce:"all",age:"all",site:"all",sort:"date",limit:60};
const upcoming=E.filter(e=>pd(e.d)>=today);
const newCount=upcoming.filter(isNew).length;
/* ALTIN ŞERİT · Yoğun ilgi: kategoriden bağımsız, veriye dayalı işaretler (tükenen seans, çok seans, büyük salon, birden çok sitede fiyatlı satış) */
{const BIG=/Congresium|MEB Şura|Ziraat Bankası Ana Salon|Jolly Joker Ankara|Spor Salonu|Arena|Tepe Prime|Milyon/;const byT={};
  upcoming.forEach(e=>{const k=normT(e.title.split(" · ")[0]);(byT[k]||(byT[k]=[])).push(e)});
  upcoming.forEach(e=>{const g=byT[normT(e.title.split(" · ")[0])],r=[];let s=0;
    if(g.some(x=>x.status==="tukendi")){s+=3;r.push("Tükenen seans var")}
    if(g.length>=4){s+=2;r.push(`${g.length} seans`)}
    if(BIG.test(e.venue)&&e.cat!=="cocuk"&&e.cat!=="atolye"){s+=2;r.push("Büyük salon")}
    if(e.tickets.filter(x=>x.price).length>=2){s+=1;r.push("Birden çok sitede satışta")}
    if(s>=3&&e.status!=="ertelendi"){e.gold=true;e.goldWhy=r}})}
const tr=s=>s.toLocaleLowerCase("tr");
function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

/* =========================================================
   CANLI GÖKYÜZÜ — güneşin Ankara'daki konumu + o saatin hava tahmini
   ========================================================= */
const LAT=39.93*Math.PI/180,LON=32.86;
const rad=Math.PI/180;
function sunPos(t){
  const d=t.getTime()/864e5+2440587.5-2451545;
  const g=(357.529+.98560028*d)*rad,q=280.459+.98564736*d;
  const L=(q+1.915*Math.sin(g)+.02*Math.sin(2*g))*rad,e=(23.439-3.6e-7*d)*rad;
  const ra=Math.atan2(Math.cos(e)*Math.sin(L),Math.cos(L)),dec=Math.asin(Math.sin(e)*Math.sin(L));
  const gmst=(18.697374558+24.06570982441908*d)%24*15;
  const H=((gmst+LON)*rad-ra);
  const alt=Math.asin(Math.sin(LAT)*Math.sin(dec)+Math.cos(LAT)*Math.cos(dec)*Math.cos(H));
  const az=Math.atan2(-Math.sin(H),Math.tan(dec)*Math.cos(LAT)-Math.sin(LAT)*Math.cos(H));
  return{alt:alt/rad,az:((az/rad)+360)%360,H,dec};
}
function moonPos(t){
  const jd=t.getTime()/864e5+2440587.5,age=(((jd-2451550.1)/29.530588853)%1+1)%1;
  const s=sunPos(t),H=s.H-age*2*Math.PI,dec=s.dec*Math.cos(age*2*Math.PI);
  const alt=Math.asin(Math.sin(LAT)*Math.sin(dec)+Math.cos(LAT)*Math.cos(dec)*Math.cos(H));
  const az=Math.atan2(-Math.sin(H),Math.tan(dec)*Math.cos(LAT)-Math.sin(LAT)*Math.cos(H));
  return{alt:alt/rad,az:((az/rad)+360)%360,age};
}
function nowWeather(t){const h=t.getHours()+t.getMinutes()/60;const f=wxAt(iso(t),h);if(OM&&OM.current&&omAge()<3){const c=OM.current;let[k,txt]=WMO(c.weather_code);if(k==="clear"&&!c.is_day)k="moon";return{...f,src:"Open-Meteo anlık",t:Math.round(c.temperature_2m),temp:Math.round(c.temperature_2m),k,txt,mm:c.precipitation||0}}return{...f,temp:f.t,mm:f.k==="rain"?2:f.k==="drizzle"?.6:f.k==="snow"?1:0}}
const KEYS=[ // güneş yüksekliği → gökyüzü (üst, orta, ufuk)
 [-18,"#03051a","#070b2a","#0e1538"],[-10,"#060a2e","#1b1a55","#3d2660"],[-4,"#121a5a","#4a2f7a","#c2507a"],
 [0,"#22306f","#8a4f8f","#ff8a5c"],[4,"#3666c0","#e59a8a","#ffcf8f"],[10,"#3a7fdc","#86b8ef","#e2eefc"],[35,"#2c74dc","#71aef0","#cfe6ff"]];
const hx=c=>[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)];
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const rgb=(c,a=1)=>`rgba(${c[0]|0},${c[1]|0},${c[2]|0},${a})`;
const isLightTheme=()=>(document.documentElement.dataset.theme||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"))==="light";
function skyCols(alt,cloud){
  let i=0;while(i<KEYS.length-1&&alt>KEYS[i+1][0])i++;
  const A=KEYS[i],B=KEYS[Math.min(i+1,KEYS.length-1)],t=B[0]===A[0]?0:Math.min(1,Math.max(0,(alt-A[0])/(B[0]-A[0])));
  const lt=isLightTheme();return[1,2,3].map(j=>{let c=mix(hx(A[j]),hx(B[j]),t);const grey=(c[0]+c[1]+c[2])/3;c=mix(c,[grey*.92,grey*.95,grey*1.02],cloud*.75);return lt?mix(c,[[150,170,220],[196,186,226],[246,206,196]][j-1],.42):c});
}
const COVER={clear:.05,moon:.05,pcloud:.35,cloud:.75,drizzle:.8,rain:.95,snow:.9,fog:.85,normal:.5};
const sky={cv:document.getElementById("sky"),W:0,H:0,stars:[],clouds:[],drops:[],layer:null,lastMin:-1,state:null};
function skySize(){
  const cv=sky.cv,r=cv.getBoundingClientRect(),dpr=Math.min(1.5,devicePixelRatio||1);
  if(!sky.frontC){/* katmanlar: arka gök (sabit) · bulutlar (GPU ile kayar) · şehir (sabit) · bayrak ve yağış (tek hareketli tuval) */
    /* hareketli tuvaller küçük tutulur: her karede yalnızca bayrak kadar bir alan güncellenir (tam ekran tuval her karede yeniden yüklenip takılıyordu) */
    /* sabit katmanlar görüntü (img) olarak gösterilir: tarayıcı onları bir kez yükler, her karede yeniden işlemez */
    sky.backC=document.createElement("canvas");sky.frontC=document.createElement("canvas");
    const mk=c=>{const i=document.createElement("img");i.className="sky-img";i.alt="";i.decoding="async";return i};
    sky.backImg=mk();sky.frontImg=mk();sky.cloudsEl=document.createElement("div");sky.cloudsEl.className="sky-clouds";
    sky.fx=document.createElement("canvas");sky.fx.className="sky-flag";sky.rain=document.createElement("canvas");sky.rain.className="sky-rain";sky.rain.hidden=true;
    for(const el of[sky.backImg,sky.cloudsEl,sky.frontImg,sky.fx,sky.rain])el.setAttribute("aria-hidden","true");cv.after(sky.backImg,sky.cloudsEl,sky.frontImg,sky.fx,sky.rain)}
  sky.W=r.width;sky.H=r.height;sky.dpr=dpr;for(const c of[sky.backC,sky.frontC]){c.width=r.width*dpr;c.height=r.height*dpr}
  sky.rain.width=Math.ceil(r.width/2);sky.rain.height=Math.ceil(r.height/2);sky.cloudKey="";sky.flagKey="";
  const R=rng(7);sky.stars=Array.from({length:Math.round(sky.W*sky.H/2200)},()=>({x:R()*sky.W,y:R()*sky.H*.62,r:R()*1.2+.25,p:R()*6}));
  sky.clouds=Array.from({length:9},(_,i)=>({x:R()*sky.W*1.4-sky.W*.2,y:sky.H*(.08+R()*.38),s:.6+R()*1.1,v:.04+R()*.08,seed:i*13+1}));
  sky.drops=Array.from({length:160},()=>({x:R()*sky.W,y:R()*sky.H,l:8+R()*12,v:7+R()*6}));
  sky.lastMin=-1;
}
function update(t){
  const s=sunPos(t),m=moonPos(t),w=nowWeather(t),cloud=COVER[w.k]??.5;
  const snow=w.k==="snow"||(w.temp<=0&&w.mm>=.5),precip=w.k==="rain"?1:w.k==="drizzle"?.4:snow?.7:0;
  sky.state={s,m,w,cloud,snow,precip,cols:skyCols(s.alt,cloud),night:Math.min(1,Math.max(0,(2-s.alt)/10))};
  {const sc=document.getElementById("spStars"),na=Math.max(0,Math.min(1,(-s.alt-5)/8))*(1-cloud*.8);if(sc&&!sc.dataset.done&&na>0){sc.dataset.done=1;const w=sc.width=innerWidth,h=sc.height=innerHeight,cx=sc.getContext("2d");cx.fillStyle="#fff";for(let i=0;i<160;i++){cx.globalAlpha=na*(.25+Math.random()*.7);cx.beginPath();cx.arc(Math.random()*w,Math.random()*h*.8,Math.random()*1.3+.3,0,7);cx.fill()}}}
  {const R=document.documentElement.style,[k1,k2,k3]=sky.state.cols.map(c=>rgb(c.map(v=>Math.round(v/4)*4)));
    /* yalnızca renk gerçekten değiştiyse yaz: her dakika bütün sayfanın stilini yeniden hesaplatmasın */
    if(sky.cssKey!==k1+k2+k3){sky.cssKey=k1+k2+k3;R.setProperty("--sky1",k1);R.setProperty("--sky2",k2);R.setProperty("--sky3",k3)}}
  {const spl=document.getElementById("spBg"),[c1,c2,c3]=sky.state.cols;if(spl)spl.style.background=`radial-gradient(70% 45% at 50% 100%,${rgb(c3,.9)},transparent 75%),linear-gradient(180deg,${rgb(c1)} 0%,${rgb(c2)} 62%,${rgb(c3)} 100%)`}
  /* şehir katmanı yalnızca ışık belirgin değişince yeniden çizilir (önceden her dakika çiziliyordu) */
  {const lk=[Math.round(sky.state.night*40),isLightTheme(),sky.W,sky.H].join();if(lk!==sky.layerKey){sky.layerKey=lk;buildLayer()}}
  drawStatic();
  renderNow(t);
}
/* Şehir silüeti: kavisli ufuk üzerinde Kale (bayrağıyla), Anıtkabir (ışıklı traverten), Hitit Güneş Kursu, Atakule, Kocatepe, servi ağaçları ve yapılar */
function ankPre(){const a=sky.ank,{W,dpr}=sky;a.oy=a.y-a.fs*.6;a.oh=a.fs*2.2;
  const mk=glow=>{const c=document.createElement("canvas");c.width=Math.ceil(W*dpr);c.height=Math.ceil(a.oh*dpr);const x=c.getContext("2d");x.scale(dpr,dpr);
    x.font=`800 ${a.fs*1.12}px "Bricolage Grotesque","Arial Narrow",sans-serif`;try{x.fontStretch="condensed"}catch(e){}x.textAlign="center";x.textBaseline="top";
    const txt="ANKARA",sp=a.fs*.1;let tw=0;for(const ch of txt)tw+=x.measureText(ch).width+sp;tw-=sp;let px=a.cx-tw/2;
    const g=x.createLinearGradient(0,a.fs*.6,0,a.fs*1.6);
    if(glow){x.shadowColor="rgba(255,190,110,.95)";x.shadowBlur=34;g.addColorStop(0,"rgba(255,236,200,.55)");g.addColorStop(1,"rgba(255,220,170,.35)")}
    else{x.shadowColor="rgba(8,10,40,.35)";x.shadowBlur=18;x.shadowOffsetY=4;g.addColorStop(0,"#ffffff");g.addColorStop(1,"#ffffff")}
    x.fillStyle=g;for(const ch of txt){const cw=x.measureText(ch).width;x.fillText(ch,px+cw/2,a.fs*.6);px+=cw+sp}return c};
  sky.ankC=mk(false)}
function flagPre(f){const d=sky.dpr,c=document.createElement("canvas");c.width=Math.ceil(f.w*d);c.height=Math.ceil(f.h*d);const x=c.getContext("2d");x.scale(d,d);const G=f.h;
  x.fillStyle="#e30a17";x.fillRect(0,0,f.w,G);
  x.fillStyle="#fff";x.beginPath();x.arc(.5*G,.5*G,.25*G,0,7);x.fill();x.fillStyle="#e30a17";x.beginPath();x.arc(.5625*G,.5*G,.2*G,0,7);x.fill();
  x.fillStyle="#fff";x.beginPath();const sx=.9208*G,sy=.5*G,R=.125*G,r=R*.382;for(let i=0;i<10;i++){const a=Math.PI+i*Math.PI/5,rr=i%2?r:R;x.lineTo(sx+Math.cos(a)*rr,sy+Math.sin(a)*rr)}x.closePath();x.fill();
  f.c=c}
function drawFlag(x,now){const f=sky.flag;if(!f)return;if(!f.c)flagPre(f);const n=28,sw=f.w/n,d=sky.dpr,t=reduce?0:now/1000;
  for(let i=0;i<n;i++){const u=i/n,amp=f.h*.09*u,ph=t*4.2-u*6.5,off=Math.sin(ph)*amp+u*f.h*.04,sh=Math.cos(ph)*u;
    x.drawImage(f.c,i*sw*d,0,Math.ceil(sw*d)+1,f.c.height,f.x+i*sw,f.y+off,sw+.6,f.h);
    if(sh>0){x.fillStyle=`rgba(255,255,255,${sh*.10})`}else{x.fillStyle=`rgba(0,0,0,${-sh*.22})`}x.fillRect(f.x+i*sw,f.y+off,sw+.6,f.h)}}
function buildLayer(){sky.ankC=null;
  const {W,H,dpr}=sky,st=sky.state;const oc=document.createElement("canvas");oc.width=W*dpr;oc.height=H*dpr;const x=oc.getContext("2d");x.scale(dpr,dpr);
  const n=st.night,cx=W/2,span=Math.min(W*.96,1000),s=span/1000,R=Math.max(span*1.6,900);
  const fs=Math.min(W*.12,112),hb=(document.querySelector(".hero-bottom")?.offsetHeight||200),base=Math.max(H*.42,H-hb-fs*1.35-18);
  const arcY=()=>base; // düz, yatay ufuk
  const LT=isLightTheme(),silD=mix(mix([62,70,110],[9,10,32],n),[92,100,140],LT?.45:0),silM=mix(mix([80,88,128],[16,16,46],n),[120,128,168],LT?.45:0),silF=mix(mix([104,110,150],[26,22,62],n),[150,156,196],LT?.45:0);
  const S=rgb(silD),M=rgb(silM),F=rgb(silF),win=`rgba(255,${196+n*16|0},${128+n*20|0},${.12+n*.82})`;
  const L=cx-span/2,Rr=rng(1923);
  // uzak tepeler (iki kat)
  x.fillStyle=rgb(mix(silF,[255,255,255],.06));x.beginPath();x.moveTo(0,H);for(let i=0;i<=W;i+=10)x.lineTo(i,arcY(i)-54*s-Math.sin(i*.004+2)*30*s-Math.sin(i*.013)*12*s);x.lineTo(W,H);x.fill();
  x.fillStyle=F;x.beginPath();x.moveTo(0,H);for(let i=0;i<=W;i+=10)x.lineTo(i,arcY(i)-26*s-Math.sin(i*.007+1)*20*s-Math.sin(i*.021)*8*s);x.lineTo(W,H);x.fill();
  // arka sıra yapılar
  for(let px=L-30*s;px<L+span+30*s;){const w=(14+Rr()*26)*s,rel=Math.abs(px-cx)/(span/2),h=(30+Rr()*Rr()*120)*s*(1-rel*.5);x.fillStyle=M;x.fillRect(px,arcY(px+w/2)-h,w-1.5*s,h+90*s);
    x.fillStyle=win;for(let wy=arcY(px+w/2)-h+5*s;wy<arcY(px+w/2)-4*s;wy+=7.5*s)for(let wx=px+3*s;wx<px+w-5*s;wx+=6*s)if(Rr()>.7)x.fillRect(wx,wy,2.2*s,3*s);px+=w}
  // ANKARA KALESİ + bayrak
  const kx=L+span*.07;x.fillStyle=S;x.beginPath();x.moveTo(kx-90*s,arcY(kx-90*s));x.quadraticCurveTo(kx,arcY(kx)-92*s,kx+100*s,arcY(kx+100*s));x.fill();
  const ky=arcY(kx)-64*s;x.fillRect(kx-46*s,ky-24*s,92*s,120*s);for(let i=-46;i<46;i+=9)x.fillRect(kx+i*s,ky-31*s,5.5*s,8*s);
  x.fillRect(kx-58*s,ky-46*s,20*s,140*s);x.fillRect(kx+40*s,ky-40*s,18*s,140*s);x.fillRect(kx-8*s,ky-36*s,16*s,14*s);
  for(let i=0;i<3;i++)x.fillRect(kx-58*s+i*7*s,ky-52*s,4.5*s,7*s);
  // servi ağaçları
  const cypress=(px,h)=>{const y=arcY(px)+3*s;x.fillStyle=S;x.beginPath();x.moveTo(px,y-h);x.quadraticCurveTo(px+h*.16,y-h*.4,px+h*.08,y);x.lineTo(px-h*.08,y);x.quadraticCurveTo(px-h*.16,y-h*.4,px,y-h);x.fill()};
  // ANITKABİR — ışıklandırılmış traverten
  const ax=L+span*.31,ab=arcY(ax),stone=rgb(mix([222,196,140],[206,170,104],n)),shade=rgb(mix([186,158,108],[150,118,72],n)),glow=`rgba(255,206,130,${.06+n*.16})`;
  const g0=x.createRadialGradient(ax,ab-60*s,10*s,ax,ab-60*s,240*s);g0.addColorStop(0,glow);g0.addColorStop(1,"rgba(255,214,150,0)");x.fillStyle=g0;x.fillRect(ax-260*s,ab-260*s,520*s,300*s);
  for(const o of[-190,-170,-150,150,170,190])cypress(ax+o*s,(44+Rr()*16)*s);
  // yan revaklar
  x.fillStyle=shade;x.fillRect(ax-176*s,ab-34*s,66*s,110*s);x.fillRect(ax+110*s,ab-34*s,66*s,110*s);
  x.fillStyle=stone;x.fillRect(ax-180*s,ab-38*s,74*s,5*s);x.fillRect(ax+106*s,ab-38*s,74*s,5*s);
  x.fillStyle=rgb(mix(silD,[0,0,0],.2));for(let i=0;i<7;i++){x.fillRect(ax-172*s+i*9.4*s,ab-31*s,4.6*s,26*s);x.fillRect(ax+114*s+i*9.4*s,ab-31*s,4.6*s,26*s)}
  // basamaklı kaide
  x.fillStyle=shade;x.fillRect(ax-128*s,ab-8*s,256*s,90*s);x.fillStyle=stone;[[124,8],[112,8],[100,8]].forEach(([hw,hh],i)=>x.fillRect(ax-hw*s,ab-(8+i*8)*s,hw*2*s,hh*s+1));
  // Şeref Holü
  const top=ab-110*s,colTop=ab-96*s,colBot=ab-24*s,hw=88*s;
  x.fillStyle=stone;x.fillRect(ax-hw,top,hw*2,14*s);x.fillStyle=shade;x.fillRect(ax-hw+6*s,top-6*s,hw*2-12*s,6*s);x.fillRect(ax-hw,top+14*s,hw*2,2.4*s);
  x.fillStyle=`rgba(46,30,12,${.5+n*.25})`;x.fillRect(ax-hw+4*s,colTop,hw*2-8*s,colBot-colTop);
  x.fillStyle=`rgba(255,198,110,${.04+n*.24})`;x.fillRect(ax-hw+4*s,colTop,hw*2-8*s,colBot-colTop);
  const cols=10,cw=9*s,gap=(hw*2-8*s-cw)/(cols-1);x.fillStyle=stone;for(let i=0;i<cols;i++)x.fillRect(ax-hw+4*s+i*gap,colTop,cw,colBot-colTop);
  x.fillStyle=shade;for(let i=0;i<cols;i++)x.fillRect(ax-hw+4*s+i*gap+cw-2.2*s,colTop,2.2*s,colBot-colTop);
  // HİTİT GÜNEŞ KURSU
  const hx=L+span*.45,hbse=arcY(hx);x.fillStyle=S;x.fillRect(hx-9*s,hbse-16*s,18*s,80*s);x.fillRect(hx-1.6*s,hbse-52*s,3.2*s,38*s);
  x.strokeStyle=S;x.lineWidth=2.6*s;x.beginPath();x.arc(hx,hbse-66*s,15*s,0,7);x.stroke();x.lineWidth=1.2*s;for(let i=0;i<8;i++){const a=i*Math.PI/4;x.beginPath();x.moveTo(hx,hbse-66*s);x.lineTo(hx+Math.cos(a)*15*s,hbse-66*s+Math.sin(a)*15*s);x.stroke()}
  for(const o of[-20,0,20]){x.beginPath();x.arc(hx+o*s*.7,hbse-84*s+Math.abs(o)*.25*s,2.4*s,0,7);x.fillStyle=S;x.fill()}
  // ATAKULE
  const tx=L+span*.56,tb=arcY(tx);x.fillStyle=S;x.beginPath();x.moveTo(tx-16*s,tb+80*s);x.lineTo(tx-15*s,tb);x.lineTo(tx-7*s,tb-236*s);x.lineTo(tx+7*s,tb-236*s);x.lineTo(tx+15*s,tb);x.lineTo(tx+16*s,tb+80*s);x.fill();
  x.beginPath();x.moveTo(tx-40*s,tb-238*s);x.lineTo(tx+40*s,tb-238*s);x.lineTo(tx+30*s,tb-266*s);x.lineTo(tx-30*s,tb-266*s);x.fill();
  x.beginPath();x.ellipse(tx,tb-266*s,30*s,24*s,0,Math.PI,0);x.fill();x.fillRect(tx-2*s,tb-326*s,4*s,40*s);
  x.fillStyle=`rgba(140,220,255,${.2+n*.55})`;x.fillRect(tx-36*s,tb-252*s,72*s,3.4*s);x.fillStyle=`rgba(255,226,180,${.2+n*.7})`;for(let i=-3;i<=3;i++)x.fillRect(tx+i*8*s-2*s,tb-262*s,4*s,5*s);
  x.fillStyle=`rgba(255,60,80,${.35+.65*n*(.6+.4*Math.sin(performance.now()/500))})`;x.beginPath();x.arc(tx,tb-327*s,3.4*s,0,7);x.fill();
  // KOCATEPE CAMİİ
  const kc=L+span*.76,kb=arcY(kc);x.fillStyle=S;x.fillRect(kc-64*s,kb-56*s,128*s,150*s);x.beginPath();x.arc(kc,kb-56*s,52*s,Math.PI,0);x.fill();
  for(const o of[-48,48]){x.beginPath();x.arc(kc+o*s,kb-52*s,20*s,Math.PI,0);x.fill()}for(const o of[-26,26]){x.beginPath();x.arc(kc+o*s,kb-90*s,10*s,Math.PI,0);x.fill()}
  x.fillRect(kc-1.6*s,kb-124*s,3.2*s,18*s);x.beginPath();x.arc(kc,kb-126*s,3.4*s,0,7);x.fill();
  x.fillStyle=win;for(let i=-3;i<=3;i++)x.fillRect(kc+i*10*s-2*s,kb-74*s,4*s,8*s);x.fillStyle=S;
  for(const o of[-104,-84,84,104]){const px=kc+o*s,pb=arcY(px);x.fillRect(px-4*s,pb-180*s,8*s,260*s);x.beginPath();x.moveTo(px-5*s,pb-180*s);x.lineTo(px,pb-212*s);x.lineTo(px+5*s,pb-180*s);x.fill();
    x.fillRect(px-7*s,pb-132*s,14*s,4.5*s);x.fillRect(px-7*s,pb-96*s,14*s,4*s);x.fillStyle=win;x.fillRect(px-7*s,pb-128*s,14*s,1.4*s);x.fillStyle=S}
  for(const o of[-140,-128,135])cypress(kc+o*s,(36+Rr()*14)*s);
  // ön sıra yapılar (kenarlarda)
  for(let px=L-40*s;px<L+span+40*s;){const w=(20+Rr()*34)*s,rel=Math.abs(px-cx)/(span/2);if(rel>.86||(px>ax+130*s&&px<ax+200*s)){const h=(24+Rr()*60)*s;x.fillStyle=S;x.fillRect(px,arcY(px+w/2)-h,w-2*s,h+90*s);x.fillStyle=win;for(let wy=arcY(px+w/2)-h+5*s;wy<arcY(px+w/2)-4*s;wy+=8*s)for(let wx=px+3*s;wx<px+w-6*s;wx+=6.5*s)if(Rr()>.6)x.fillRect(wx,wy,2.6*s,3.4*s)}px+=w}
  // ufuk kavisi + zemin
  const gg=x.createLinearGradient(0,base,0,H);gg.addColorStop(0,S);gg.addColorStop(1,rgb(mix(silD,[0,0,0],.35)));x.fillStyle=gg;
  x.beginPath();x.moveTo(0,H);for(let i=0;i<=W;i+=6)x.lineTo(i,arcY(i));x.lineTo(W,H);x.fill();
  const lg=x.createLinearGradient(L,0,L+span,0);lg.addColorStop(0,"rgba(255,255,255,0)");lg.addColorStop(.5,`rgba(255,255,255,${.5+n*.2})`);lg.addColorStop(1,"rgba(255,255,255,0)");
  x.strokeStyle=lg;x.lineWidth=1.4;x.beginPath();x.moveTo(L-60*s,base+.5);x.lineTo(L+span+60*s,base+.5);x.stroke();
  // SAĞDA BÜYÜK TÜRK BAYRAĞI: direk burada, dalgalanan bayrak her karede
  {const fsc=Math.max(s,.55),fh=62*fsc,fw=fh*1.5,px=Math.min(W-fw-14,L+span*.95),top=base-Math.max(250*s,fh*3.4);
    const pg=x.createLinearGradient(px-2*fsc,0,px+3*fsc,0);pg.addColorStop(0,"#9aa0b4");pg.addColorStop(.5,"#f4f5fa");pg.addColorStop(1,"#7d8296");
    x.fillStyle=pg;x.fillRect(px-1.6*fsc,top,3.6*fsc,base-top+2);x.fillStyle="#e9c46a";x.beginPath();x.arc(px+.2*fsc,top-2*fsc,3.6*fsc,0,7);x.fill();
    x.fillStyle=S;x.fillRect(px-7*fsc,base-6*fsc,14.4*fsc,8*fsc);
    sky.flag={x:px+2*fsc,y:top+3*fsc,w:fw,h:fh,c:null}}
  sky.ank={cx,y:base+fs*.2,fs:fs*.86};
  sky.layer=oc;sky.base=base;
}
const cloudCache=new Map();
/* Bulut görselleri: bulanıklaştırma filtresi yerine yumuşak gradyanlar (filtre her karede yeniden hesaplanıp takılmaya yol açıyordu).
   Renk adımlı tutulur ki dakikada bir yeniden çizilmesin; çizildiği an tek seferlik piksele dönüştürülür. */
function cloudSprite(c,col){const q=col.map(v=>Math.round(v/20)*20),k=c.seed+"|"+q.join(",");if(cloudCache.has(k))return cloudCache.get(k);
  const s=c.s*Math.min(1.4,sky.W/900+.4),w=Math.ceil(460*s),h=Math.ceil(200*s),oc=document.createElement("canvas");oc.width=w;oc.height=h;const x=oc.getContext("2d"),R=rng(c.seed);
  const hi=rgb(mix(q,[255,255,255],.25),.55),mid=rgb(q,.32),lo=rgb(q,0);
  for(let i=0;i<16;i++){const ox=w/2+(R()-.5)*w*.5,oy=h*.56+(R()-.5)*h*.22,r=(34+R()*46)*s;const g=x.createRadialGradient(ox,oy-r*.25,0,ox,oy,r);g.addColorStop(0,hi);g.addColorStop(.55,mid);g.addColorStop(1,lo);x.fillStyle=g;x.beginPath();x.arc(ox,oy,r,0,7);x.fill()}
  if(cloudCache.size>40)cloudCache.clear();cloudCache.set(k,oc);return oc}
function cloudShape(x,c,W,col,a){const sp=cloudSprite(c,col),cx=((c.x%(W*1.4))+W*1.4)%(W*1.4)-W*.2-sp.width/2;x.globalAlpha=a;x.drawImage(sp,cx,c.y-sp.height/2);x.globalAlpha=1}
let lastT=performance.now(),lastDraw=0;sky.vis=true;sky.run=false;
function loop(now){if(reduce||document.hidden||!sky.vis){sky.run=false;return}requestAnimationFrame(loop);if(now-lastDraw<31||(document.documentElement.classList.contains("spl")&&lastDraw))return;lastDraw=now;frame(now)}
function kick(){if(!sky.run&&!reduce){sky.run=true;lastT=performance.now();requestAnimationFrame(loop)}}
new IntersectionObserver(es=>{sky.vis=es[0].isIntersecting;if(sky.vis)kick()}).observe(document.getElementById("sky"));
/* Sabit katmanlar: dakikada bir (ya da tema/boyut değişince) çizilir; her karede yeniden çizilmez */
function showImg(img,c){c.toBlob(b=>{if(!b)return;const u=URL.createObjectURL(b),n=new Image();n.src=u;
  (n.decode?n.decode():Promise.resolve()).catch(()=>{}).then(()=>{const old=img.dataset.u;img.src=u;img.dataset.u=u;if(old)setTimeout(()=>URL.revokeObjectURL(old),3000)})})}
function drawStatic(){
  const st=sky.state;if(!st||!sky.frontC)return;const {W,H}=sky;
  let x=sky.backC.getContext("2d");x.setTransform(sky.dpr,0,0,sky.dpr,0,0);x.clearRect(0,0,W,H);
  const[ct,cm,ch]=st.cols;let g=x.createLinearGradient(0,0,0,sky.base);g.addColorStop(0,rgb(ct));g.addColorStop(.6,rgb(cm));g.addColorStop(1,rgb(ch));x.fillStyle=g;x.fillRect(0,0,W,H);
  // yıldızlar
  const sa=Math.max(0,Math.min(1,(-st.s.alt-5)/8))*(1-st.cloud*.9);
  if(sa>0){x.fillStyle="#fff";for(const p of sky.stars){x.globalAlpha=sa*(.45+.55*Math.sin(p.p)**2)*(1-p.y/(sky.H*.62));x.beginPath();x.arc(p.x,p.y,p.r,0,7);x.fill()}x.globalAlpha=1}
  // güneş / ay: azimut 90°(doğu)→270°(batı) ekrana yayılır
  const toXY=(az,alt)=>[W*((az-80)/200),sky.base-(alt/55)*sky.base*.92];
  if(st.s.alt>-6){const[sx,sy]=toXY(st.s.az,st.s.alt),r=Math.max(18,W*.018);const glow=x.createRadialGradient(sx,sy,0,sx,sy,r*7);glow.addColorStop(0,`rgba(255,220,160,${.55*(1-st.cloud*.6)})`);glow.addColorStop(1,"rgba(255,200,140,0)");x.fillStyle=glow;x.fillRect(sx-r*7,sy-r*7,r*14,r*14);
    x.fillStyle=`rgba(255,${st.s.alt<6?200:240},${st.s.alt<6?130:200},${1-st.cloud*.55})`;x.beginPath();x.arc(sx,sy,r,0,7);x.fill()}
  if(st.m.alt>-2&&st.s.alt<8){const[mx,my]=toXY(st.m.az,st.m.alt),r=Math.max(14,W*.014),ph=st.m.age;
    x.save();x.globalAlpha=(1-st.cloud*.6)*Math.min(1,(8-st.s.alt)/8);x.shadowColor="#fff2d0";x.shadowBlur=r*2;x.fillStyle="#fff4dc";x.beginPath();x.arc(mx,my,r,0,7);x.fill();x.shadowBlur=0;
    x.globalCompositeOperation="source-atop";x.fillStyle=rgb(ct,.92);const off=(ph<.5?1:-1)*r*2*(1-Math.abs(ph-.5)*2);x.beginPath();x.arc(mx+off*(ph<.5?-1:1),my,r*1.02,0,7);if(Math.abs(ph-.5)>.03)x.fill();x.restore()}
  // şehir ve ANKARA
  showImg(sky.backImg,sky.backC);
  x=sky.frontC.getContext("2d");x.setTransform(sky.dpr,0,0,sky.dpr,0,0);x.clearRect(0,0,W,H);
  if(sky.layer)x.drawImage(sky.layer,0,0,W,H);
  if(sky.ank){if(!sky.ankC)ankPre();x.drawImage(sky.ankC,0,sky.ank.oy,W,sky.ank.oh)}
  showImg(sky.frontImg,sky.frontC);
  buildClouds();placeFlag();
}
function placeFlag(){const f=sky.flag;if(!f||!sky.fx)return;const box={x:Math.floor(f.x-6),y:Math.floor(f.y-f.h*.35),w:Math.ceil(f.w+18),h:Math.ceil(f.h*1.75)},k=Object.values(box).join();
  if(k===sky.flagKey)return;sky.flagKey=k;sky.flagBox=box;const c=sky.fx;c.width=Math.ceil(box.w*sky.dpr);c.height=Math.ceil(box.h*sky.dpr);
  c.style.cssText=`left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px`}
/* Bulutlar: her biri kendi küçük tuvalinde, ekran kartıyla (transform) kayar; ana iş parçacığını hiç yormaz */
function buildClouds(){
  const st=sky.state;if(!st||!sky.cloudsEl)return;const W=sky.W;
  const cc=mix(mix([255,255,255],[150,158,175],st.cloud),[40,44,80],st.night*.85),n=Math.round(2+st.cloud*7),a=.35+st.cloud*.5;
  const key=[n,cc.map(v=>Math.round(v/20)).join("."),a.toFixed(2),Math.round(W)].join("|");if(key===sky.cloudKey)return;sky.cloudKey=key;
  if(!sky.cloudT0)sky.cloudT0=performance.now();const el0=performance.now()-sky.cloudT0;
  const old=[...sky.cloudsEl.children],frag=document.createDocumentFragment();
  for(let i=0;i<n;i++){const c=sky.clouds[i],sp=cloudSprite(c,cc),el=document.createElement("img");el.alt="";el.decoding="async";
    if(!sp.url)sp.url=sp.toDataURL("image/png");el.src=sp.url;
    el.style.cssText=`width:${sp.width}px;height:${sp.height}px;opacity:${a}`;
    const x0=-W*.2-sp.width/2,x1=W*1.2-sp.width/2,y=c.y-sp.height/2,dur=(W*1.4)/(c.v*.06),ph=((c.x+W*.2)/(W*1.4)+1)%1;
    if(reduce)el.style.transform=`translate3d(${x0+(x1-x0)*ph}px,${y}px,0)`;
    else{el.animate([{transform:`translate3d(${x0}px,${y}px,0)`},{transform:`translate3d(${x1}px,${y}px,0)`}],{duration:dur,iterations:Infinity,delay:-(ph*dur+el0)});
      if(old.length)el.animate([{opacity:0},{opacity:a}],{duration:1600,easing:"ease-out"})}
    frag.append(el)}
  sky.cloudsEl.append(frag);
  if(old.length)setTimeout(()=>old.forEach(o=>o.remove()),reduce?0:1700);
}
/* Her karede yalnızca bayrak (küçük tuval) ve yağış varsa yarım çözünürlüklü yağış tuvali çizilir */
function frame(nowT){
  const st=sky.state;if(!st||!sky.fx)return;
  const dt=Math.min(100,nowT-lastT);lastT=nowT;
  if(sky.flagBox){const b=sky.flagBox,d=sky.dpr,x=sky.fx.getContext("2d");x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,sky.fx.width,sky.fx.height);x.setTransform(d,0,0,d,-b.x*d,-b.y*d);drawFlag(x,nowT)}
  const rc=sky.rain;
  if(st.precip>0){const {W,H}=sky,x=rc.getContext("2d");rc.hidden=false;x.setTransform(.5,0,0,.5,0,0);x.clearRect(0,0,W,H);
    const k=Math.round(sky.drops.length*st.precip);x.strokeStyle=st.snow?"rgba(255,255,255,.85)":"rgba(200,215,255,.45)";x.fillStyle="rgba(255,255,255,.85)";x.lineWidth=1.6;x.beginPath();
    for(let i=0;i<k;i++){const d=sky.drops[i];if(!reduce){d.y+=(st.snow?d.v*.18:d.v)*dt*.06;d.x+=(st.snow?Math.sin(nowT/700+i)*.4:-.6)*dt*.06;if(d.y>H){d.y=-20;d.x=Math.random()*W}}
      if(st.snow){x.moveTo(d.x+2,d.y);x.arc(d.x,d.y,2,0,7)}else{x.moveTo(d.x,d.y);x.lineTo(d.x-2,d.y+d.l)}}
    st.snow?x.fill():x.stroke()}
  else if(!rc.hidden){rc.getContext("2d").clearRect(0,0,rc.width,rc.height);rc.hidden=true}
}
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
function renderNow(t){
  const st=sky.state,w=st.w,hh=String(t.getHours()).padStart(2,"0"),mm=String(t.getMinutes()).padStart(2,"0");
  const part=st.s.alt>6?"Gündüz":st.s.alt>-1?(t.getHours()<12?"Gün doğumu":"Gün batımı"):st.s.alt>-12?"Alacakaranlık":"Gece";
  let txt=w.txt;
  const ik=w.k==="clear"&&st.s.alt<-2?"moon":w.k==="normal"?"pcloud":w.k;
  document.getElementById("now").innerHTML=`<span class="nw-ic k-${ik}" aria-hidden="true"><svg viewBox="0 0 40 40"><use href="#${ICON[ik]||"i-pcloud"}"/></svg></span><span class="nw-tx"><span>Ankara · ${hh}:${mm} · ${part}</span><b><em>${w.temp}°</em> ${txt}</b><small>${w.src}${OM&&OM.fetched?` · ${hhmm(new Date(OM.fetched))} güncel`:""} · gün ${w.hi}°/${w.lo}°</small></span>`;
}
function tick(){const t=new Date();if(introBusy&&sky.state)return;if(t.getMinutes()!==sky.lastMin){sky.lastMin=t.getMinutes();update(t)}if(reduce||document.hidden)frame(performance.now())}
function startSky(){skySize();tick();setInterval(tick,15000);kick();omFetch();setInterval(omFetch,30*60e3)}
document.addEventListener("visibilitychange",()=>{if(!document.hidden){kick();if(omAge()>.75)omFetch()}});

function toast(t){const d=document.createElement("div");d.className="toast";d.textContent=t;document.body.append(d);setTimeout(()=>d.remove(),2600)}



/* ---------- Arayüz ---------- */
function chip(label,pressed,on,color,count){const b=document.createElement("button");b.className="chip"+(color?" catc":"");b.type="button";b.setAttribute("aria-pressed",pressed);if(color){b.style.setProperty("--c",color);b.insertAdjacentHTML("beforeend",'<span class="dot"></span>')}b.append(label);if(count!=null)b.insertAdjacentHTML("beforeend",`<small>${count}</small>`);b.onclick=on;return b}
function drawChips(){
  const c=document.getElementById("cats");c.innerHTML="";
  c.append(chip("Tüm kategoriler",state.cat==="hepsi",()=>{state.cat="hepsi";render()},null,upcoming.length));
  {const ng=upcoming.filter(e=>e.gold).length,b=chip("★ Yoğun ilgi",state.cat==="altin",()=>{state.cat=state.cat==="altin"?"hepsi":"altin";state.limit=60;render()},null,ng);b.classList.add("goldc");c.append(b)}
  for(const k in CATS){const n=upcoming.filter(e=>e.cat===k).length;if(n)c.append(chip(CATS[k],state.cat===k,()=>{state.cat=state.cat===k?"hepsi":k;state.limit=60;render()},`var(--c-${k})`,n))}
  const r=document.getElementById("ranges");r.innerHTML="";
  for(const k in RANGES){if(k==="yeni"&&!newCount)continue;r.append(chip(RANGES[k][0],state.range===k,()=>{state.range=k;state.limit=60;render()},null,k==="yeni"?newCount:null))}
  {const b=document.createElement("button");b.type="button";b.className="chip allv";b.innerHTML='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2 3h16v14H2zM2 8h16M2 12.5h16M7.3 3v14M12.7 3v14" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>Hepsini bir arada gör';b.onclick=openBoard;r.append(b)}
}
/* ---------- Mekân konumları (Google Haritalar yer kimliğiyle) ---------- */
/* Mekân konumları data/venues.json'dan gelir (sitenin ve tarayıcının ortak kaynağı) */
const VENUES={},ADDR={},ILCE={};for(const[n,v]of Object.entries(window.NVNY_VENUES||{})){if(!v.place)continue;VENUES[n]=[v.place,v.lat,v.lng];ADDR[v.place]=v.addr||"";if(v.ilce)ILCE[n]=v.ilce}
const addrOf=v=>VENUES[v]?ADDR[VENUES[v][0]]:"";
function mapURL(v){const p=VENUES[v];if(!p)return null;return`https://www.google.com/maps/search/?api=1&query=${p[1]},${p[2]}&query_place_id=${p[0]}`}
/* Bilet al → sitenin seans/satın alma bölümü, Etkinliği görüntüle → etkinlik bilgisi bölümü */
const FRAG={Biletix:["Etkinlikleri Listele","Etkinliğe Dair"],Biletinial:["Bilet ve Seanslar","HAKKINDA"],"Sanatçepte":["Lütfen almak istediğiniz tarihi seçiniz","Açıklama"]};
const goto=(x,i)=>{const f=FRAG[x.site];return f?x.url+"#:~:text="+encodeURIComponent(f[i]):x.url};
const SHORTM=["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
function otherDates(e){const n=normT(e.title.split(" · ")[0]);return E.filter(o=>o!==e&&o.venue===e.venue&&normT(o.title.split(" · ")[0])===n&&pd(o.d)>=today).map(o=>o.d).filter((v,i,a)=>a.indexOf(v)===i).sort().slice(0,8)}
function priceLine(e,st){
  if(st==="Tükendi")return"Bu tarih için biletler tükendi. Diğer tarihler ve iade biletleri için etkinlik sayfasına bakın.";
  if(st==="Ertelendi")return"Etkinlik ertelendi. Yeni tarih açıklandığında bilet sayfasında yer alacak.";
  if(st==="İptal edildi")return"Etkinlik iptal edildi. Bilet iadesi için biletin alındığı sitenin iade sayfasına bakın.";
  const k=e.tickets.filter(x=>x.price),stt=/\bDOB\b|\bDT\b|\bCSO\b|Devlet/.test(e.title+" "+e.venue)||e.tickets.some(x=>x.site==="Sanatçepte");
  if(e.tickets.length>1)return`${e.tickets.length} bilet sitesinde satışta.${k.length?" Gösterilen fiyat, o sitedeki en uygun kategori.":""}${stt?" Öğrenci ve öğretmene indirimli bilet var.":""}`;
  if(k.length)return`Gösterilen fiyat, ${k[0].site}'teki en uygun kategori; ${agoTxt(k[0].checked)} kontrol edildi.${stt?" Öğrenci ve öğretmene indirimli bilet var.":""}`;
  return`Güncel fiyat ve kategoriler bilet sitesinde.${stt?" Öğrenci ve öğretmene indirimli bilet var.":""}`;
}
/* ---------- Bilet ---------- */
/* Konuya en uygun çizim: türe, başlığa ve açıklamaya bakar */
function artOf(e){const s=((e.genre||"")+" "+e.title+" "+(e.desc||"")).toLocaleLowerCase("tr"),c=e.cat;
  if(c==="cocuk"&&/bale|dans/.test(s))return"bale";
  if(c==="cocuk"&&!/konser|orkestra|piyano|müzik dinle/.test(s))return"masal";
  if(/bilgi yarış|quiz|trivia/.test(s))return"quiz";
  if(/stand.?up|komedyen|doğaçlama|talk show/.test(s)||c==="standup")return"mikrofon";
  if(/yağlıboya|resim atölye|tuval|suluboya|boyama/.test(s))return"palet";
  if(/heykel|seramik|çömlek|kil /.test(s))return"comlek";
  if(/sinema atölye|film gösterim|gösterim|kısa film/.test(s)||c==="sinema")return"projektor";
  if(/söyleşi|panel|konferans|sohbet/.test(s))return"sohbet";
  if(/\bbale|ballet|coppelia|fındıkkıran|kuğu|dans tiyatrosu|modern dans/.test(s))return"bale";
  if(/opera|figaro|carmen|aria|lied|tosca|traviata|harem|gangster|operet/.test(s))return"opera";
  if(c==="tiyatro"||c==="sahne")return/müzikal/.test(s)?"nota":"maske";
  if(/piyano/.test(s))return"piyano";
  if(/senfoni|orkestra|\bcso\b|keman|viyolonsel|resital|oda müziği|klasik|flüt|arp|konçerto|filarmoni/.test(s))return"orkestra";
  if(/caz|jazz|blues|swing|saksafon/.test(s))return"caz";
  if(/türkü|halk müziği|bağlama|fasıl|türk sanat|\bthm\b|\btsm\b|saz|ozan|aşık/.test(s))return"baglama";
  if(/parti|disko|90'lar|80'ler|dans gecesi/.test(s)||c==="parti")return"disko";
  if(/rap|hip.?hop|elektronik|\bdj\b|techno|house|trap/.test(s))return"dj";
  if(/rock|metal|punk|grunge|gitar|indie|alternatif|akustik/.test(s))return"gitar";
  if(c==="festival")return"bayrak";
  if(c==="atolye")return"palet";
  return"nota"}
const fmtTL=n=>n.toLocaleString("tr-TR",{minimumFractionDigits:n%1?2:0,maximumFractionDigits:2})+" ₺";
function wxHTML(e){
  const f=forecast(e),d=pd(e.d);
  if(!e.t){const a=wxAt(e.d,14),b=wxAt(e.d,20);
    return`<div class="lbl">Etkinlik günü hava</div>
     <div class="wx"><svg viewBox="0 0 40 40" aria-hidden="true"><use href="#${ICON[a.k]}"/></svg><span class="t">${a.t}°</span></div>
     <div class="wxd">${a.forecast?a.txt:"Mevsim normali"}</div><div class="wxs">Gündüz ${a.t}° · Akşam ${b.t}°${b.forecast&&b.pop>=10?` · %${b.pop} yağış`:""}<br>Saati bilet sitesinde</div><div class="src">${a.forecast?a.src:"Mevsim normali"}</div>`}
  if(f.forecast){
    const pop=f.pop!=null&&f.pop>=10?` · %${f.pop} yağış`:"";
    return`<div class="lbl">${f.day?"Etkinlik günü hava":"Etkinlik saatinde hava"}</div>
     <div class="wx"><svg viewBox="0 0 40 40" aria-hidden="true"><use href="#${ICON[f.k]}"/></svg><span class="t">${f.t}°</span></div>
     <div class="wxd">${f.txt}</div><div class="wxs">${f.day?"Gündüz":`${f.slot} ${e.t}`}${pop}<br>Gün ${f.hi}° / ${f.lo}°</div><div class="src">${f.src}</div>`}
  const open=addDays(d,-15),when=open<=today?"":`${open.getDate()} ${AY[open.getMonth()]}`;
  return`<div class="lbl">Etkinlik saatinde beklenen</div>
   <div class="wx"><svg viewBox="0 0 40 40" aria-hidden="true"><use href="#i-thermo"/></svg><span class="t">${f.t}°</span></div>
   <div class="wxd">Mevsim normali</div><div class="wxs">${f.day?"Gündüz":`${f.slot} ${e.t}`}<br>Gün ${f.hi}° / ${f.lo}°</div><div class="src">${when?`Tahmin ${when} ile netleşir`:"Güncel tahmin şu an alınamadı"}</div>`;
}
function ticket(e){
  const d=pd(e.d),fav=favs.has(key(e)),dp=DEEP[e.cat];
  const st=e.status==="tukendi"?"Tükendi":e.status==="ertelendi"?"Ertelendi":e.status==="iptal"?"İptal edildi":"";
  const od=otherDates(e),addr=addrOf(e.venue),mu=mapURL(e.venue);
  const info=[["Adres",addr],["Süre",e.dur],["Yaş sınırı",e.age],["Kapı açılış",e.door],["Organizasyon",e.org],["Diğer tarihler",od.map(x=>{const q=pd(x);return`${q.getDate()} ${SHORTM[q.getMonth()]}`}).join(" · ")],["Bilet satışı",e.tickets.map(x=>x.site).join(", ")]].filter(r=>r[1]);
  const w=document.createElement("div");w.className="tkw"+(st?" off":"")+(e.gold?" gold":"");w.dataset.k=key(e);
  w.innerHTML=`<article class="tk" style="--c:var(--c-${e.cat})">
   <div class="ph" style="--d1:${dp[0]};--d2:${dp[1]}">${`<div class="grain"></div><svg class="art" viewBox="0 0 120 120" aria-hidden="true"><use href="#a-${artOf(e)}"/></svg>`}
     <span class="tag">${CATS[e.cat]}</span>${e.gold?'<span class="sash">★ Yoğun ilgi</span>':""}${st?`<span class="st">${st}</span>`:""}${!st&&(isNew(e)||dropOf(e))?`<span class="nb${dropOf(e)?" dr":""}">${dropOf(e)?`Fiyatı %${dropOf(e)} düştü`:"Yeni eklendi"}</span>`:""}
     <div class="stamp"><span class="dn">${d.getDate()}</span><span class="mw"><span class="mo">${AY[d.getMonth()]} ${d.getFullYear()}</span><span class="wd">${GUN[d.getDay()]}</span>${e.t?`<span class="tm">${e.t}</span>`:""}</span></div></div>
   <div class="body"><div class="strip"><span class="brand">Ne Var Ne Yok? · Ankara</span><span class="gn"></span></div>${e.gold?`<div class="goldbar"><b>★ Yoğun ilgi</b><span>${e.goldWhy.join(" · ")}</span></div>`:""}
     <div class="content">
       <div class="crumb"><span>${CATS[e.cat]}</span>${e.genre?`<i>›</i><span class="cg"></span>`:""}</div>
       <h3></h3>
       <div class="meta"><span><svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><rect x="2" y="3" width="12" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" stroke="currentColor" stroke-width="1.6"/></svg>${d.getDate()} ${SHORTM[d.getMonth()]} ${d.getFullYear()}${e.t?` · ${e.t}`:""}</span>${mu?`<a class="vlink" href="${mu}" target="_blank" rel="noopener"><svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M8 15s5-4.6 5-8.5A5 5 0 0 0 3 6.5C3 10.4 8 15 8 15z" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="8" cy="6.5" r="1.8" fill="currentColor"/></svg><span class="v"></span><small>Haritada aç ↗</small></a>`:`<span class="vlink plain"><span class="v"></span></span>`}</div>
       <p class="desc"></p>
       ${info.length?`<dl class="info">${info.map(()=>`<div><dt></dt><dd></dd></div>`).join("")}</dl>`:""}
       <div class="tixes">${e.tickets.map((x,i)=>`<div class="tix${i?" alt":""}"><div class="tl"><span class="ts">${x.site}${i===0&&e.tickets.filter(y=>y.price).length>1&&x.price?" · en uygun":""}</span>${st&&!i?`<span class="tp">${st}</span>`:x.price?`<span class="tp">${fmtTL(x.price)}<small class="den">'den</small></span><span class="te">${agoTxt(x.checked)} kontrol edildi</span>`:`<span class="tp nop">Fiyat sitede</span>`}</div>
          <div class="tb"><a class="b-buy" href="${goto(x,0)}" target="_blank" rel="noopener">${st&&!i?"Seanslara bak":"Bilet al"} ↗</a><a class="b-view" href="${goto(x,1)}" target="_blank" rel="noopener">Etkinliği görüntüle</a></div></div>`).join("")}</div>
       <div class="foot"><span class="pnote"></span><button class="fav" type="button" aria-pressed="${fav}">${fav?"♥ Kaydedildi":"♡ Kaydet"}</button></div></div></div>
   <div class="stub">${wxHTML(e)}</div></article>`;
  {const h=w.querySelector("h3");h.textContent=e.title;h.tabIndex=0;h.setAttribute("role","button");h.title="Ayrıntılar";h.onclick=()=>openDetail(e);h.onkeydown=ev=>{if(ev.key==="Enter")openDetail(e)};hl(h,state.q)}w.querySelectorAll(".v").forEach(v=>v.textContent=e.venue);
  w.querySelector(".desc").textContent=e.desc||`${e.venue} sahnesinde ${CATS[e.cat].toLocaleLowerCase("tr")} etkinliği. Program, kadro ve kurallar için etkinlik sayfasına göz atın.`;
  w.querySelector(".gn").textContent=e.tickets.map(x=>x.site).join(" · ");const cg=w.querySelector(".cg");if(cg)cg.textContent=e.genre;
  w.querySelectorAll(".info>div").forEach((r,i)=>{r.querySelector("dt").textContent=info[i][0];r.querySelector("dd").textContent=info[i][1]});
  w.querySelector(".pnote").textContent=(e.note?e.note+". ":"")+priceLine(e,st);
  w.querySelector(".fav").onclick=ev=>{const k=key(e);favs.has(k)?favs.delete(k):favs.add(k);saveFavs();const b=ev.currentTarget,on=favs.has(k);b.setAttribute("aria-pressed",on);b.textContent=on?"♥ Kaydedildi":"♡ Kaydet";if(state.range==="fav")render()};
  return w;
}
let shown=0;
function filterList(){const q=state.q.trim();
  return upcoming.filter(e=>{const d=pd(e.d);
    if(state.cat==="altin"?!e.gold:(state.cat!=="hepsi"&&e.cat!==state.cat))return false;
    if(state.range==="fav"){if(!favs.has(key(e)))return false}else if(state.range==="yeni"){if(!isNew(e))return false}else if(!RANGES[state.range][1](d))return false;
    if(state.venue!=="all"&&e.venue!==state.venue)return false;
    if(state.ilce!=="all"&&ilceOf(e.venue)!==state.ilce)return false;
    if(state.site!=="all"&&!e.tickets.some(x=>x.site===state.site))return false;
    if(state.price==="known"&&!e.price)return false;
    if(state.price.includes("-")){const[a,b]=state.price.split("-").map(Number);if(!e.price||e.price<a||e.price>=b)return false}
    const ageN=parseInt(e.age)||0;
    if(state.age==="kid"&&!(e.cat==="cocuk"||(ageN&&ageN<=7)))return false;
    if(state.age==="adult"&&ageN<18)return false;
    return!q||matchQ(e,q)}).sort((a,b)=>(a.d+(a.t||"99")).localeCompare(b.d+(b.t||"99")))}
/* ---------- Hepsi bir arada: seçili zamandaki tüm etkinlikler tek büyük takvim tablosunda ---------- */
function openBoard(){const bd=document.getElementById("board"),list=filterList();
  const rl=RANGES[state.range][0].replace(/^[♥✦] /,"");
  bd.querySelector("h2").textContent=state.range==="hepsi"?"Tüm etkinlikler":rl;
  const g=bd.querySelector(".bd-grid");g.innerHTML="";
  if(!list.length){bd.querySelector(".rng").textContent="Etkinlik yok";g.style.setProperty("--cols",1);g.innerHTML='<p class="empty">Bu seçimde gösterilecek etkinlik yok.</p>'}
  else{
    const f=pd(list[0].d),l=pd(list[list.length-1].d),fmt=d=>`${d.getDate()} ${AY[d.getMonth()]}`;
    bd.querySelector(".rng").textContent=`${fmt(f)} – ${fmt(l)} · ${list.length} etkinlik`+(state.cat==="altin"?" · ★ Yoğun ilgi":state.cat!=="hepsi"?` · ${CATS[state.cat]}`:"");
    const wk=state.range==="sonu"?[5,6,0]:[1,2,3,4,5,6,0];g.style.setProperty("--cols",wk.length);
    const byDay={};list.forEach(e=>(byDay[e.d]||(byDay[e.d]=[])).push(e));
    const ds=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const start=addDays(f,-((f.getDay()+6)%7)),end=addDays(l,(7-l.getDay())%7);
    const wdRow=()=>wk.forEach(w=>{const h=document.createElement("div");h.className="bd-wd";h.textContent=GUN[w];g.append(h)});
    let lastM=-1;
    for(let wkS=start;wkS<=end;wkS=addDays(wkS,7)){
      const days=[...Array(7)].map((_,i)=>addDays(wkS,i)).filter(d=>wk.includes(d.getDay()));
      const firstReal=days.find(d=>d>=f&&d<=l);const m=(firstReal||days[0]).getMonth();
      if(m!==lastM){const mh=document.createElement("div");mh.className="bd-month";mh.innerHTML=`<span>${AY[m]}</span><small>${(firstReal||days[0]).getFullYear()}</small>`;g.append(mh);wdRow();lastM=m}
      for(const d of days){const k=ds(d),evs=byDay[k]||[],cell=document.createElement("div"),inR=d>=today&&(!RANGES[state.range][1]||RANGES[state.range][1](d));
        cell.className="bd-c"+([0,6].includes(d.getDay())?" we":"")+(!inR||d<f||d>l?" out":"")+(+d===+today?" today":"")+(evs.length?"":" none");
        cell.innerHTML=`<div class="bd-dh"><span class="dn">${d.getDate()}</span><span class="dm"><b class="wdm">${GUN[d.getDay()]} · </b>${AY[d.getMonth()]}</span>${+d===+today?'<span class="bdg">Bugün</span>':""}${evs.length?`<span class="n">${evs.length}</span>`:""}</div>`;
        for(const e of evs){const b=document.createElement("button");b.type="button";b.className="bi"+(e.status?" off":"")+(e.gold?" gold":"");b.style.setProperty("--c",`var(--c-${e.cat})`);b.innerHTML=`<span class="bt">${e.t||"·"}</span><span class="bn"></span>`;b.querySelector(".bn").textContent=e.title;b.title=`${e.title} · ${e.venue}${e.price?" · "+fmtTL(e.price):""}`;b.onclick=()=>jumpTo(e);cell.append(b)}
        g.append(cell)}}}
  const lg=bd.querySelector(".bd-legend");lg.innerHTML="";[...new Set(list.map(e=>e.cat))].forEach(c=>lg.insertAdjacentHTML("beforeend",`<span style="--c:var(--c-${c})"><i></i>${CATS[c]}</span>`));
  if(!bd.classList.contains("on"))lockScroll(1);bd.classList.add("on");bd.scrollTop=0;bd.querySelector(".bd-close").focus({preventScroll:true})}
function closeBoard(){const bd=document.getElementById("board");if(bd.classList.contains("on")){bd.classList.remove("on");lockScroll(-1)}}
/* Kaydırma kilidi: pano ve ayrıntı penceresi aynı anda açılsa da tutarlı kalsın */
let scrollLocks=0;function lockScroll(n){scrollLocks=Math.max(0,scrollLocks+n);document.documentElement.style.overflow=scrollLocks?"hidden":""}
function jumpTo(e){closeBoard();const L=filterList(),i=L.findIndex(x=>key(x)===key(e));if(state.sort!=="date"){state.sort="date";document.getElementById("fSort").value="date"}
  if(i>=state.limit)state.limit=Math.ceil((i+1)/60)*60;render();
  const el=document.querySelector(`.tkw[data-k="${CSS.escape(key(e))}"]`);if(!el)return;
  const go=()=>{const bh=document.querySelector(".bar").offsetHeight;scrollTo({top:el.getBoundingClientRect().top+scrollY-bh-16,behavior:"instant"})};
  go();requestAnimationFrame(()=>{go();requestAnimationFrame(go)});setTimeout(go,120);
  document.querySelectorAll(".tkw.flash").forEach(x=>x.classList.remove("flash"));el.classList.add("flash");setTimeout(()=>el.classList.remove("flash"),3200)}
addEventListener("keydown",ev=>{if(ev.key==="Escape"&&document.getElementById("board").classList.contains("on"))closeBoard()});
function render(){
  drawChips();
  let list=filterList();
  const byDate=(a,b)=>(a.d+(a.t||"99")).localeCompare(b.d+(b.t||"99"));
  if(state.sort==="date")list.sort(byDate);else{const s=state.sort==="pa"?1:-1;list.sort((a,b)=>(a.price==null)-(b.price==null)||s*((a.price||0)-(b.price||0))||byDate(a,b))}
  shown=list.length;const main=document.getElementById("main");main.innerHTML="";
  const full=list;list=list.slice(0,state.limit);
  if(!list.length)main.innerHTML=`<p class="empty">${NVD.failed?"Etkinlik listesi şu an yüklenemedi. İnternet bağlantını kontrol edip sayfayı yenile.":state.range==="fav"&&!favs.size?"Henüz kaydettiğiniz bilet yok. Bir biletteki ♡ Kaydet düğmesine dokunduğunuzda burada görünür.":"Bu filtrelere uyan etkinlik yok. Aramayı silin ya da başka bir zaman aralığı seçin."}</p>`;if(!list.length&&state.q)suggest(main);
  let curP=null,curD=null,box=null,sec=null,cnt=0,cntEl=null;
  const flat=state.sort!=="date";
  for(const e of list){const d=pd(e.d),p=flat?{k:"x",title:state.sort==="pa"?"En uygun fiyatlılar":"En yüksek fiyatlılar",rng:`${shown} etkinlik`}:period(d);
    if(p.k!==curP){curP=p.k;curD=null;cnt=0;sec=document.createElement("section");sec.className="period";sec.innerHTML=`<div class="period-h"><h2>${p.title}</h2><span class="rng">${p.rng}</span><span class="cnt"></span></div>`;main.append(sec);cntEl=sec.querySelector(".cnt")}
    if(e.d!==curD){curD=e.d;const diff=Math.round((d-today)/864e5),rel=diff===0?"Bugün":diff===1?"Yarın":diff<7?`${diff} gün sonra`:"";
      const h=document.createElement("div");h.className="day-h";h.innerHTML=`${rel?`<span class="rel${diff>1?" plain":""}">${rel}</span>`:""}<span>${GUN[d.getDay()]}, ${d.getDate()} ${AY[d.getMonth()]}</span>`;sec.append(h);
      box=document.createElement("div");box.className="tickets";sec.append(box)}
    box.append(ticket(e));cnt++;cntEl.textContent=`${cnt} etkinlik`}
  drawActive();
  if(full.length>list.length){const b=document.createElement("button");b.className="more";b.type="button";b.textContent=`Daha fazla göster · ${full.length-list.length} etkinlik daha`;b.onclick=()=>{state.limit+=60;render()};main.append(b)}
}
document.getElementById("q").addEventListener("input",e=>{state.q=e.target.value;state.limit=60;render()});
(()=>{const ss=document.getElementById("fSite");if(ss){ss.innerHTML='<option value="all">Hepsi</option>';const n={};upcoming.forEach(e=>e.tickets.forEach(x=>n[x.site]=(n[x.site]||0)+1));Object.keys(n).sort((a,b)=>n[b]-n[a]).forEach(k=>{const o=document.createElement("option");o.value=k;o.textContent=`${k} (${n[k]})`;ss.append(o)})}})();
(()=>{const vs=[...new Set(upcoming.map(e=>e.venue))].sort((a,b)=>a.localeCompare(b,"tr"));const s=document.getElementById("fVenue");vs.forEach(v=>{const o=document.createElement("option");o.value=o.textContent=v;s.append(o)});
  [["fPrice","price"],["fVenue","venue"],["fIlce","ilce"],["fAge","age"],["fSite","site"],["fSort","sort"]].forEach(([id,k])=>document.getElementById(id).addEventListener("change",ev=>{state[k]=ev.target.value;state.limit=60;render()}))})();
let rt,lw=innerWidth;addEventListener("resize",()=>{if(innerWidth===lw)return;lw=innerWidth;clearTimeout(rt);rt=setTimeout(()=>{skySize();tick();render()},200)});

/* ---------- Akıllı arama: Türkçe harf toleransı + küçük yazım hataları ---------- */
const fold=s=>(s||"").toLocaleLowerCase("tr").replace(/[ıi̇]/g,"i").replace(/ğ/g,"g").replace(/ü/g,"u").replace(/ş/g,"s").replace(/ö/g,"o").replace(/ç/g,"c").replace(/â/g,"a").replace(/[^a-z0-9 ]+/g," ");
function lev1(a,b,max){if(Math.abs(a.length-b.length)>max)return false;const m=a.length,n=b.length;let prev=Array.from({length:n+1},(_,j)=>j);for(let i=1;i<=m;i++){const cur=[i];let best=i;for(let j=1;j<=n;j++){cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));best=Math.min(best,cur[j])}if(best>max)return false;prev=cur}return prev[n]<=max}
function hay(e){if(!e._h){e._h=fold([e.title,e.venue,e.genre,e.org,e.desc,CATS[e.cat],ilceOf(e.venue)].join(" "));e._w=[...new Set(e._h.split(" ").filter(w=>w.length>2))]}return e._h}
function matchQ(e,q){const h=hay(e);return fold(q).split(" ").filter(Boolean).every(tk=>h.includes(tk)||(tk.length>=4&&e._w.some(w=>lev1(tk,w.slice(0,tk.length+1),tk.length>=7?2:1)||lev1(tk,w,tk.length>=7?2:1))))}
function hl(el,q){const f=fold(q).trim();if(f.length<2)return;const txt=el.textContent,ft=fold(txt);const tks=f.split(" ").filter(x=>x.length>1);let html="",i=0;const marks=[];
  tks.forEach(tk=>{let k=ft.indexOf(tk);while(k>=0){marks.push([k,k+tk.length]);k=ft.indexOf(tk,k+tk.length)}});if(!marks.length)return;marks.sort((a,b)=>a[0]-b[0]);
  const esc=s=>s.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"})[c]);for(const[a,b]of marks){if(a<i)continue;html+=esc(txt.slice(i,a))+"<mark>"+esc(txt.slice(a,b))+"</mark>";i=b}el.innerHTML=html+esc(txt.slice(i))}
function suggest(main){const tks=fold(state.q).split(" ").filter(x=>x.length>2);const sc=upcoming.map(e=>{hay(e);let s=0;tks.forEach(tk=>{if(e._w.some(w=>w.startsWith(tk.slice(0,3))))s++});return[s,e]}).filter(x=>x[0]>0).sort((a,b)=>b[0]-a[0]).slice(0,6);
  if(!sc.length)return;const d=document.createElement("div");d.className="sugg";d.innerHTML="<b>Belki bunlardan biri?</b>";sc.forEach(([,e])=>{const b=document.createElement("button");b.type="button";b.textContent=`${e.title} · ${pd(e.d).getDate()} ${AY[pd(e.d).getMonth()]}`;b.onclick=()=>openDetail(e);d.append(b)});main.append(d)}
/* ---------- İlçe (adresten) ---------- */
const ILCELER=["Çankaya","Altındağ","Yenimahalle","Keçiören","Etimesgut","Mamak","Sincan","Gölbaşı","Pursaklar","Polatlı","Beypazarı"];
function ilceOf(v){if(ILCE[v])return ILCE[v];const a=addrOf(v)||"";for(const i of ILCELER)if(a.includes(i)||v.includes(i))return i;return/Etimesgut|Korkut Ata/.test(v)?"Etimesgut":/Bilkent|Kızılay|Kavaklıdere|Panora|Tunalı|CerModern|Atatürk Sanat/.test(v)?"Çankaya":""}
(()=>{const s=document.getElementById("fIlce");if(!s)return;const n={};upcoming.forEach(e=>{const i=ilceOf(e.venue);if(i)n[i]=(n[i]||0)+1});Object.keys(n).sort((a,b)=>n[b]-n[a]).forEach(i=>{const o=document.createElement("option");o.value=i;o.textContent=`${i} (${n[i]})`;s.append(o)})})();
/* ---------- Seçili filtreler + temizle ---------- */
function drawActive(){const box=document.getElementById("actf");if(!box)return;const L=[],lab=(id)=>{const s=document.getElementById(id);return s?s.options[s.selectedIndex].text:""};
  if(state.q)L.push([`“${state.q}”`,()=>{state.q="";document.getElementById("q").value=""}]);
  if(state.cat!=="hepsi")L.push([state.cat==="altin"?"★ Yoğun ilgi":CATS[state.cat],()=>state.cat="hepsi"]);
  if(state.range!=="hepsi")L.push([RANGES[state.range][0].replace(/^[♥✦] /,""),()=>state.range="hepsi"]);
  [["price","fPrice","all"],["venue","fVenue","all"],["ilce","fIlce","all"],["age","fAge","all"],["site","fSite","all"]].forEach(([k,id,def])=>{if(state[k]!==def)L.push([lab(id),()=>{state[k]=def;document.getElementById(id).value=def}])});
  box.innerHTML="";if(!L.length)return;const sp=document.createElement("span");sp.className="al";sp.textContent=`${shown} etkinlik · seçili filtreler:`;box.append(sp);
  L.forEach(([t,f])=>{const b=document.createElement("button");b.type="button";b.className="af";b.innerHTML=`<span></span> <i aria-hidden="true">✕</i>`;b.firstChild.textContent=t;b.setAttribute("aria-label",t+" filtresini kaldır");b.onclick=()=>{f();state.limit=60;render()};box.append(b)});
  const c=document.createElement("button");c.type="button";c.className="aclr";c.textContent="Tümünü temizle";c.onclick=()=>{Object.assign(state,{cat:"hepsi",range:"hepsi",q:"",price:"all",venue:"all",ilce:"all",age:"all",site:"all",limit:60});document.getElementById("q").value="";["fPrice","fVenue","fIlce","fAge","fSite"].forEach(id=>document.getElementById(id).value="all");render()};box.append(c)}
/* ---------- Ayrıntı sayfası (paylaşılabilir bağlantı: #e/…) ---------- */
const sheet=document.getElementById("sheet"),sheetB=document.getElementById("sheetB");
const slug=e=>e.d+"-"+fold(e.title).trim().replace(/\s+/g,"-").slice(0,48);
/* Geçmiş: pencere açılınca bir adım eklenir (pushState); telefonun "geri" tuşu pencereyi kapatır, siteden çıkarmaz */
const isSheetHash=h=>h.startsWith("#e/")||h.startsWith("#s/");
let sheetPushed=false;
function clearHash(){if(isSheetHash(location.hash))history.replaceState(null,"",location.pathname+location.search)}
function closeSheet(){if(sheet.open)sheet.close()}
sheet.querySelector(".sh-x").onclick=closeSheet;sheet.addEventListener("click",ev=>{if(ev.target===sheet)closeSheet()});
sheet.addEventListener("close",()=>{lockScroll(-1);if(sheetPushed){sheetPushed=false;if(isSheetHash(location.hash))history.back()}else clearHash()});
function showSheet(html,hash){sheetB.innerHTML="";if(typeof html==="string")sheetB.innerHTML=html;else sheetB.append(html);
  if(!sheet.open){sheet.showModal();lockScroll(1)}sheetB.scrollTop=0;
  if(hash&&location.hash!==hash){if(isSheetHash(location.hash))history.replaceState(null,"",hash);else{history.pushState({nvny:1},"",hash);sheetPushed=true}}}
addEventListener("popstate",()=>{if(!isSheetHash(location.hash)&&sheet.open){sheetPushed=false;sheet.close()}else if(isSheetHash(location.hash))fromHash()});
function openDetail(e){const d=pd(e.d),w=document.createElement("div");w.className="det";
  const same=upcoming.filter(x=>x!==e&&normT(x.title)===normT(e.title)).slice(0,12);
  const rows=[["Tarih",`${d.getDate()} ${AY[d.getMonth()]} ${d.getFullYear()}, ${GUN[d.getDay()]}`],["Saat",e.t||"Saati bilet sitesinde"],["Mekân",e.venue],["Adres",addrOf(e.venue)],["İlçe",ilceOf(e.venue)],["Tür",[CATS[e.cat],e.genre].filter(Boolean).join(" · ")],["Süre",e.dur],["Yaş sınırı",e.age],["Kapı açılış",e.door],["Organizasyon",e.org],["Bilgi",e.note]].filter(r=>r[1]);
  w.innerHTML=`<div class="det-hd" style="--c:var(--c-${e.cat})"><svg class="art" viewBox="0 0 120 120" aria-hidden="true"><use href="#a-${artOf(e)}"/></svg><div><span class="tag">${CATS[e.cat]}</span>${e.gold?'<span class="tag g">★ Yoğun ilgi</span>':""}<h2 id="sheetT"></h2><p class="dd"></p></div></div>
   <dl class="det-dl">${rows.map(()=>"<div><dt></dt><dd></dd></div>").join("")}</dl>
   <h3>Biletler</h3><div class="det-t"></div><p class="det-n"></p>
   <h3>Hava</h3><div class="det-w stub">${wxHTML(e)}</div>
   ${same.length?`<h3>Diğer tarihler</h3><div class="det-o"></div>`:""}
   <div class="det-f"><button type="button" class="shr">Bağlantıyı paylaş</button><button type="button" class="fv"></button>${mapURL(e.venue)?`<a class="mp" target="_blank" rel="noopener" href="${mapURL(e.venue)}">Haritada aç ↗</a>`:""}</div>
   <p class="det-c">Son kontrol: ${e.checked?new Date(e.checked).toLocaleString("tr-TR",{day:"numeric",month:"long",hour:"2-digit",minute:"2-digit"}):(NVD.updated?new Date(NVD.updated).toLocaleString("tr-TR",{day:"numeric",month:"long",hour:"2-digit",minute:"2-digit"}):"—")} · Fiyat ve seanslar satış sitesinde değişebilir.</p>`;
  w.querySelector("h2").textContent=e.title;w.querySelector(".dd").textContent=e.desc||"";
  w.querySelectorAll(".det-dl>div").forEach((r,i)=>{r.querySelector("dt").textContent=rows[i][0];r.querySelector("dd").textContent=rows[i][1]});
  const tb=w.querySelector(".det-t");e.tickets.forEach(x=>{const r=document.createElement("div");r.className="dt-row";r.innerHTML=`<span class="s"></span><span class="p">${x.price?fmtTL(x.price)+`<small> 'den · ${agoTxt(x.checked)} kontrol edildi</small>`:`<small>Güncel fiyat sitede</small>`}</span><a class="b-buy" target="_blank" rel="noopener" href="${goto(x,0)}">Bilet al ↗</a>`;r.querySelector(".s").textContent=x.site;tb.append(r)});
  w.querySelector(".det-n").textContent=priceLine(e,e.status==="tukendi"?"Tükendi":e.status==="ertelendi"?"Ertelendi":e.status==="iptal"?"İptal edildi":"");
  const o=w.querySelector(".det-o");if(o)same.forEach(x=>{const b=document.createElement("button");b.type="button";const dx=pd(x.d);b.textContent=`${dx.getDate()} ${AY[dx.getMonth()].slice(0,3)} ${x.t||""}`;b.onclick=()=>openDetail(x);o.append(b)});
  const fv=w.querySelector(".fv"),k=key(e),sf=()=>{const on=favs.has(k);fv.textContent=on?"♥ Kaydedildi":"♡ Kaydet";fv.setAttribute("aria-pressed",on)};sf();fv.onclick=()=>{favs.has(k)?favs.delete(k):favs.add(k);saveFavs();sf()};
  w.querySelector(".shr").onclick=async()=>{const u=location.href.split("#")[0]+"#e/"+slug(e);try{if(navigator.share){await navigator.share({title:e.title,text:`${e.title} · ${e.venue}`,url:u});return}await navigator.clipboard.writeText(u);toast("Bağlantı kopyalandı")}catch(_){}};
  showSheet(w,"#e/"+slug(e))}
/* ---------- Bilgi sayfaları ---------- */
const PAGES={hakkinda:["Hakkında",`<p><b>Ne Var Ne Yok? Ankara</b>, Ankara'da yapılacak konser, tiyatro, stand-up, opera, bale, çocuk etkinliği, festival, parti ve atölyeleri tek sayfada toplayan bağımsız bir etkinlik rehberidir.</p><p>Bilet satmıyoruz. Her etkinlikte, bileti satan sitelerin hepsi fiyatlarıyla yan yana gösterilir; “Bilet al” düğmesi seni doğrudan o sitenin satış sayfasına götürür. Satın alma, iade ve değişiklik işlemleri ilgili bilet sitesinin kurallarına tabidir.</p><p><b>Yoğun ilgi</b> işareti, bilet sitelerindeki verilere dayanır: tükenen seans, çok sayıda seans, büyük salon ve birden fazla sitede satış gibi işaretlerden en az ikisi bulunan etkinliklere verilir. Kimse bu işaret için ödeme yapmaz.</p>`],
 kaynaklar:["Veri kaynakları ve güncelleme",`<p>Etkinlikler bilet sitelerinin, kurumların, mekânların ve belediyelerin herkese açık sayfalarından toplanır. Şu an taranan kaynaklar: <span class="srcl"></span></p><p>Toplama her sabah yeniden yapılır; öğleden sonra da bilinen etkinliklerin fiyat ve satış durumu bir kez daha kontrol edilir. Bir site o gün okunamazsa son doğrulanmış bilgisi korunur. Tarihi geçen etkinlikler kendiliğinden kaldırılır. Elle eklenen etkinlikler de aynı listeye katılır.</p><p>Gösterilen fiyat, o sitede listelenen en uygun kategoridir. Fiyat, seans ve satış durumu satış sitesinde değişebilir; satın almadan önce bilet sayfasını kontrol et.</p><p><b>Hava durumu</b> Open-Meteo'dan anlık alınır; 16 günden ileri tarihlerde mevsim normali gösterilir ve öyle etiketlenir. Mekân konumları Google Haritalar'a bağlanır.</p><p class="upd2"></p>`],
 gizlilik:["Gizlilik",`<p>Bu site hesap açtırmaz, form doldurtmaz ve kişisel veri toplamaz. Çerez ya da reklam takibi kullanmaz.</p><p>Kaydettiğin etkinlikler, tema tercihin ve girişi bir kez izlediğin bilgisi yalnızca kendi tarayıcında (yerel depolama) saklanır; sunucuya gönderilmez. Tarayıcı verilerini silerek bunları kaldırabilirsin.</p><p>Hava durumu için tarayıcın Open-Meteo'ya Ankara'nın sabit koordinatlarıyla istek gönderir; senin konumun gönderilmez. Bilet sitelerine ve Google Haritalar'a gittiğinde o sitelerin kendi gizlilik kuralları geçerlidir.</p>`],
 kosullar:["Kullanım koşulları",`<p>Bu site bilgilendirme amaçlıdır. Etkinlik bilgileri bilet sitelerinden otomatik toplanır; doğruluğu için özen gösterilir ama tarih, saat, fiyat ve satış durumunda değişiklik olabilir. Kesin bilgi her zaman etkinliğin satıldığı sitededir.</p><p>Bilet satın alma işlemleri bu sitede değil, bağlantı verilen bilet sitelerinde yapılır; o işlemlerden ilgili site sorumludur. Etkinlik adları ve markalar sahiplerine aittir; etkinlik görselleri site tarafından çizilmiş temsili çizimlerdir.</p>`],
 iletisim:["İletişim",""]};
function openPage(k){const[ttl,html]=PAGES[k];const w=document.createElement("div");w.className="pg";w.innerHTML=`<h2 id="sheetT"></h2>${html}`;w.querySelector("h2").textContent=ttl;
  if(k==="iletisim"){const L=[];if(SITE.contact)L.push(`E-posta: <a href="mailto:${SITE.contact}">${SITE.contact}</a>`);if(SITE.instagram)L.push(`Instagram: <a href="https://instagram.com/${SITE.instagram}" target="_blank" rel="noopener">@${SITE.instagram}</a>`);
    if(SITE.repo)L.push(`Hata bildirimi ve etkinlik önerisi: <a href="https://github.com/${SITE.repo}/issues/new" target="_blank" rel="noopener">GitHub üzerinden yaz</a>`);
    w.insertAdjacentHTML("beforeend",`<p>Öneri, düzeltme ya da eklenmesini istediğin bir etkinlik için bize ulaş.</p>${L.length?`<p>${L.join("<br>")}</p>`:"<p>İletişim bilgileri yakında burada olacak.</p>"}`)}
  const sl=w.querySelector(".srcl");if(sl){const S=(NVD.sources||[]).filter(s=>s.ok).map(s=>s.name);sl.textContent=S.length?S.join(", ")+".":"Biletix, Biletinial, Sanatçepte, tiyatrolar.com.tr, Bilkent Bilet, iTicket, Bubilet."}
  const u=w.querySelector(".upd2");if(u)u.textContent=updText();showSheet(w,"#s/"+k)}
document.querySelectorAll(".flinks button").forEach(b=>b.onclick=()=>openPage(b.dataset.p));
/* ---------- Güncellik ---------- */
function updText(){if(!NVD.updated)return"";const u=new Date(NVD.updated),h=(Date.now()-u)/36e5;return`Etkinlikler son güncelleme: ${u.toLocaleString("tr-TR",{day:"numeric",month:"long",hour:"2-digit",minute:"2-digit"})}${h>30?" · Bu veri bir günden eski; fiyat ve seansları bilet sitesinde kontrol et.":""}`}
{const u=document.getElementById("upd");if(u)u.textContent=updText()}
/* ---------- Bağlantıdan açılış ---------- */
function fromHash(){const h=decodeURIComponent(location.hash);if(h.startsWith("#e/")){const e=upcoming.find(x=>slug(x)===h.slice(3));if(e)openDetail(e)}else if(h.startsWith("#s/")&&PAGES[h.slice(3)])openPage(h.slice(3))}
addEventListener("hashchange",()=>{if(isSheetHash(location.hash))fromHash()});
/* Eski sürümden kalmış olabilecek service worker'ı kaldır: veri her zaman ağdan taze gelsin */
if("serviceWorker"in navigator)navigator.serviceWorker.getRegistrations?.().then(r=>r.forEach(x=>x.unregister())).catch(()=>{});
/* Instagram bağlantısı (index.html'deki NVNY_SITE.instagram doluysa) */
if(SITE.instagram){const n=document.querySelector(".flinks");if(n){const a=document.createElement("a");a.href=`https://instagram.com/${SITE.instagram}`;a.target="_blank";a.rel="noopener";a.textContent="Instagram ↗";a.className="iglink";n.append(a)}}

/* ---------- GİRİŞ: NE VAR NE Y_K belirir → soru işareti Pixar gibi zıplayarak gelip Y ile K arasına girer → büyüteç gelip onu yakalar → sayfa ---------- */
const QSV='<svg viewBox="0 0 40 60"><path d="M8 17a12 12 0 1 1 16.8 11c-3.2 1.4-5.3 4-5.3 7.8V39" fill="none" stroke="currentColor" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="19.5" cy="51" r="5" fill="currentColor"/></svg>';
function hopFrames(pts,h,FLY=470,ANT=220,SET=260){const K=[];let tm=0;const add=(x,y,sx,sy,r,ez)=>K.push({tm,ez,tf:`translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${r.toFixed(1)}deg) scale(${sx},${sy})`});
  add(pts[0][0],pts[0][1],1,1,0,"ease-in");
  for(let k=0;k<pts.length-1;k++){const a=pts[k],b=pts[k+1],dir=b[0]>=a[0]?1:-1,hh=h*(k===pts.length-2?.8:1);const t0=tm;
    tm=t0+ANT*.8;add(a[0],a[1],1.3,.68,-dir*7,"ease-out");
    tm=t0+ANT;add(a[0],a[1]-2,.76,1.32,dir*9,"linear");
    for(let s=.125;s<.99;s+=.125){const e=Math.abs(.5-s)*2;tm=t0+ANT+FLY*s;add(a[0]+(b[0]-a[0])*s,a[1]+(b[1]-a[1])*s-4*hh*s*(1-s),1-.2*e,1+.24*e,dir*(9-18*s),"linear")}
    tm=t0+ANT+FLY;add(b[0],b[1],1.4,.6,0,"ease-out");tm+=140;add(b[0],b[1],.88,1.14,0,"ease-in-out");tm+=120;add(b[0],b[1],1.05,.96,0,"ease-in-out");tm=t0+ANT+FLY+SET;add(b[0],b[1],1,1,0,"ease-in-out")}
  const T=tm;return{dur:T,kf:K.map(f=>({transform:f.tf,offset:Math.min(1,f.tm/T),easing:f.ez}))}}
var spAnims=window.spAnims=[],spTimers=window.spTimers=[];
function introLogo(){const sp=document.getElementById("splash");if(!sp||spLeft)return;
  const svg=sp.querySelector(".sp-logo .O svg"),lq=svg.querySelector(".lq"),ring=[...svg.children].filter(c=>c.tagName!=="defs"&&!c.classList.contains("lq"));
  const quick=sp.classList.contains("quick"),rm=matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(rm){svg.style.opacity=1;return}
  const r=svg.getBoundingClientRect(),z=r.width*.3,tx=r.left+r.width*.355-.2*z,ty=r.top+r.height*.26-.125*z;  // soru işaretinin mercekteki yeri
  const q=document.createElement("div");q.className="sp-q";q.style.width=z+"px";q.style.height=z*1.5+"px";q.innerHTML=QSV;sp.append(q);
  // zıplama rotası: ekranın sağ altından girer, büyüklü küçüklü zıplayarak harflerin arasına
  const W=innerWidth,base=ty+r.height*.55,n=quick?2:3,pts=[[W+z*2,base]];
  for(let k=1;k<n;k++){const f=k/n;pts.push([W+z*2-(W+z*2-tx)*f*(.95+.05*k/n),base-(k%2?r.height*.1:0)])}
  pts.push([tx,ty]);
  const H=Math.max(r.height*.9,70),hp=hopFrames(pts,H);
  const a1=q.animate(hp.kf,{duration:hp.dur,fill:"forwards"});spAnims.push(a1);
  a1.onfinish=()=>{ // yerine oturdu: biraz bekler, çevresine bakınır
    const w=q.animate([{transform:`translate(${tx}px,${ty}px) rotate(0)`},{transform:`translate(${tx}px,${ty}px) rotate(-10deg)`},{transform:`translate(${tx}px,${ty}px) rotate(8deg)`},{transform:`translate(${tx}px,${ty}px) rotate(0)`}],{duration:520,easing:"ease-in-out",fill:"forwards"});spAnims.push(w);
    // büyüteç sağ üstten dönerek gelir ve O olur
    svg.style.opacity=1;lq.style.opacity=0;
    const ra=ring.map(el=>{el.style.transformBox="view-box";el.style.transformOrigin="44px 44px";
      const a=el.animate([{transform:"translate(160px,-150px) rotate(220deg) scale(.55)",opacity:0},{opacity:1,offset:.25},{transform:"translate(-6px,4px) rotate(-14deg) scale(1.12)",offset:.78},{transform:"translate(0,0) rotate(0) scale(1)",opacity:1}],{duration:quick?560:820,delay:quick?120:300,easing:"cubic-bezier(.3,.9,.35,1)",fill:"both"});spAnims.push(a);return a});
    ra[0].onfinish=()=>{ // yakaladı!
      q.remove();lq.style.opacity=1;
      spAnims.push(svg.animate([{transform:"scale(1.18)"},{transform:"scale(.94)"},{transform:"scale(1.04)"},{transform:"scale(1)"}],{duration:560,easing:"ease-out"}));
      spAnims.push(lq.animate([{transform:"scale(1.3,.7)"},{transform:"scale(.9,1.12)"},{transform:"scale(1)"}],{duration:420,easing:"ease-out"}));
      spTimers.push(setTimeout(leaveSplash,quick?650:1100))}}}
function startIntro(){const sp=document.getElementById("splash");if(!sp){document.documentElement.classList.remove("spl");introDone();return}
  const go=()=>{if(sp.classList.contains("go"))return;sp.classList.add("go");
    const quick=sp.classList.contains("quick");spTimers.push(setTimeout(introLogo,quick?700:4350));spTimers.push(setTimeout(leaveSplash,quick?6000:12000))};
  // yazı tipleri ve ilk çizim bitince başla (takılma olmasın), en fazla 900 ms bekle
  Promise.race([document.fonts?document.fonts.ready:Promise.resolve(),new Promise(r=>setTimeout(r,900))]).then(()=>requestAnimationFrame(()=>requestAnimationFrame(go)))}
render();startSky();setTimeout(fromHash,50);startIntro();
/* ---------- Logo döngüsü: büyüteç Y ile K arasından çıkar, soru işaretlerini kovalar, yerine döner ---------- */
const QSVG='<svg viewBox="0 0 40 60"><path d="M8 17a12 12 0 1 1 16.8 11c-3.2 1.4-5.3 4-5.3 7.8V39" fill="none" stroke="currentColor" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="19.5" cy="51" r="5" fill="currentColor"/></svg>';
/* Mercekteki soru işareti kaçar, büyüteç kovalar, Y ile K arasında yakalar; sonra ~2 dk dinlenir (soru işareti yavaşça parlayıp söner) */
const REST=120000;let CH=null;
function chaseLoop(){
  const logo=document.getElementById("heroLogo"),lens=logo&&logo.querySelector(".O svg"),layer=document.getElementById("chase"),sp=document.getElementById("splash");
  if(!lens||reduce)return;
  if(document.hidden||(sp&&!sp.classList.contains("gone")&&getComputedStyle(sp).display!=="none"&&getComputedStyle(sp).visibility!=="hidden")){setTimeout(chaseLoop,3000);return}
  const B=layer.getBoundingClientRect(),Lr=lens.getBoundingClientRect();if(B.width<200){setTimeout(chaseLoop,REST);return}
  const hx=Lr.left+Lr.width*.44-B.left,hy=Lr.top+Lr.height*.44-B.top,z=Math.max(18,Lr.width*.36);
  const W=B.width,H=Math.min(B.height,Lr.bottom-B.top+300),dests=[];let side=Math.random()<.5?-1:1;
  for(let k=0;k<3;k++){side*=-1;const fx=side>0?.5+Math.random()*.42:.06+Math.random()*.32;dests.push([Math.max(z,Math.min(W-z*2,fx*W))-hx,Math.max(z*2.4,Math.min(H-z*2,(.2+Math.random()*.7)*H))-hy])}
  dests.push([0,0]);
  let tot=0,c=[0,0];for(const d of dests){tot+=Math.hypot(d[0]-c[0],d[1]-c[1]);c=d}
  const step=Math.max(z*2.8,tot/13),land=[[0,0]];c=[0,0];
  for(const d of dests){const dx=d[0]-c[0],dy=d[1]-c[1],m=Math.max(1,Math.round(Math.hypot(dx,dy)/step));for(let i=1;i<=m;i++)land.push([c[0]+dx*i/m,c[1]+dy*i/m]);c=d}
  // Pixar lambası gibi: çömel (hazırlık) → uzayarak fırla → havada süzül → yere çarpıp basıl → esneyip otur → etrafa bakın
  const ANT=300,FLY=640,SET=420,LOOK=520,HD=ANT+FLY+SET+LOOK,T0=900,nh=land.length-1,LAG=HD*1.05;
  const kq=[],K=(tm,x,y,sx,sy,r,ez="ease-in-out")=>kq.push({tm,ez,tf:`translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${r.toFixed(1)}deg) scale(${sx.toFixed(3)},${sy.toFixed(3)})`});
  K(0,0,0,.3,.3,0,"cubic-bezier(.3,1.6,.5,1)");K(420,0,-z*.5,1.1,.92,-8);K(700,0,0,1.3,.7,0,"ease-out");K(T0-60,0,0,1,1,0);
  for(let k=0;k<nh;k++){const a=land[k],b=land[k+1],t0=T0+HD*k,dir=b[0]>=a[0]?1:-1,h=z*(1.7+Math.random()*.7);
    K(t0,a[0],a[1],1,1,0,"ease-in");
    K(t0+ANT*.8,a[0],a[1],1.3,.68,-dir*7,"ease-out");               // hazırlık: basık, geriye yaslan
    K(t0+ANT,a[0],a[1]-2,.76,1.32,dir*9,"linear");                   // kalkış: uzan
    for(let s=.1;s<.95;s+=.1){const e=Math.abs(.5-s)*2,x=a[0]+(b[0]-a[0])*s,y=a[1]+(b[1]-a[1])*s-4*h*s*(1-s);
      K(t0+ANT+FLY*s,x,y,1-.2*e,1+.24*e,dir*(9-18*s),"linear")}      // parabol, tepede yuvarlak
    K(t0+ANT+FLY,b[0],b[1],1.4,.6,0,"ease-out");                     // çarpma: iyice basıl
    K(t0+ANT+FLY+150,b[0],b[1],.88,1.14,0,"ease-in-out");            // geri esne
    K(t0+ANT+FLY+280,b[0],b[1],1.05,.96,0,"ease-in-out");
    K(t0+ANT+FLY+SET,b[0],b[1],1,1,0,"ease-in-out");
    if(k%2===0)K(t0+ANT+FLY+SET+LOOK*.55,b[0],b[1],1,1,-dir*16,"ease-in-out"); // dönüp büyütece bakar
  }
  const TL=T0+HD*(nh-1)+ANT+FLY,catchAt=TL+SET+780;
  for(let tm=TL+SET+LOOK+60,k=0;tm<catchAt-260;tm+=420,k++){K(tm,0,0,1.15,.85,0,"ease-out");K(tm+200,0,-z*.3,.95,1.08,k%2?-8:8,"ease-in")}
  K(catchAt,0,0,1,1,0);
  const q=document.createElement("span");q.className="fq";q.title="Yakala!";q.style.cssText=`--z:${z}px;left:${hx-z/2}px;top:${hy-z*.75}px;transform-origin:50% 100%`;q.innerHTML=QSVG;layer.append(q);
  logo.classList.remove("rest");logo.classList.add("esc");
  kq.sort((a,b)=>a.tm-b.tm);const qa=q.animate(kq.map(f=>({transform:f.tf,offset:Math.min(1,f.tm/catchAt),easing:f.ez})),{duration:catchAt,fill:"forwards"});
  // büyüteç: etrafına bakınır, soru işaretinin az önce olduğu yeri didikler, havada görünce camını ona çevirir, bazen yanlış yöne atılır
  const lk=[],rot={v:0},face=(lx,ly,tx,ty)=>{if(Math.hypot(tx-lx,ty-ly)<4)return rot.v;let r=Math.atan2(ty-ly,tx-lx)*180/Math.PI+135;while(r-rot.v>180)r-=360;while(r-rot.v<-180)r+=360;return rot.v=r};
  const L=(tm,x,y,s,r,ez="cubic-bezier(.45,0,.25,1)")=>lk.push({tm,ez,tf:`translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${r.toFixed(1)}deg) scale(${s})`});
  L(0,0,0,1,0);rot.v=-30;L(T0*.4,0,-8,1.16,-30);rot.v=30;L(T0*.8,0,-8,1.16,30);
  for(let k=0;k<nh;k++){const a=land[k],b=land[k+1],t0=T0+HD*k+ANT;
    const sx=k?a[0]+(Math.random()-.5)*z*.9:0,sy=k?a[1]+(Math.random()-.5)*z*.7:-8;
    if(k){L(t0+150,sx,sy,1.22,face(sx,sy,a[0]+(Math.random()-.5)*z*2,a[1]+z));             // yere bakar: burada mıydı?
          const sw=rot.v;L(t0+FLY*.3,sx,sy,1.22,sw+(Math.random()<.5?-22:22),"ease-in-out")} // sağa sola tarar
    L(t0+FLY*.6,sx,sy,1.34,face(sx,sy,b[0],b[1]-z*.6),"cubic-bezier(.2,.9,.3,1)");           // gördü! camını çevirir
    if(k%3===1&&k<nh-1){const px=-(b[1]-a[1]),py=b[0]-a[0],n=Math.hypot(px,py)||1,wx=(sx+b[0])/2+px/n*z*2.4,wy=(sy+b[1])/2+py/n*z*2.4;
      L(t0+FLY+SET*.9,wx,wy,1.2,face(wx,wy,wx+px/n,wy+py/n));L(t0+FLY+SET+LOOK*.5,wx,wy,1.26,face(wx,wy,b[0],b[1]),"cubic-bezier(.2,.9,.3,1)")} // yanlış yöne atılır, fark eder
  }
  L(catchAt,0,0,1.3,Math.round(rot.v/360)*360);
  lk.sort((a,b)=>a.tm-b.tm);
  const la=lens.animate(lk.map(f=>({transform:f.tf,offset:Math.min(1,f.tm/catchAt),easing:f.ez})),{duration:catchAt,fill:"forwards"});

  CH={q,qa,la,lens,logo,z,done:false,timer:setTimeout(()=>caught(),catchAt)};
  q.addEventListener("pointerdown",grab);
}
function caught(){const c=CH;if(!c||c.done)return;c.done=true;
  c.q.animate([{opacity:1},{opacity:0,transform:"scale(.2)"}],{duration:220,fill:"forwards"}).onfinish=()=>c.q.remove();
  c.lens.getAnimations().forEach(a=>a.cancel());c.lens.style.transform="";c.logo.classList.remove("esc");
  c.lens.animate([{transform:"scale(1.3)"},{transform:"scale(.9)"},{transform:"scale(1.07)"},{transform:"scale(1)"}],{duration:760,easing:"ease-out"});
  const g=c.lens.querySelector(".lq");g&&g.animate([{opacity:0,transform:"scale(.4)"},{opacity:1,transform:"scale(1.18)"},{opacity:1,transform:"scale(1)"}],{duration:600,easing:"cubic-bezier(.3,1.6,.5,1)"});
  setTimeout(()=>c.logo.classList.add("rest"),700);setTimeout(chaseLoop,REST)}
/* Kaçan soru işaretine tıklanınca: büyüteç hemen oraya uçar, onu kapar ve Y ile K arasına geri götürür */
function grab(ev){const c=CH;if(!c||c.done||c.grabbed)return;ev.preventDefault();c.grabbed=true;clearTimeout(c.timer);
  const qm=new DOMMatrix(getComputedStyle(c.q).transform),lm=getComputedStyle(c.lens).transform;
  c.qa.cancel();c.la.cancel();const qx=qm.e,qy=qm.f,L0=lm==="none"?"none":lm,z=c.z;
  c.q.style.transform=`translate(${qx}px,${qy}px)`;
  c.q.animate([{transform:`translate(${qx}px,${qy}px) scale(1,1)`},{transform:`translate(${qx}px,${qy-z*.6}px) scale(.8,1.3) rotate(-10deg)`,easing:"ease-in"},{transform:`translate(${qx}px,${qy}px) scale(1.25,.8)`}],{duration:360,fill:"forwards",easing:"ease-out"});
  const fly=c.lens.animate([{transform:L0},{transform:`translate(${qx}px,${qy}px) scale(1.4) rotate(0deg)`}],{duration:540,easing:"cubic-bezier(.5,0,.25,1.25)",fill:"forwards"});
  fly.onfinish=()=>{
    const path=[{transform:`translate(${qx}px,${qy}px) scale(1.4)`},{transform:`translate(${qx*.5}px,${qy*.5-Math.max(60,z*2.5)}px) scale(1.45) rotate(${qx>0?-8:8}deg)`},{transform:"translate(0px,0px) scale(1.3)"}];
    c.q.animate([{transform:`translate(${qx}px,${qy}px) scale(1.25,.8)`},{transform:`translate(${qx}px,${qy}px) scale(.55)`}],{duration:200,fill:"forwards"}).onfinish=()=>{
      c.q.animate(path.map(f=>({transform:f.transform.replace(/scale\([^)]*\)/,"scale(.55)")})),{duration:1150,easing:"ease-in-out",fill:"forwards"});
      c.lens.animate(path,{duration:1150,easing:"ease-in-out",fill:"forwards"}).onfinish=caught}};
}
document.getElementById("heroLogo")?.classList.add("rest");
afterIntro(()=>setTimeout(chaseLoop,6000));
/* ---------- Tema: aydınlık / karanlık ---------- */
(()=>{const b=document.getElementById("themeBtn");let saved=null;try{saved=localStorage.getItem("nvny-theme")}catch(e){}
  if(saved)document.documentElement.dataset.theme=saved;
  const cur=()=>document.documentElement.dataset.theme||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");
  const paint=()=>{const d=cur()==="dark";b.innerHTML=d?'<svg viewBox="0 0 20 20" width="16" height="16"><circle cx="10" cy="10" r="4" fill="currentColor"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 1v2M10 17v2M1 10h2M17 10h2M3.6 3.6l1.4 1.4M15 15l1.4 1.4M3.6 16.4L5 15M15 5l1.4-1.4"/></g></svg>Aydınlık':'<svg viewBox="0 0 20 20" width="16" height="16"><path d="M13 2a8 8 0 1 0 5 12A7 7 0 0 1 13 2z" fill="currentColor"/></svg>Karanlık';b.setAttribute("aria-label",d?"Aydınlık moda geç":"Karanlık moda geç")};
  b.onclick=()=>{const n=cur()==="dark"?"light":"dark";document.documentElement.dataset.theme=n;try{localStorage.setItem("nvny-theme",n)}catch(e){}paint();if(sky.state){update(new Date())}};
  paint();matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>{paint();if(sky.state)update(new Date())});})();
/* yazı tipleri gelince şehir katmanını ve ANKARA yazısını giriş ekranı açıkken önceden çiz (geçişte iş kalmasın) */
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{if(sky.state){buildLayer();sky.ankC=null;drawStatic()}});
