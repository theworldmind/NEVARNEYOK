
/* Girişten sayfaya: logo süzülerek sayfadaki yerine oturur, gökyüzü yavaşça açılır */
let spLeft=false,introBusy=true;const afterIntroQ=[];
const idle=(f,t)=>window.requestIdleCallback?requestIdleCallback(f,{timeout:t}):setTimeout(f,60);
function afterIntro(fn){if(introBusy)afterIntroQ.push(fn);else fn()}
function introDone(){if(!introBusy)return;introBusy=false;const q=afterIntroQ.splice(0),nx=()=>{const f=q.shift();if(!f)return;try{f()}catch(e){}if(q.length)idle(nx,800)};nx()}
function leaveSplash(){if(spLeft)return;spLeft=true;const sp=document.getElementById("splash"),from=sp.querySelector(".sp-logo .logo"),to=document.getElementById("heroLogo"),spl=sp.querySelector(".sp-logo"),D=document.documentElement;
  (window.spTimers||[]).forEach(clearTimeout);(window.spAnims||[]).forEach(a=>{try{a.finish()}catch(e){}});
  sp.querySelectorAll(".sp-logo .O svg").forEach(s=>s.style.opacity=1);
  scrollTo(0,0);const done=()=>{sp.classList.add("gone");sp.remove();setTimeout(()=>{D.classList.remove("entering");idle(introDone,1200)},1500)};
  const rm=matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(rm||!from||!to||parseFloat(getComputedStyle(spl).opacity)<.9||from.getBoundingClientRect().width<10){D.classList.remove("spl");sp.classList.add("go","fading");setTimeout(done,820);return}
  from.getAnimations({subtree:true}).forEach(a=>{try{a.finish()}catch(e){}});
  const a=from.getBoundingClientRect(),b=to.getBoundingClientRect(),s=b.width/a.width,dx=b.left-a.left,dy=b.top-a.top;
  to.style.opacity="0";from.style.transformOrigin="0 0";from.style.willChange="transform";
  // önce sayfa hazır olsun (bir kare), sonra her şey kompozitörde aynı anda başlasın
  requestAnimationFrame(()=>{D.classList.remove("spl");D.classList.add("entering");sp.classList.add("go","leaving");
    const DUR=1050;
    from.animate([{transform:"none"},{transform:`translate(${dx}px,${dy}px) scale(${s})`}],{duration:DUR,easing:"cubic-bezier(.65,0,.25,1)",fill:"forwards"});
    to.animate([{opacity:0},{opacity:0,offset:.82},{opacity:1}],{duration:DUR+80,fill:"forwards"});
    const f=from.animate([{opacity:1},{opacity:1,offset:.86},{opacity:0}],{duration:DUR+80,fill:"forwards"});
    f.onfinish=()=>{to.style.opacity="";to.getAnimations().forEach(x=>x.cancel());done()}})}
document.getElementById("splash").addEventListener("click",leaveSplash);
{const tx=document.querySelector("#spTap .tx");if(tx&&matchMedia("(hover:hover) and (pointer:fine)").matches)tx.textContent="İlerlemek için tıkla";
  const go=ev=>{if(spLeft)return;if(ev.type==="keydown"&&!["Enter"," ","ArrowDown","Escape","PageDown"].includes(ev.key))return;leaveSplash()};
  addEventListener("keydown",go);addEventListener("wheel",go,{passive:true,once:true});
  try{if(localStorage.getItem("nvny-seen")){document.getElementById("splash").classList.add("quick")}localStorage.setItem("nvny-seen","1")}catch(e){}}
document.getElementById("splash").addEventListener("pointermove",ev=>{const g=document.querySelector(".sp-glow");if(g)g.style.translate=`${(ev.clientX/innerWidth-.5)*8}vw ${(ev.clientY/innerHeight-.5)*8}vh`});

/* Kategoriye özgü kart ve bilet temaları (index.html: KATEGORİ TEMALARI) */
const THEMED=new Set(["konser","tiyatro","standup","sahne","cocuk","festival","parti","atolye"]);
const CATS={konser:"Konser",tiyatro:"Tiyatro",standup:"Stand-up · Komedi",sahne:"Opera · Bale · Dans",cocuk:"Çocuk · Aile",festival:"Festival",parti:"Parti · Gece",atolye:"Atölye · Quiz · Söyleşi",sinema:"Sinema"};
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
    const r=await fetch(u,{cache:"no-store"});if(!r.ok)return;const j=await r.json();j.fetched=new Date().toISOString();if(omSet(j,"Open-Meteo"))afterIntro(()=>{update(new Date());idle(wxRefresh,600)})}catch(e){}}
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


const GUN=["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"];const GUNK=["Paz","Pzt","Sal","Çar","Per","Cum","Cmt"];
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
const RANGES={hepsi:["Tümü",()=>true],yeni:["✦ Yeni eklenenler",null],iptal:["İptal / ertelenen",null],bugun:["Bugün",d=>+d===+today],yarin:["Yarın",d=>+d===+addDays(today,1)],hafta:["Bu hafta",d=>d<=thisSun],gelecek:["Gelecek hafta",d=>d>thisSun&&d<=nextSun],sonu:["Hafta sonu (Cum–Paz)",d=>[0,5,6].includes(d.getDay())],
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
/* ALTIN ŞERİT · Yoğun ilgi: veriye dayalı işaretlerin puanı (3 ve üzeri yıldız alır)
   Haberlerde geçmesi (data/buzz.json: hangi sitede haber yapıldı; metin saklanmaz), tükenen seans, en düşük fiyatın yükselmesi,
   sonradan seans eklenmesi, seans sayısı, büyük salon, birden çok sitede satış */
const BZ=window.NVNY_BUZZ||{},bzKey=s=>(s||"").toLocaleLowerCase("tr").replace(/[ıi̇]/g,"i").replace(/ğ/g,"g").replace(/ü/g,"u").replace(/ş/g,"s").replace(/ö/g,"o").replace(/ç/g,"c").replace(/[âä]/g,"a").replace(/[éè]/g,"e").replace(/[^a-z0-9]+/g,"");
const bzNews=(m,days=14)=>{if(!m)return[];const cut=new Date(Date.now()-days*864e5).toISOString().slice(0,10),seen=new Set(),o=[];for(const[s,u,d]of m){if(d&&d<cut)continue;if(seen.has(s))continue;seen.add(s);o.push([(BZ.names||{})[s]||s,u])}return o};
/* İPTAL / ERTELEME HABERİ: kaynak sitede durum yazmasa da Ankara'yla ilgili bir haberde etkinliğin iptal ya da ertelendiği geçiyorsa
   (data/buzz.json "cx": site, bağlantı, tarih, tür) etkinlik öyle işaretlenir ve bilette haber bağlantısı gösterilir. Haber etkinlikten en çok 30 gün önce olmalı. */
upcoming.forEach(e=>{if(e.status)return;const m=(BZ.cx||{})[bzKey(e.title.split(/ · | \| /)[0])];if(!m)return;
  const lo=new Date(pd(e.d)-30*864e5).toISOString().slice(0,10),L=m.filter(x=>!x[2]||(x[2]>=lo&&x[2]<=e.d));if(!L.length)return;
  e.status=L.some(x=>x[3]!=="ertelendi")?"iptal":"ertelendi";const seen=new Set();e.stNews=L.filter(x=>!seen.has(x[0])&&seen.add(x[0])).map(x=>[(BZ.names||{})[x[0]]||x[0],x[1]])});
const chgCount=upcoming.filter(e=>e.status==="iptal"||e.status==="ertelendi").length;
{const BIG=/Congresium|MEB Şura|Ziraat Bankası Ana Salon|Jolly Joker Ankara|Spor Salonu|Arena|Tepe Prime|Milyon/;const byT={},D7=7*864e5,now=Date.now();
  upcoming.forEach(e=>{const k=normT(e.title.split(" · ")[0]);(byT[k]||(byT[k]=[])).push(e)});
  const extra={};for(const k in byT){const g=byT[k],fs=g.filter(x=>x.firstSeen&&x.firstSeen!==NVD.baseline).map(x=>now-Date.parse(x.firstSeen));if(fs.some(a=>a<=D7)&&fs.some(a=>a>D7))extra[k]=1}
  upcoming.forEach(e=>{const k=normT(e.title.split(" · ")[0]),g=byT[k],r=[];let s=0;
    if(g.some(x=>x.status==="tukendi")){s+=3;r.push("Tükenen seans var")}
    const nw=bzNews((BZ.ev||{})[bzKey(e.title.split(/ · | \| /)[0])]);if(nw.length){s+=nw.length>=2?3:2;r.push(`Haberlerde: ${nw.map(x=>x[0]).join(", ")}`)}
    if(e.prevPrice&&e.price&&e.price>e.prevPrice*1.08&&now-Date.parse(e.priceChanged||0)<10*864e5){s+=2;r.push("En düşük fiyat yükseldi")}
    if(extra[k]){s+=2;r.push("Ek seans açıldı")}
    if(g.length>=4){s+=g.length>=8?2:1;r.push(`${g.length} seans`)}
    if(BIG.test(e.venue)&&e.cat!=="cocuk"&&e.cat!=="atolye"){s+=2;r.push("Büyük salon")}
    if(e.tickets.filter(x=>x.price).length>=2){s+=1;r.push("Birden çok sitede satışta")}
    if(s>=3&&(!e.status||e.status==="tukendi")){e.gold=true;e.goldWhy=r;e.goldNews=nw}})}
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
  sky.W=r.width;sky.H=r.height;cv.width=r.width*dpr;cv.height=r.height*dpr;sky.dpr=dpr;
  const R=rng(7);sky.stars=Array.from({length:Math.round(sky.W*sky.H/2200)},()=>({x:R()*sky.W,y:R()*sky.H*.62,r:R()*1.2+.25,p:R()*6}));
  sky.clouds=Array.from({length:9},(_,i)=>({x:R()*sky.W*1.4-sky.W*.2,y:sky.H*(.08+R()*.38),s:.6+R()*1.1,v:.04+R()*.08,seed:i*13+1}));
  sky.drops=Array.from({length:160},()=>({x:R()*sky.W,y:R()*sky.H,l:8+R()*12,v:7+R()*6}));
  sky.lastMin=-1;
}
const TSUN={sabah:[4,105],gun:[38,180],gunbatimi:[1.5,248],gece:[-24,330]};
function themePref(){try{return localStorage.getItem("nvny-tema")||"oto"}catch(e){return"oto"}}
function themeSun(s){const p=themePref(),o=TSUN[p],r=o?{...s,alt:o[0],az:o[1]}:s;
  const per=o?p:r.alt<-6?"gece":r.az<180?(r.alt<15?"sabah":"gun"):(r.alt<10?"gunbatimi":"gun"),D=document.documentElement,v=per==="sabah"||per==="gun"?"light":"dark";
  if(D.dataset.period!==per)D.dataset.period=per;if(D.dataset.theme!==v)D.dataset.theme=v;return r}
/* ---------- ÖZEL GÜNLER: bayramlarda ve anma günlerinde şerit ve gökyüzü süsü (tek bayrak kuralı korunur: başka bayrak yok) ----------
   Süsler gökyüzüyle birlikte dakikada bir çizilir; her karede çizilen yalnızca yılbaşı karı (var olan yağış tuvali). Deneme: ?gun=2026-12-31T22:00 */
const SDQ=(()=>{try{const q=new URLSearchParams(location.search).get("gun");return q&&!isNaN(Date.parse(q))?q:null}catch(e){return null}})();
function sdayOf(t){if(SDQ)t=new Date(SDQ);const y=t.getFullYear(),md=`${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`,ymd=`${y}-${md}`,h=t.getHours();
  const R={"2027-03-09":"Ramazan","2027-03-10":"Ramazan","2027-03-11":"Ramazan","2027-05-16":"Kurban","2027-05-17":"Kurban","2027-05-18":"Kurban","2027-05-19":"Kurban"}[ymd];
  const din=R?`${R} Bayramınız kutlu olsun!`:"";
  if(md==="12-31"||md==="01-01")return{k:"yilbasi",t:md==="01-01"?`Mutlu yıllar! ${y} Ankara'da güzel geçsin.`:`Yeni yıla az kaldı: ${y+1} Ankara'da güzel geçsin.`,fx:["isik","kar",...(md==="01-01"&&h<4||md==="12-31"&&h>=21?["fisek"]:[])]};
  if(md>="12-20")return{k:"yilbasi",t:"Yeni yıl yaklaşıyor: Ankara'da yılbaşı etkinliklerine göz at.",fx:["isik","kar"]};
  if(md==="03-18")return{k:"anma",t:"18 Mart Çanakkale Zaferi'nin yıl dönümünde şehitlerimizi saygı ve rahmetle anıyoruz.",fx:[]};
  if(md==="04-23")return{k:"bayram",t:`23 Nisan Ulusal Egemenlik ve Çocuk Bayramı kutlu olsun! TBMM ${y-1920} yaşında.`,fx:["ucurtma"]};
  if(md==="05-19")return{k:"bayram",t:"19 Mayıs Atatürk'ü Anma, Gençlik ve Spor Bayramı kutlu olsun!"+(din?" "+din:""),fx:["fisek"]};
  if(md==="08-30")return{k:"bayram",t:"30 Ağustos Zafer Bayramı kutlu olsun!",fx:["fisek"]};
  if(md==="10-13")return{k:"bayram",t:`13 Ekim: Ankara'nın başkent oluşunun ${y-1923}. yıl dönümü kutlu olsun!`,fx:["fisek"]};
  if(md==="10-29"||(md==="10-28"&&h>=13))return{k:"bayram",t:`Cumhuriyet Bayramımız kutlu olsun! Cumhuriyetimiz ${y-1923} yaşında.`,fx:["fisek"]};
  if(md==="11-10")return{k:"anma",t:`Ulu Önder Mustafa Kemal Atatürk'ü aramızdan ayrılışının ${y-1938}. yılında saygı ve özlemle anıyoruz.`,fx:[]};
  if(din)return{k:"bayram",t:din,fx:[]};
  return null}
function sdayBanner(sd){const n=document.querySelector(".hero-bottom .lede");if(!n)return;let b=document.getElementById("sday");
  if(!sd){b?.remove();return}if(!b){b=document.createElement("div");b.id="sday";n.before(b)}
  if(b.dataset.t===sd.t)return;b.dataset.t=sd.t;b.className="sday sd-"+sd.k;
  b.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true">${sd.k==="anma"?'<path d="M12 3c-2 0-3.5 1.6-3.5 3.6 0 1.4.8 2.7 1.6 4L6.5 21l3.2-1.5L12 22l2.3-2.5 3.2 1.5-3.6-10.4c.8-1.3 1.6-2.6 1.6-4C15.5 4.6 14 3 12 3z" fill="currentColor"/>':'<path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" fill="currentColor"/>'}</svg><span></span>`;b.querySelector("span").textContent=sd.t}
/* gökyüzü süsleri: paintBg içinde, şehir katmanından önce çizilir */
function sdayDraw(x,st,W){const sd=sky.sd;if(!sd||!sd.fx.length)return;const night=st.s.alt<-3,base=sky.base,R=rng(Math.floor(Date.now()/6e4)%997+11);
  if(sd.fx.includes("isik")){ // yılbaşı ışık dizileri
    const cols=["#ff5a6e","#ffd166","#5ee0a0","#6cb8ff","#ff9ff3"];for(let r=0;r<2;r++){const y0=base*(.1+r*.12),sag=base*.06,n=Math.round(W/38);
      x.strokeStyle="rgba(20,20,30,.5)";x.lineWidth=1;x.beginPath();for(let i=0;i<=n;i++){const u=i/n,yy=y0+Math.sin(u*Math.PI*3)*sag*.5+sag*(1-Math.abs(Math.sin(u*Math.PI*3)));i?x.lineTo(u*W,yy):x.moveTo(0,yy)}x.stroke();
      for(let i=0;i<=n;i++){const u=i/n,yy=y0+Math.sin(u*Math.PI*3)*sag*.5+sag*(1-Math.abs(Math.sin(u*Math.PI*3)))+4,c=cols[(i+r)%cols.length];
        if(night){const g=x.createRadialGradient(u*W,yy,0,u*W,yy,10);g.addColorStop(0,c+"cc");g.addColorStop(1,c+"00");x.fillStyle=g;x.fillRect(u*W-10,yy-10,20,20)}
        x.fillStyle=c;x.beginPath();x.ellipse(u*W,yy,2.6,3.6,0,0,7);x.fill()}}}
  if(sd.fx.includes("ucurtma")){ // 23 Nisan uçurtmaları
    const ks=[[.47,.34,"#ff5a6e","#ffd166"],[.62,.14,"#6cb8ff","#ffffff"],[.84,.3,"#5ee0a0","#ff9ff3"],[.24,.52,"#ffd166","#ff5a6e"]];
    for(const[px,py,c1,c2]of ks){const kx=px*W,ky=py*base,s=Math.max(16,W*.018);x.save();x.translate(kx,ky);x.rotate(-.25+R()*.5);
      x.fillStyle=c1;x.beginPath();x.moveTo(0,-s*1.3);x.lineTo(s,0);x.lineTo(0,s*1.6);x.lineTo(-s,0);x.closePath();x.fill();
      x.fillStyle=c2;x.beginPath();x.moveTo(0,-s*1.3);x.lineTo(s,0);x.lineTo(0,0);x.closePath();x.fill();x.beginPath();x.moveTo(0,0);x.lineTo(-s,0);x.lineTo(0,s*1.6);x.closePath();x.fill();
      x.strokeStyle="rgba(255,255,255,.7)";x.lineWidth=1.2;x.beginPath();x.moveTo(0,s*1.6);for(let k=1;k<=6;k++)x.lineTo(Math.sin(k*1.3)*s*.5,s*1.6+k*s*.55);x.stroke();
      for(let k=1;k<=3;k++){x.fillStyle=k%2?c2:c1;x.save();x.translate(Math.sin(k*2*1.3)*s*.5,s*1.6+k*2*s*.55);x.rotate(.6);x.fillRect(-s*.25,-s*.12,s*.5,s*.24);x.restore()}
      x.restore();x.strokeStyle="rgba(255,255,255,.35)";x.lineWidth=.8;x.beginPath();x.moveTo(kx,ky+s*1.6);x.quadraticCurveTo(kx+W*.05,base*.8,kx+W*.02,base);x.stroke()}}
  if(sd.fx.includes("fisek")&&night){ // havai fişek patlamaları (durağan; dakikada bir yer değiştirir)
    const cols=[[255,70,90],[255,255,255],[255,210,110],[255,120,140]];
    for(let f=0;f<5;f++){let cx,cy,tr=0;do{cx=W*(.08+R()*.84);cy=base*(.12+R()*.42)}while(((cx<W*.45&&cy<base*.4)||(cx>W*.76&&cy<base*.62))&&++tr<16);const r=Math.max(34,W*(.035+R()*.03)),c=cols[f%cols.length],n=26;
      const g=x.createRadialGradient(cx,cy,0,cx,cy,r*1.3);g.addColorStop(0,rgb(c,.22));g.addColorStop(1,rgb(c,0));x.fillStyle=g;x.fillRect(cx-r*1.3,cy-r*1.3,r*2.6,r*2.6);
      x.lineCap="round";for(let i=0;i<n;i++){const a=i/n*Math.PI*2+R()*.1,l=r*(.75+R()*.25),ex=cx+Math.cos(a)*l,ey=cy+Math.sin(a)*l+l*.08;
        const lg=x.createLinearGradient(cx,cy,ex,ey);lg.addColorStop(0,rgb(c,0));lg.addColorStop(.6,rgb(c,.55));lg.addColorStop(1,rgb(c,1));x.strokeStyle=lg;x.lineWidth=1.6;x.beginPath();x.moveTo(cx+Math.cos(a)*l*.25,cy+Math.sin(a)*l*.25);x.lineTo(ex,ey);x.stroke();
        x.fillStyle="rgba(255,255,255,.9)";x.beginPath();x.arc(ex,ey,1.4,0,7);x.fill()}}}
}
function update(t){
  let s=themeSun(sunPos(t));const m=moonPos(t),w=nowWeather(t),cloud=COVER[w.k]??.5;
  const snow=w.k==="snow"||(w.temp<=0&&w.mm>=.5),precip=w.k==="rain"?1:w.k==="drizzle"?.4:snow?.7:0;
  sky.state={s,m,w,cloud,snow,precip,cols:skyCols(s.alt,cloud),night:Math.min(1,Math.max(0,(2-s.alt)/10))};
  {const sd=sdayOf(t);sky.sd=sd;if(sd&&sd.fx.includes("kar")){sky.state.snow=true;sky.state.precip=Math.max(sky.state.precip,.35)}sdayBanner(sd)}
  {const sc=document.getElementById("spStars"),na=Math.max(0,Math.min(1,(-s.alt-5)/8))*(1-cloud*.8);if(sc&&!sc.dataset.done&&na>0){sc.dataset.done=1;const w=sc.width=innerWidth,h=sc.height=innerHeight,cx=sc.getContext("2d");cx.fillStyle="#fff";for(let i=0;i<160;i++){cx.globalAlpha=na*(.25+Math.random()*.7);cx.beginPath();cx.arc(Math.random()*w,Math.random()*h*.8,Math.random()*1.3+.3,0,7);cx.fill()}}}
  {const R=document.documentElement.style,q=c=>rgb(c.map(v=>Math.round(v/6)*6)),v=sky.state.cols.map(q),k=v.join();if(sky.cssK!==k){sky.cssK=k;R.setProperty("--sky1",v[0]);R.setProperty("--sky2",v[1]);R.setProperty("--sky3",v[2])}}
  {const spl=document.getElementById("spBg"),[c1,c2,c3]=sky.state.cols;if(spl)spl.style.background=`radial-gradient(70% 45% at 50% 100%,${rgb(c3,.9)},transparent 75%),linear-gradient(180deg,${rgb(c1)} 0%,${rgb(c2)} 62%,${rgb(c3)} 100%)`}
  // şehir katmanı yalnızca gece/gündüz düzeyi, tema ya da boyut değişince yeniden çizilir (hava değişimi yalnızca gökyüzünü etkiler)
  const lk=[Math.round(sky.state.night*20),isLightTheme(),sky.W,sky.H].join();if(sky.layerK!==lk||!sky.layer){sky.layerK=lk;buildLayer();placeFlag()}
  paintBg(performance.now());renderNow(t);
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
  const bg=x.createLinearGradient(0,0,0,G);bg.addColorStop(0,"#f0182a");bg.addColorStop(1,"#d20716");x.fillStyle=bg;x.fillRect(0,0,f.w,G);
  x.fillStyle="#fff";x.beginPath();x.arc(.5*G,.5*G,.25*G,0,7);x.fill();x.fillStyle="#e30a17";x.beginPath();x.arc(.5625*G,.5*G,.2*G,0,7);x.fill();
  x.fillStyle="#fff";x.beginPath();const sx=.8958*G,sy=.5*G,R=.125*G,r=R*.382;for(let i=0;i<10;i++){const a=Math.PI+i*Math.PI/5,rr=i%2?r:R;x.lineTo(sx+Math.cos(a)*rr,sy+Math.sin(a)*rr)}x.closePath();x.fill();
  const hz=x.createLinearGradient(0,0,f.w*.06,0);hz.addColorStop(0,"rgba(0,0,0,.22)");hz.addColorStop(1,"rgba(0,0,0,0)");x.fillStyle=hz;x.fillRect(0,0,f.w*.06,G);
  f.c=c}
function drawFlag(x,now){const f=sky.flag;if(!f)return;if(!f.c)flagPre(f);const n=44,sw=f.w/n,d=sky.dpr,t=reduce?0:now/1000;
  for(let i=0;i<n;i++){const u=i/n,k=Math.pow(u,.85),ph=t*3.4-u*7.2,ph2=t*5.1-u*11+1.3;
    const off=(Math.sin(ph)*.075+Math.sin(ph2)*.022)*f.h*k+u*f.h*.035,sl=Math.cos(ph)+Math.cos(ph2)*.35,hs=1-.045*k*(1+Math.sin(ph)),hh=f.h*hs,yy=f.y+off+(f.h-hh)/2;
    x.drawImage(f.c,i*sw*d,0,Math.ceil(sw*d)+1,f.c.height,f.x+i*sw,yy,sw+.7,hh);
    const a=Math.min(1,k*1.4);if(sl>0){x.fillStyle=`rgba(255,240,240,${sl*.13*a})`}else{x.fillStyle=`rgba(40,0,8,${-sl*.24*a})`}x.fillRect(f.x+i*sw,yy,sw+.7,hh)}}
function buildLayer(){sky.ankC=null;
  const {W,H,dpr}=sky,st=sky.state;const oc=document.createElement("canvas");oc.width=W*dpr;oc.height=H*dpr;const x=oc.getContext("2d");x.scale(dpr,dpr);
  const n=st.night,cx=W/2,fs=Math.min(W*.12,112),hb=(document.querySelector(".hero-bottom")?.offsetHeight||200),base=Math.max(H*.42,H-hb-fs*1.35-18);
  const span=W*.98,s=Math.min(Math.max(span/1000,.5),base/385),R=Math.max(span*1.6,900);
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
  const kx=L+span*.905;x.fillStyle=S;x.beginPath();x.moveTo(kx-90*s,arcY(kx-90*s));x.quadraticCurveTo(kx,arcY(kx)-92*s,kx+100*s,arcY(kx+100*s));x.fill();
  const ky=arcY(kx)-64*s;x.fillRect(kx-46*s,ky-24*s,92*s,120*s);for(let i=-46;i<46;i+=9)x.fillRect(kx+i*s,ky-31*s,5.5*s,8*s);
  x.fillRect(kx-58*s,ky-46*s,20*s,140*s);x.fillRect(kx+40*s,ky-40*s,18*s,140*s);x.fillRect(kx-8*s,ky-36*s,16*s,14*s);
  for(let i=0;i<3;i++)x.fillRect(kx-58*s+i*7*s,ky-52*s,4.5*s,7*s);
  // servi ağaçları
  const cypress=(px,h)=>{const y=arcY(px)+3*s;x.fillStyle=S;x.beginPath();x.moveTo(px,y-h);x.quadraticCurveTo(px+h*.16,y-h*.4,px+h*.08,y);x.lineTo(px-h*.08,y);x.quadraticCurveTo(px-h*.16,y-h*.4,px,y-h);x.fill()};
  // ANITKABİR — ışıklandırılmış traverten
  const ax=L+span*.2,ab=arcY(ax),stone=S,shade=rgb(mix(silD,[0,0,0],.14)),agap=M;
    for(const o of[-190,-170,-150,150,170,190])cypress(ax+o*s,(44+Rr()*16)*s);
  // yan revaklar
  x.fillStyle=shade;x.fillRect(ax-176*s,ab-34*s,66*s,110*s);x.fillRect(ax+110*s,ab-34*s,66*s,110*s);
  x.fillStyle=stone;x.fillRect(ax-180*s,ab-38*s,74*s,5*s);x.fillRect(ax+106*s,ab-38*s,74*s,5*s);
  x.fillStyle=agap;for(let i=0;i<7;i++){x.fillRect(ax-172*s+i*9.4*s,ab-31*s,4.6*s,26*s);x.fillRect(ax+114*s+i*9.4*s,ab-31*s,4.6*s,26*s)}
  // basamaklı kaide
  x.fillStyle=shade;x.fillRect(ax-128*s,ab-8*s,256*s,90*s);x.fillStyle=stone;[[124,8],[112,8],[100,8]].forEach(([hw,hh],i)=>x.fillRect(ax-hw*s,ab-(8+i*8)*s,hw*2*s,hh*s+1));
  // Şeref Holü
  const top=ab-110*s,colTop=ab-96*s,colBot=ab-24*s,hw=88*s;
  x.fillStyle=stone;x.fillRect(ax-hw,top,hw*2,14*s);x.fillStyle=shade;x.fillRect(ax-hw+6*s,top-6*s,hw*2-12*s,6*s);x.fillRect(ax-hw,top+14*s,hw*2,2.4*s);
  x.fillStyle=agap;x.fillRect(ax-hw+4*s,colTop,hw*2-8*s,colBot-colTop);
  x.fillStyle=`rgba(255,206,130,${n*.12})`;x.fillRect(ax-hw+4*s,colTop,hw*2-8*s,colBot-colTop);
  const cols=10,cw=9*s,gap=(hw*2-8*s-cw)/(cols-1);x.fillStyle=stone;for(let i=0;i<cols;i++)x.fillRect(ax-hw+4*s+i*gap,colTop,cw,colBot-colTop);
  x.fillStyle=shade;for(let i=0;i<cols;i++)x.fillRect(ax-hw+4*s+i*gap+cw-2.2*s,colTop,2.2*s,colBot-colTop);
  // HİTİT GÜNEŞ KURSU
  const hx=L+span*.355,hbse=arcY(hx);x.fillStyle=S;x.fillRect(hx-9*s,hbse-16*s,18*s,80*s);x.fillRect(hx-1.6*s,hbse-52*s,3.2*s,38*s);
  x.strokeStyle=S;x.lineWidth=2.6*s;x.beginPath();x.arc(hx,hbse-66*s,15*s,0,7);x.stroke();x.lineWidth=1.2*s;for(let i=0;i<8;i++){const a=i*Math.PI/4;x.beginPath();x.moveTo(hx,hbse-66*s);x.lineTo(hx+Math.cos(a)*15*s,hbse-66*s+Math.sin(a)*15*s);x.stroke()}
  for(const o of[-20,0,20]){x.beginPath();x.arc(hx+o*s*.7,hbse-84*s+Math.abs(o)*.25*s,2.4*s,0,7);x.fillStyle=S;x.fill()}
  // ATAKULE
  const tx=L+span*.5,tb=arcY(tx);x.fillStyle=S;x.beginPath();x.moveTo(tx-16*s,tb+80*s);x.lineTo(tx-15*s,tb);x.lineTo(tx-7*s,tb-236*s);x.lineTo(tx+7*s,tb-236*s);x.lineTo(tx+15*s,tb);x.lineTo(tx+16*s,tb+80*s);x.fill();
  x.beginPath();x.moveTo(tx-40*s,tb-238*s);x.lineTo(tx+40*s,tb-238*s);x.lineTo(tx+30*s,tb-266*s);x.lineTo(tx-30*s,tb-266*s);x.fill();
  x.beginPath();x.ellipse(tx,tb-266*s,30*s,24*s,0,Math.PI,0);x.fill();x.fillRect(tx-2*s,tb-326*s,4*s,40*s);
  x.fillStyle=`rgba(140,220,255,${.2+n*.55})`;x.fillRect(tx-36*s,tb-252*s,72*s,3.4*s);x.fillStyle=`rgba(255,226,180,${.2+n*.7})`;for(let i=-3;i<=3;i++)x.fillRect(tx+i*8*s-2*s,tb-262*s,4*s,5*s);
  x.fillStyle=`rgba(255,60,80,${.35+.65*n*(.6+.4*Math.sin(performance.now()/500))})`;x.beginPath();x.arc(tx,tb-327*s,3.4*s,0,7);x.fill();
  // KOCATEPE CAMİİ
  const kc=L+span*.7,kb=arcY(kc);x.fillStyle=S;x.fillRect(kc-64*s,kb-56*s,128*s,150*s);x.beginPath();x.arc(kc,kb-56*s,52*s,Math.PI,0);x.fill();
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
  // TÜRK BAYRAĞI: Ankara Kalesi'nin en yüksek burcunda dalgalanır
  {const fsc=Math.max(s,.5),fh=60*fsc,fw=fh*1.5,px=Math.min(W-fw-10,kx-48*s),bot=ky-50*s,top=bot-Math.max(fh*2,120*s);
    const pg=x.createLinearGradient(px-2*fsc,0,px+2.4*fsc,0);pg.addColorStop(0,"#8a8fa3");pg.addColorStop(.45,"#f6f7fb");pg.addColorStop(1,"#6d7286");
    x.fillStyle=pg;x.fillRect(px-1.5*fsc,top,3.2*fsc,bot-top);
    const fg=x.createRadialGradient(px-1*fsc,top-4.4*fsc,.4*fsc,px,top-3*fsc,4.2*fsc);fg.addColorStop(0,"#fff3c4");fg.addColorStop(.5,"#e8b84a");fg.addColorStop(1,"#9c6d14");
    x.fillStyle=fg;x.beginPath();x.arc(px+.1*fsc,top-3*fsc,3.9*fsc,0,7);x.fill();
    sky.flag={x:px+1.7*fsc,y:top+1.5*fsc,w:fw,h:fh,c:null}}
  sky.ank={cx,y:base+fs*.2,fs:fs*.86};
  sky.layer=oc;sky.base=base;
}
const cloudCache=new Map();
function cloudSprite(c,col){const k=c.seed+"|"+col.map(v=>v|0).join(",");if(cloudCache.has(k))return cloudCache.get(k);
  const s=c.s*Math.min(1.4,sky.W/900+.4),w=Math.ceil(420*s),h=Math.ceil(170*s),Q=.25,oc=document.createElement("canvas");oc.width=Math.ceil(w*Q);oc.height=Math.ceil(h*Q);oc.lw=w;oc.lh=h;const x=oc.getContext("2d"),R=rng(c.seed);x.scale(Q,Q);for(let i=0;i<14;i++){const ox=w/2+(R()-.5)*w*.55,oy=h*.58+(R()-.5)*h*.25,r=(26+R()*40)*s;const g=x.createRadialGradient(ox,oy-r*.3,0,ox,oy,r);g.addColorStop(0,rgb(mix(col,[255,255,255],.25),.9));g.addColorStop(1,rgb(col,0));x.fillStyle=g;x.beginPath();x.arc(ox,oy,r,0,7);x.fill()}
  if(cloudCache.size>60)cloudCache.clear();cloudCache.set(k,oc);return oc}
function cloudShape(x,c,W,col,a){const sp=cloudSprite(c,col),cx=((c.x%(W*1.4))+W*1.4)%(W*1.4)-W*.2-sp.lw/2;x.globalAlpha=a;x.imageSmoothingQuality="high";x.drawImage(sp,cx,c.y-sp.lh/2,sp.lw,sp.lh);x.globalAlpha=1}
let lastT=performance.now(),lastDraw=0;sky.vis=true;sky.run=false;
function loop(now){if(!animOn()||document.hidden||!sky.vis){sky.run=false;return}requestAnimationFrame(loop);if(now-lastDraw<31||(document.documentElement.classList.contains("spl")&&lastDraw))return;lastDraw=now;fxFrame(now)}
function kick(){if(!sky.run&&animOn()){sky.run=true;lastT=performance.now();requestAnimationFrame(loop)}}
new IntersectionObserver(es=>{sky.vis=es[0].isIntersecting;if(sky.vis)kick()}).observe(document.getElementById("sky"));
document.fonts&&document.fonts.ready.then(()=>{sky.ankC=null;if(sky.state)paintBg(performance.now())});
function paintBg(nowT){paintBg0(nowT);const st=sky.state;if(!st)return;const x=sky.cv.getContext("2d"),{W,H}=sky;x.save();x.setTransform(sky.dpr,0,0,sky.dpr,0,0);x.globalCompositeOperation="destination-out";const g=x.createLinearGradient(0,H*.84,0,H);g.addColorStop(0,"rgba(0,0,0,0)");g.addColorStop(1,"rgba(0,0,0,1)");x.fillStyle=g;x.fillRect(0,H*.84,W,H*.16+1);x.restore()}
function paintBg0(nowT){
  const st=sky.state;if(!st){return}sky.bgAt=Date.now();
  const {W,H}=sky,x=sky.cv.getContext("2d");x.setTransform(sky.dpr,0,0,sky.dpr,0,0);
  const dt=Math.min(100,nowT-lastT);lastT=nowT;
  const[ct,cm,ch]=st.cols;let g=x.createLinearGradient(0,0,0,sky.base);g.addColorStop(0,rgb(ct));g.addColorStop(.6,rgb(cm));g.addColorStop(1,rgb(ch));x.fillStyle=g;x.fillRect(0,0,W,H);
  // yıldızlar
  const sa=Math.max(0,Math.min(1,(-st.s.alt-5)/8))*(1-st.cloud*.9);
  if(sa>0){x.fillStyle="#fff";for(const p of sky.stars){x.globalAlpha=sa*(.45+.55*Math.sin(nowT/900+p.p)**2)*(1-p.y/(sky.H*.62));x.beginPath();x.arc(p.x,p.y,p.r,0,7);x.fill()}x.globalAlpha=1}
  // güneş / ay: azimut 90°(doğu)→270°(batı) ekrana yayılır
  const toXY=(az,alt)=>[W*((az-80)/200),sky.base-(alt/55)*sky.base*.92];
  if(st.s.alt>-6){const[sx,sy]=toXY(st.s.az,st.s.alt),r=Math.max(18,W*.018);const glow=x.createRadialGradient(sx,sy,0,sx,sy,r*7);glow.addColorStop(0,`rgba(255,220,160,${.55*(1-st.cloud*.6)})`);glow.addColorStop(1,"rgba(255,200,140,0)");x.fillStyle=glow;x.fillRect(sx-r*7,sy-r*7,r*14,r*14);
    x.fillStyle=`rgba(255,${st.s.alt<6?200:240},${st.s.alt<6?130:200},${1-st.cloud*.55})`;x.beginPath();x.arc(sx,sy,r,0,7);x.fill()}
  if(st.m.alt>-2&&st.s.alt<8){const[mx,my]=toXY(st.m.az,st.m.alt),r=Math.max(14,W*.014),ph=st.m.age;
    x.save();x.globalAlpha=(1-st.cloud*.6)*Math.min(1,(8-st.s.alt)/8);x.shadowColor="#fff2d0";x.shadowBlur=r*2;x.fillStyle="#fff4dc";x.beginPath();x.arc(mx,my,r,0,7);x.fill();x.shadowBlur=0;
    x.globalCompositeOperation="source-atop";x.fillStyle=rgb(ct,.92);const off=(ph<.5?1:-1)*r*2*(1-Math.abs(ph-.5)*2);x.beginPath();x.arc(mx+(ph<.5?-1:1)*0+off*(ph<.5?-1:1),my,r*1.02,0,7);if(Math.abs(ph-.5)>.03)x.fill();x.restore()}
  // bulutlar
  const cc=mix(mix([255,255,255],[150,158,175],st.cloud),[40,44,80],st.night*.85),n=Math.round(2+st.cloud*7);
  const ts=animOn()?Date.now()/1000:0;for(let i=0;i<n;i++){const c=sky.clouds[i],ox=c.x;c.x=ox+c.v*4*ts;cloudShape(x,c,W,cc,.35+st.cloud*.5);c.x=ox}
  sdayDraw(x,st,W);
  // şehir
  x.drawImage(sky.layer,0,0,W,H);
  // ANKARA — yavaşça ışıldar, yavaşça söner
  if(sky.ank){if(!sky.ankC)ankPre();const a=sky.ank,ph=reduce?.5:(Math.sin(nowT/7000*Math.PI*2-Math.PI/2)+1)/2;
    x.drawImage(sky.ankC,0,a.oy,W,a.oh)}

}
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
function animOn(){if(reduce)return false;try{return localStorage.getItem("nvny-anim")!=="0"}catch(e){return true}}
/* Hareketli katman: yalnızca küçük bayrak tuvali ve (yağışta) yağmur tuvali her karede çizilir */
function fxCanvas(id,z){let c=document.getElementById(id);if(!c){c=document.createElement("canvas");c.id=id;c.setAttribute("aria-hidden","true");c.className="skyfx";c.style.zIndex=z;sky.cv.after(c)}return c}
function placeFlag(){const f=sky.flag;if(!f)return;const c=fxCanvas("skyFlag",-1),d=sky.dpr,px=8,py=f.h*.3;f.ox=f.x-px;f.oy=f.y-py;f.cw=f.w+px*2;f.ch=f.h+py*2;
  c.style.cssText+=`;left:${f.ox}px;top:${f.oy}px;width:${f.cw}px;height:${f.ch}px`;c.width=Math.ceil(f.cw*d);c.height=Math.ceil(f.ch*d);sky.fc=c;fxFrame(performance.now(),true)}
function fxFrame(nowT,force){const st=sky.state;if(!st)return;const d=sky.dpr,f=sky.flag,an=animOn();
  if(f&&sky.fc&&(an||force)){const x=sky.fc.getContext("2d");x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,sky.fc.width,sky.fc.height);x.setTransform(d,0,0,d,-f.ox*d,-f.oy*d);drawFlag(x,an?nowT:2600)}
  const rc=st.precip>0&&an?fxCanvas("skyRain",-1):document.getElementById("skyRain");if(!rc)return;
  if(!(st.precip>0&&an)){rc.style.display="none";return}rc.style.display="";const {W,H}=sky;if(rc.width!==Math.round(W)){rc.width=Math.round(W);rc.height=Math.round(H)}
  const x=rc.getContext("2d");x.clearRect(0,0,W,H);const dt=Math.min(100,nowT-(sky.lastFx||nowT));sky.lastFx=nowT;
    if(st.precip>0){const k=Math.round(sky.drops.length*st.precip);x.strokeStyle=st.snow?"rgba(255,255,255,.85)":"rgba(200,215,255,.45)";x.fillStyle="rgba(255,255,255,.85)";x.lineWidth=1.1;x.beginPath();
    for(let i=0;i<k;i++){const d=sky.drops[i];if(!reduce){d.y+=(st.snow?d.v*.18:d.v)*dt*.06;d.x+=(st.snow?Math.sin(nowT/700+i)*.4:-.6)*dt*.06;if(d.y>H){d.y=-20;d.x=Math.random()*W}}
      if(st.snow){x.moveTo(d.x+1.6,d.y);x.arc(d.x,d.y,1.6,0,7)}else{x.moveTo(d.x,d.y);x.lineTo(d.x-2,d.y+d.l)}}
    st.snow?x.fill():x.stroke()}
}
function renderNow(t){
  const st=sky.state,w=st.w,hh=String(t.getHours()).padStart(2,"0"),mm=String(t.getMinutes()).padStart(2,"0");
  const part=st.s.alt>6?"Gündüz":st.s.alt>-1?(t.getHours()<12?"Gün doğumu":"Gün batımı"):st.s.alt>-12?"Alacakaranlık":"Gece";
  let txt=w.txt;
  const ik=w.k==="clear"&&st.s.alt<-2?"moon":w.k==="normal"?"pcloud":w.k;
  document.getElementById("now").innerHTML=`<span class="nw-ic k-${ik}" aria-hidden="true"><svg viewBox="0 0 40 40"><use href="#${ICON[ik]||"i-pcloud"}"/></svg></span><span class="nw-tx"><span>Ankara · ${hh}:${mm} · ${part}</span><b><em>${w.temp}°</em> ${txt}</b><small>${w.src}${OM&&OM.fetched?` · ${hhmm(new Date(OM.fetched))} güncel`:""} · gün ${w.hi}°/${w.lo}°</small></span>`;
}
function tick(){const t=new Date();if(t.getMinutes()!==sky.lastMin){sky.lastMin=t.getMinutes();update(t)}if(Date.now()-(sky.bgAt||0)>20e3)paintBg(performance.now())}
function startSky(){skySize();tick();setInterval(tick,15000);kick();omFetch();setInterval(omFetch,30*60e3)}
document.addEventListener("visibilitychange",()=>{if(!document.hidden){kick();if(omAge()>.75)omFetch()}});

function toast(t){const d=document.createElement("div");d.className="toast";d.textContent=t;document.body.append(d);setTimeout(()=>d.remove(),2600)}



/* ---------- Arayüz ---------- */
function chip(label,pressed,on,color,count){const b=document.createElement("button");b.className="chip"+(color?" catc":"");b.type="button";b.setAttribute("aria-pressed",pressed);if(color){b.style.setProperty("--c",color);b.insertAdjacentHTML("beforeend",'<span class="dot"></span>')}b.append(label);if(count!=null)b.insertAdjacentHTML("beforeend",`<small>${count}</small>`);b.onclick=on;return b}
function drawChips(){
  const c=document.getElementById("cats");c.innerHTML="";
  c.append(chip("Tüm kategoriler",state.cat==="hepsi",()=>{state.cat="hepsi";render()},null,upcoming.length));
  {const ns=upcoming.filter(e=>e.cat==="sinema").length,nf=filmCount();if(ns||nf){const b=chip("Sinema",state.cat==="sinema",()=>{state.cat=state.cat==="sinema"?"hepsi":"sinema";state.limit=60;render()},null,nf?`${nf} film`:ns);b.classList.add("cinec");b.insertAdjacentHTML("afterbegin",'<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-film"/></svg>');c.append(b)}}
  {const ng=upcoming.filter(e=>e.gold).length,b=chip("★ Yoğun ilgi",state.cat==="altin",()=>{state.cat=state.cat==="altin"?"hepsi":"altin";state.limit=60;render()},null,ng);b.classList.add("goldc");c.append(b)}
  for(const k in CATS){if(k==="sinema")continue;const n=upcoming.filter(e=>e.cat===k).length;if(n)c.append(chip(CATS[k],state.cat===k,()=>{state.cat=state.cat===k?"hepsi":k;state.limit=60;render()},`var(--c-${k})`,n))}
  const r=document.getElementById("ranges");r.innerHTML="";
  for(const k in RANGES){if(k==="yeni"&&!newCount||k==="iptal"&&!chgCount)continue;const b=chip(RANGES[k][0],state.range===k,()=>{state.range=k;state.limit=60;render()},null,k==="yeni"?newCount:k==="iptal"?chgCount:null);if(k==="iptal")b.classList.add("cxc");r.append(b)}
  {const b=document.createElement("button");b.type="button";b.className="chip allv";b.innerHTML='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2 3h16v14H2zM2 8h16M2 12.5h16M7.3 3v14M12.7 3v14" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>Hepsini bir arada gör';b.onclick=openBoard;r.append(b)}
  {const b=document.createElement("button");b.type="button";b.className="chip allv wallc";b.innerHTML='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2.5 2.5h6.5v8.5H2.5zM11 2.5h6.5v6H11zM2.5 13h6.5v4.5H2.5zM11 10.5h6.5v7H11z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>Afiş duvarı';b.onclick=()=>openWall();r.append(b)}
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
/* Fiyat karşılaştırması: yalnızca toplayıcının son 36 saatte doğruladığı fiyatlar (fiyat kuralı); her site için en uygun kategori */
/* Fiyat seçenekleri: sitenin kendi sayfasında adı ve fiyatı açıkça yazan kategoriler (fiyatla aynı tarama, aynı tazelik kuralı) */
function catsHTML(x){if(!x.price||!Array.isArray(x.cats)||x.cats.length<2)return"";return`<span class="tcats" aria-label="Fiyat seçenekleri">${x.cats.map(([n,p,ok,fr])=>`<span class="tc${ok?"":" so"}"><i>${escA(n)}</i><b>${fmtTL(p)}</b>${!ok?"<small>tükendi</small>":fr?`<small>${fr} boş koltuk</small>`:""}</span>`).join("")}</span>`}
function pcmpHTML(e){const P=e.tickets.filter(x=>x.price).sort((a,b)=>a.price-b.price);if(P.length<2)return"";const lo=P[0].price,hi=P[P.length-1].price;
  return`<div class="pcmp"><div class="pc-h"><b>Fiyat karşılaştırması</b><span>${P.length} sitede doğrulanmış fiyat${hi>lo?` · fark ${fmtTL(hi-lo)}`:" · hepsi aynı"}</span></div>${P.map(x=>`<div class="pc-r${x.price===lo?" best":""}"><span class="pc-s">${escA(x.site)}</span><i class="pc-b"><i style="width:${Math.max(8,Math.round(x.price/hi*100))}%"></i></i><b>${fmtTL(x.price)}</b><small>${x.price===lo?"en düşük":"+"+fmtTL(x.price-lo)}</small></div>`).join("")}<p class="pc-n">Her sitedeki en uygun kategori · kontrol: ${agoTxt(P[0].checked)}</p></div>`}
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
  const w=document.createElement("div");w.className="tkw"+(st?" off":"")+(e.gold?" gold":"")+(e.cat==="sinema"?" cine":THEMED.has(e.cat)?" th th-"+e.cat:"");w.dataset.k=key(e);
  w.innerHTML=`<article class="tk" style="--c:var(--c-${e.cat})">
   <div class="ph" style="--d1:${dp[0]};--d2:${dp[1]}">${tposHTML(e)}${pstHTML(e.img,e.imgBy)}
     <span class="tag">${CATS[e.cat]}</span>${e.gold?'<span class="sash">★ Yoğun ilgi</span>':""}${st?`<span class="st">${st}</span>`:""}${!st&&(isNew(e)||dropOf(e))?`<span class="nb${dropOf(e)?" dr":""}">${dropOf(e)?`Fiyatı %${dropOf(e)} düştü`:"Yeni eklendi"}</span>`:""}
     <div class="stamp"><span class="dn">${d.getDate()}</span><span class="mw"><span class="mo">${AY[d.getMonth()]} ${d.getFullYear()}</span><span class="wd">${GUN[d.getDay()]}</span>${e.t?`<span class="tm">${e.t}</span>`:""}</span></div></div>
   <div class="body"><div class="strip"><span class="brand">Ne Var Ne Yok? · Ankara</span><span class="gn"></span></div>${e.stNews?`<div class="stbar"><b>${st}</b><span>Haberlere göre · bilet sitesinden de kontrol edin</span>${e.stNews.map(([n,u])=>`<a href="${escA(u)}" target="_blank" rel="noopener">${escA(n)} haberi ↗</a>`).join("")}</div>`:""}${e.gold?`<div class="goldbar"><b>★ Yoğun ilgi</b><span>${e.goldWhy.join(" · ")}</span>${(e.goldNews||[]).map(([n,u])=>`<a href="${escA(u)}" target="_blank" rel="noopener">${escA(n)} haberi ↗</a>`).join("")}</div>`:""}
     <div class="content">
       <div class="crumb"><span>${CATS[e.cat]}</span>${e.genre?`<i>›</i><span class="cg"></span>`:""}</div>
       <h3></h3>
       <div class="meta"><span><svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><rect x="2" y="3" width="12" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" stroke="currentColor" stroke-width="1.6"/></svg>${d.getDate()} ${SHORTM[d.getMonth()]} ${d.getFullYear()}${e.t?` · ${e.t}`:""}</span>${mu?`<a class="vlink" href="${mu}" target="_blank" rel="noopener"><svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M8 15s5-4.6 5-8.5A5 5 0 0 0 3 6.5C3 10.4 8 15 8 15z" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="8" cy="6.5" r="1.8" fill="currentColor"/></svg><span class="v"></span><small>Haritada aç ↗</small></a>`:`<span class="vlink plain"><span class="v"></span></span>`}</div>
       <p class="desc"></p>
       ${info.length?`<dl class="info">${info.map(()=>`<div><dt></dt><dd></dd></div>`).join("")}</dl>`:""}
       ${st?"":pcmpHTML(e)}<div class="tixes">${e.tickets.map((x,i)=>`<div class="tix${i?" alt":""}"><div class="tl"><span class="ts">${x.site}${i===0&&e.tickets.filter(y=>y.price).length>1&&x.price?" · en uygun":""}</span>${st&&!i?`<span class="tp">${st}</span>`:x.price?`<span class="tp">${fmtTL(x.price)}<small class="den">'den</small></span><span class="te">${agoTxt(x.checked)} kontrol edildi</span>`:`<span class="tp nop">Fiyat sitede</span>`}</div>
          <div class="tb"><a class="b-buy" href="${goto(x,0)}" target="_blank" rel="noopener">${st&&!i?"Seanslara bak":"Bilet al"} ↗</a><a class="b-view" href="${goto(x,1)}" target="_blank" rel="noopener">Etkinliği görüntüle</a></div>${st&&!i?"":catsHTML(x)}</div>`).join("")}</div>
       <div class="foot"><span class="pnote"></span><button class="fav" type="button" aria-pressed="${fav}">${fav?"♥ Kaydedildi":"♡ Kaydet"}</button></div></div></div>
   <div class="stub">${wxHTML(e)}</div></article>`;
  {const h=w.querySelector("h3");h.textContent=e.title;h.tabIndex=0;h.setAttribute("role","button");h.title="Ayrıntılar";h.onclick=()=>openDetail(e);h.onkeydown=ev=>{if(ev.key==="Enter")openDetail(e)};hl(h,state.q)}w.querySelectorAll(".v").forEach(v=>v.textContent=e.venue);
  w.querySelector(".desc").textContent=descOf(e);
  w.querySelector(".gn").textContent=e.tickets.map(x=>x.site).join(" · ");const cg=w.querySelector(".cg");if(cg)cg.textContent=e.genre;
  w.querySelectorAll(".info>div").forEach((r,i)=>{r.querySelector("dt").textContent=info[i][0];r.querySelector("dd").textContent=info[i][1]});
  w.querySelector(".pnote").textContent=(e.note?e.note+". ":"")+priceLine(e,st);
  w.querySelector(".fav").onclick=ev=>{const k=key(e);favs.has(k)?favs.delete(k):favs.add(k);saveFavs();const b=ev.currentTarget,on=favs.has(k);b.setAttribute("aria-pressed",on);b.textContent=on?"♥ Kaydedildi":"♡ Kaydet";if(state.range==="fav")render()};
  pstWire(w);return w;
}
/* AFİŞ: kaynağındaki adresinden gösterilir (gömme); sunucumuzda indirilmez, saklanmaz. Yüklenemezse kendi çizimimiz görünür.
   Afiş kutuya oranı uyuyorsa doldurur; uymuyorsa (yatay afiş) tamamı okunacak şekilde ortalanır, arkası afişin kendisiyle dolar. */
const escA=x=>String(x).replace(/[&"<>]/g,c=>({"&":"&amp;",'"':"&quot;","<":"&lt;",">":"&gt;"}[c]));
function pstHTML(src,by){return src?`<i class="pbg"></i><img class="pst" src="${escA(src)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" draggable="false"><i class="pshade"></i>${by?`<span class="pby">Görsel: ${escA(by)}</span>`:""}`:""}
/* Afişi olmayan (ya da yüklenemeyen) etkinlik için olgulardan çizilen tipografik afiş: kategori renkleri, ad, mekân, tarih. Simge yok. */
function tposHTML(e){return`<div class="tpos tp-${e.cat}" lang="tr"><i class="tp-pat"></i><span class="tp-k">${escA(CATS[e.cat]||"")}</span><b class="tp-t">${escA(e.title)}</b><span class="tp-v">${escA(e.venue||"")}</span></div>`}
function pstWire(root){root.querySelectorAll("img.pst:not([data-w])").forEach(im=>{im.dataset.w=1;const box=im.parentElement;
  /* kutunun oranı sınıfından bilinir: kaydırma sırasında yerleşim okunmaz */
  const ok=()=>{if(!im.naturalWidth)return bad();const r=im.naturalWidth/im.naturalHeight,c=box.classList,b=c.contains("fc-ph")||c.contains("ftk-pst")||c.contains("fm")||c.contains("det-pst")?.667:c.contains("ph")?0:.6917;
    /* afiş kırpılmaz: kutu oranına çok yakınsa doldurur, değilse tamamı görünür */
    if(!b||Math.abs(Math.log(r/b))>.09)c.add("pst-fit","has-pst");else c.add("has-pst")};
  const bad=()=>{box.querySelectorAll(".pbg,.pshade,.pby").forEach(x=>x.remove());im.remove()};
  if(im.complete)ok();else{im.addEventListener("load",ok,{once:true});im.addEventListener("error",bad,{once:true})}})}
function card(e){
  const d=pd(e.d),dp=DEEP[e.cat],st=e.status==="tukendi"?"Tükendi":e.status==="ertelendi"?"Ertelendi":e.status==="iptal"?"İptal edildi":"",f=forecast(e),t0=e.tickets[0]||{site:e.site,url:e.url};
  const w=document.createElement("article");w.className="vc"+(st?" off":"")+(e.gold?" gold":"")+(e.cat==="sinema"?" cine":THEMED.has(e.cat)?" th th-"+e.cat:"");w.style.setProperty("--c",`var(--c-${e.cat})`);w.dataset.k=key(e);w._e=e;
  const ps=e.tickets.slice(0,3),pp=ps.filter(y=>y.price),lo=pp.length>1?Math.min(...pp.map(y=>y.price)):0;
  w.innerHTML=`<div class="vc-ph" style="--d1:${dp[0]};--d2:${dp[1]}">${tposHTML(e)}${pstHTML(e.img,e.imgBy)}
</div>
   <div class="vc-in">${e.gold||st||isNew(e)||dropOf(e)?`<div class="vc-bd">${e.gold?'<span class="vc-gold">★ Yoğun ilgi</span>':""}${st?`<span class="vc-st">${st}</span>`:""}${!st&&(isNew(e)||dropOf(e))?`<span class="vc-nb${dropOf(e)?" dr":""}">${dropOf(e)?`Fiyatı %${dropOf(e)} düştü`:"Yeni"}</span>`:""}</div>`:""}
    <div class="vc-when"><b>${d.getDate()}</b><span>${SHORTM[d.getMonth()]} · ${GUNK[d.getDay()]}${e.t?`<i>${e.t}</i>`:""}</span><span class="vc-wx" title="Etkinlik saatinde hava"><svg viewBox="0 0 40 40" aria-hidden="true"><use href="#${ICON[f.k]}"/></svg>${f.t}°</span></div>
    <div class="vc-cat">${CATS[e.cat]}</div><h3></h3><div class="vc-v"></div>
    <div class="vc-pr">${ps.map(x=>`<span${lo&&x.price===lo?' class="best"':""}><i></i><b class="${!(st&&x===t0)&&!x.price?"np":""}">${st&&x===t0?st:x.price?fmtTL(x.price):"fiyat sitede"}</b></span>`).join("")}${e.tickets.length>3?`<span class="mo">+${e.tickets.length-3} site</span>`:""}</div>
    <div class="vc-bt"><a class="vc-buy" href="${goto(t0,0)}" target="_blank" rel="noopener">${st?"Seanslar":"Bilet al"} ↗</a><button type="button" class="vc-look" aria-haspopup="dialog">İncele</button></div></div>`;
  const h=w.querySelector("h3");h.textContent=e.title;hl(h,state.q);w.querySelector(".vc-v").textContent=e.venue;
  w.querySelectorAll(".vc-pr i").forEach((x,i)=>x.textContent=ps[i].site);
  const open=()=>openTicket(e,w);w.querySelector(".vc-look").onclick=open;h.onclick=open;w.querySelector(".vc-ph").onclick=open;
  pstWire(w);return w}
/* Hava verisi yenilenince kartları yeniden kurmadan yalnızca hava rozetini değiştir (afişler yeniden çözülmez) */
function wxRefresh(){document.querySelectorAll("#main .vc").forEach(c=>{const e=c._e,x=c.querySelector(".vc-wx");if(!e||!x)return;const f=forecast(e),h=`<svg viewBox="0 0 40 40" aria-hidden="true"><use href="#${ICON[f.k]}"/></svg>${f.t}°`;if(x._h!==h){x._h=h;x.innerHTML=h}})}
/* İncele: kart yerinden kalkar, büyüyüp yatay bilete dönüşür; "Geri dön" ile aynı yoldan yerine iner */
let TV=null;
function ghostOf(card,e){const dp=DEEP[e.cat],g=document.createElement("div");g.className="tkv-ghost";
  const cs=getComputedStyle(card);g.innerHTML=`<i class="ga" style="background:linear-gradient(180deg,${dp[0]},${dp[1]} 56%,${cs.backgroundColor==="rgba(0, 0, 0, 0)"?"var(--paper)":cs.backgroundColor} 56%);background-color:var(--paper)"></i><i class="gb" style="background:linear-gradient(90deg,${dp[0]},${dp[1]} 27%,var(--paper) 27%)"></i>`;return g}
function openTicket(e,card){if(TV)return;const D=document.documentElement,dur=reduce?1:480,EZ="cubic-bezier(.22,.8,.2,1)";
  const ov=document.createElement("div");ov.className="tkv";ov.setAttribute("role","dialog");ov.setAttribute("aria-modal","true");ov.setAttribute("aria-label",e.title);
  ov.innerHTML='<div class="tkv-bg"></div><div class="tkv-box"><div class="tkv-bar"><button type="button" class="tkv-x">← Geri dön</button></div></div>';
  const box=ov.querySelector(".tkv-box"),tk=ticket(e);box.append(tk);
  const r0=card.getBoundingClientRect();D.classList.add("tkv-on");document.body.append(ov);
  const r1=tk.getBoundingClientRect(),g=ghostOf(card,e);Object.assign(g.style,{left:r1.left+"px",top:r1.top+"px",width:r1.width+"px",height:r1.height+"px"});ov.append(g);
  const T=`translate(${r0.left-r1.left}px,${r0.top-r1.top}px) scale(${r0.width/r1.width},${r0.height/r1.height})`;
  card.style.visibility="hidden";
  g.animate([{transform:T},{transform:"none"}],{duration:dur,easing:EZ,fill:"forwards"});
  g.querySelector(".gb").animate([{opacity:0},{opacity:1}],{duration:dur*.8,easing:"ease-in-out",fill:"both"});
  ov.querySelector(".tkv-bg").animate([{opacity:0},{opacity:1}],{duration:dur,fill:"both"});
  box.animate([{opacity:0},{opacity:0,offset:.62},{opacity:1}],{duration:dur+140,fill:"both"});
  const fade=g.animate([{opacity:1},{opacity:1,offset:.75},{opacity:0}],{duration:dur+160,fill:"forwards"});fade.onfinish=()=>{g.style.display="none"};
  const x=ov.querySelector(".tkv-x");x.onclick=closeTicket;ov.querySelector(".tkv-bg").onclick=closeTicket;
  TV={e,card,ov,box,tk,g,key:ev=>{if(ev.key==="Escape")closeTicket()}};addEventListener("keydown",TV.key);
  setTimeout(()=>x.focus({preventScroll:true}),dur)}
function closeTicket(){const v=TV;if(!v||v.closing)return;v.closing=true;removeEventListener("keydown",v.key);const dur=reduce?1:420,EZ="cubic-bezier(.55,0,.25,1)";
  const r1=v.tk.getBoundingClientRect(),r0=v.card.getBoundingClientRect(),g=v.g;g.getAnimations().forEach(a=>a.cancel());
  Object.assign(g.style,{display:"",opacity:1,left:r1.left+"px",top:r1.top+"px",width:r1.width+"px",height:r1.height+"px"});
  const T=`translate(${r0.left-r1.left}px,${r0.top-r1.top}px) scale(${r0.width/r1.width},${r0.height/r1.height})`;
  v.box.animate([{opacity:1},{opacity:0}],{duration:dur*.35,fill:"forwards"});
  g.querySelector(".gb").animate([{opacity:1},{opacity:1,offset:.2},{opacity:0}],{duration:dur,fill:"forwards"});
  v.ov.querySelector(".tkv-bg").animate([{opacity:1},{opacity:0}],{duration:dur,fill:"forwards"});
  const a=g.animate([{transform:"none"},{transform:T}],{duration:dur,easing:EZ,fill:"forwards"});
  a.onfinish=()=>{v.card.style.visibility="";v.ov.remove();document.documentElement.classList.remove("tkv-on");TV=null;v.card.querySelector(".vc-look")?.focus({preventScroll:true})}}
let shown=0;
function filterList(){const q=state.q.trim();
  return upcoming.filter(e=>{const d=pd(e.d);
    if(state.cat==="altin"?!e.gold:(state.cat!=="hepsi"&&e.cat!==state.cat))return false;
    if(state.range==="fav"){if(!favs.has(key(e)))return false}else if(state.range==="yeni"){if(!isNew(e))return false}else if(state.range==="iptal"){if(e.status!=="iptal"&&e.status!=="ertelendi")return false}else if(!RANGES[state.range][1](d))return false;
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
/* ---------- AFİŞ DUVARI: seçili filtrelerdeki etkinliklerin afişleri, gün gün (afişler okunur büyüklükte kalsın) ---------- */
const WL={day:null,tok:0};
function wallDays(list){const m=new Map();for(const e of list)m.set(e.d,(m.get(e.d)||0)+1);return[...m.entries()]}
function openWall(day){const w=document.getElementById("wall"),list=filterList();WL.list=list;const days=wallDays(list);
  WL.days=days.map(x=>x[0]);WL.day=day&&WL.days.includes(day)?day:WL.days.includes(WL.day)?WL.day:WL.days[0];
  const tl=w.querySelector(".wl-days");tl.innerHTML="";
  for(const[d,n]of days){const q=pd(d),diff=Math.round((q-today)/864e5),b=document.createElement("button");b.type="button";b.className="wl-d";b.dataset.d=d;b.setAttribute("role","tab");
    b.innerHTML=`<small>${diff===0?"Bugün":diff===1?"Yarın":GUNK[q.getDay()]}</small><b>${q.getDate()}</b><span>${SHORTM[q.getMonth()]} · ${n}</span>`;b.onclick=()=>wallDay(d);tl.append(b)}
  w.querySelector(".wl-sub").textContent=(state.cat==="altin"?"★ Yoğun ilgi":state.cat!=="hepsi"?CATS[state.cat]:"Bütün kategoriler")+` · ${list.length} etkinlik · ${days.length} gün`;
  if(!w.classList.contains("on")){lockScroll(1);w.classList.add("on");w.scrollTop=0}
  wallDay(WL.day,true);w.querySelector(".bd-close").focus({preventScroll:true})}
function wallDay(d,first){const w=document.getElementById("wall"),g=w.querySelector(".wl-grid"),hd=w.querySelector(".wl-dh");if(!d){g.innerHTML='<p class="empty">Bu seçimde gösterilecek etkinlik yok.</p>';hd.textContent="";return}
  const back=WL.days.indexOf(d)<WL.days.indexOf(WL.day);WL.day=d;
  w.querySelectorAll(".wl-d").forEach(b=>{const on=b.dataset.d===d;b.setAttribute("aria-selected",on);if(on)b.scrollIntoView({block:"nearest",inline:"center",behavior:first?"instant":"smooth"})});
  const q=pd(d),diff=Math.round((q-today)/864e5),evs=WL.list.filter(e=>e.d===d);
  hd.innerHTML=`<b>${diff===0?"Bugün":diff===1?"Yarın":GUN[q.getDay()]}</b><span>${diff>1?"":GUN[q.getDay()]+" · "}${q.getDate()} ${AY[q.getMonth()]} · ${evs.length} etkinlik</span>`;
  g.innerHTML="";if(!first&&animOn())g.animate([{opacity:0,transform:`translateX(${back?-18:18}px)`},{opacity:1,transform:"none"}],{duration:260,easing:"cubic-bezier(.2,.8,.2,1)"});
  if(!first)w.scrollTo({top:0,behavior:"instant"});
  const tok=++WL.tok;let i=0;
  const step=n=>{const st=Math.min(evs.length,i+n),fr=document.createDocumentFragment(),made=[];for(;i<st;i++){const t=wallTile(evs[i]);fr.append(t);made.push(t)}g.append(fr);made.forEach(pstWire);if(i<evs.length)idle(()=>{if(WL.tok===tok)step(8)},300)};step(8)}
function wallTile(e){const t=document.createElement("button");t.type="button";t.className="wt"+(e.gold?" gold":"")+(e.status?" off":"");t.style.setProperty("--c",`var(--c-${e.cat})`);const dp=DEEP[e.cat];
  t.innerHTML=`<div class="wt-ph" style="--d1:${dp[0]};--d2:${dp[1]}">${tposHTML(e)}${pstHTML(e.img,e.imgBy)}${e.gold?'<span class="wt-g">★</span>':""}</div><div class="wt-c"><span class="wt-t">${e.t||"Gün boyu"}${e.status==="tukendi"?" · Tükendi":""}</span><b></b><small></small></div>`;
  t.querySelector(".wt-c b").textContent=e.title;t.querySelector(".wt-c small").textContent=e.venue;t.setAttribute("aria-label",`${e.title}, ${e.venue}${e.t?", "+e.t:""}`);
  t.onclick=()=>openTicket(e,t);return t}
function closeWall(){const w=document.getElementById("wall");if(w.classList.contains("on")){WL.tok++;w.classList.remove("on");lockScroll(-1)}}
{const w=document.getElementById("wall");
  addEventListener("keydown",ev=>{if(!w.classList.contains("on")||TV)return;if(ev.key==="Escape")closeWall();else if(ev.key==="ArrowRight"||ev.key==="ArrowLeft"){const i=WL.days.indexOf(WL.day)+(ev.key==="ArrowRight"?1:-1);if(WL.days[i])wallDay(WL.days[i])}});
  // parmakla sağa-sola kaydırınca gün değişir
  let sx=0,sy=0,st=0;const g=w.querySelector(".wl-grid");
  g.addEventListener("touchstart",ev=>{const t=ev.touches[0];sx=t.clientX;sy=t.clientY;st=Date.now()},{passive:true});
  g.addEventListener("touchend",ev=>{const t=ev.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.6&&Date.now()-st<700){const i=WL.days.indexOf(WL.day)+(dx<0?1:-1);if(WL.days[i])wallDay(WL.days[i])}},{passive:true});
  w.querySelector(".wl-prev").onclick=()=>{const i=WL.days.indexOf(WL.day)-1;if(WL.days[i])wallDay(WL.days[i])};
  w.querySelector(".wl-next").onclick=()=>{const i=WL.days.indexOf(WL.day)+1;if(WL.days[i])wallDay(WL.days[i])}}
function closeBoard(){const bd=document.getElementById("board");if(bd.classList.contains("on")){bd.classList.remove("on");lockScroll(-1)}}
/* Kaydırma kilidi: pano ve ayrıntı penceresi aynı anda açılsa da tutarlı kalsın */
let scrollLocks=0;function lockScroll(n){scrollLocks=Math.max(0,scrollLocks+n);document.documentElement.style.overflow=scrollLocks?"hidden":""}
function jumpTo(e){closeBoard();const L=filterList(),i=L.findIndex(x=>key(x)===key(e));if(state.sort!=="date"){state.sort="date";document.getElementById("fSort").value="date"}
  if(i>=state.limit)state.limit=Math.ceil((i+1)/60)*60;render(true);
  const el=document.querySelector(`.vc[data-k="${CSS.escape(key(e))}"]`);if(!el)return;
  const go=()=>{const bh=document.querySelector(".bar").offsetHeight;scrollTo({top:el.getBoundingClientRect().top+scrollY-bh-16,behavior:"instant"})};
  go();requestAnimationFrame(()=>{go();requestAnimationFrame(go)});setTimeout(go,120);
  document.querySelectorAll(".vc.flash").forEach(x=>x.classList.remove("flash"));el.classList.add("flash");setTimeout(()=>el.classList.remove("flash"),3200)}
addEventListener("keydown",ev=>{if(ev.key==="Escape"&&document.getElementById("board").classList.contains("on"))closeBoard()});
/* ---------- SİNEMA: vizyondaki filmler (data/films.json, Ankara salonları, 7 günlük seans) ----------
   Yalnızca olgular: ad, vizyon tarihi, süre, ülke, tür, salon, saat. Afiş ve konu metni yok; bilet sinemanın sitesinde. */
const FD=window.NVNY_FILMS||{films:[],cinemas:{}},CIN=FD.cinemas||{};
const FILMS=(FD.films||[]).filter(f=>f&&f.title);
const todayIso=iso(today),tomIso=iso(addDays(today,1));
const FGC={animasyon:["#073b2b","#18b37e"],komedi:["#3b2702","#f0a500"],korku:["#16030a","#9b1028"],gerilim:["#120a26","#5b2bb5"],aksiyon:["#2a0c02","#e2561b"],dram:["#0a1a36","#2f6fd6"],belgesel:["#0d2b2b","#2a9d8f"],"bilim kurgu":["#03142c","#1c8ad8"],fantastik:["#1d0a33","#9b4dde"],macera:["#0b2a14","#3fa34d"],romantik:["#33061f","#e0457b"],suç:["#151515","#707070"],müzikal:["#2a0833","#b03cc0"],aile:["#062a17","#1f9d55"],biyografi:["#2b1a07","#c07a2a"]};
const fCol=f=>{const g=(f.genre||"").toLocaleLowerCase("tr");for(const k in FGC)if(g.includes(k))return FGC[k];return DEEP.sinema};
const durTxt=m=>m?(m>=60?`${Math.floor(m/60)} sa ${m%60?m%60+" dk":""}`:`${m} dk`).trim():"";
const hmNow=()=>{const n=new Date();return`${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`};
const fstate={day:todayIso,cin:"all"};
/* bir günün seansları: [{cid,name,t,fmt}] saat sırasıyla */
function fShows(f,d,cin){const out=[];for(const[cid,g]of(f.s&&f.s[d])||[]){if(cin&&cin!=="all"&&String(cid)!==String(cin))continue;for(const grp of g.split(";")){const[ts,fmt]=grp.split("|");for(const t of ts.split(","))out.push({cid,name:(CIN[cid]||{}).name||"",t,fmt:fmt||""})}}return out.sort((a,b)=>a.t.localeCompare(b.t))}
const fDays=()=>{const set=new Set();FILMS.forEach(f=>Object.keys(f.s||{}).forEach(d=>{if(d>=todayIso)set.add(d)}));return[...set].sort().slice(0,7)};
const fWeek=f=>Object.keys(f.s||{}).some(d=>d>=todayIso&&d<=iso(addDays(today,6)));
const filmCount=()=>FILMS.filter(fWeek).length;
/* Film ilgisi: Box Office Türkiye hafta sonu sırası/seyircisi ve haberler (data/buzz.json) */
function fHot(f){if(f._hot!==undefined)return f._hot;const bo=(BZ.bo||{}).films||{},k1=bzKey(f.title),k2=bzKey(f.title.split(/:\s/)[0]),b=bo[k1]||bo[k2],nw=bzNews((BZ.fm||{})[k1]);
  const o={bo:b||null,news:nw,gold:!!(b&&b[0]<=5)||nw.length>=2};o.why=b&&b[0]<=5?`Gişede ${b[0]}.`:nw.length>=2?"Haberlerde":"";return f._hot=o}
const fScore=f=>{const h=fHot(f);return(h.bo?30-h.bo[0]:0)+h.news.length*3};
function fBadge(f){const r=f.release||"";if(!r)return"";if(r===todayIso)return"Bugün vizyonda";if(r===tomIso)return"Yarın vizyonda";if(r>todayIso){const q=pd(r);return`${q.getDate()} ${SHORTM[q.getMonth()]} vizyonda`}return(today-pd(r))/864e5<7?"Yeni":""}
const fMatch=(f,q)=>{const h=fold(f.title+" "+(f.genre||"")+" "+(f.country||""));return fold(q).split(" ").filter(Boolean).every(t=>h.includes(t))};
const dayLbl=d=>d===todayIso?"Bugün":d===tomIso?"Yarın":(q=>`${GUNK[q.getDay()]} ${q.getDate()}`)(pd(d));
function fcard(f,day){const[d1,d2]=fCol(f),sh=fShows(f,day,fstate.cin),from=day===todayIso?hmNow():"00:00",nx=sh.filter((x,i,a)=>x.t>=from&&(!i||a[i-1].t!==x.t)),sal=new Set(sh.map(x=>x.cid)).size,b=fBadge(f);
  const w=document.createElement("article");w.className="fc";
  w.innerHTML=`<div class="fc-ph" style="--d1:${d1};--d2:${d2}"><div class="tpos tp-sinema" lang="tr"><i class="tp-pat"></i><span class="tp-k">Vizyonda</span><b class="tp-t">${escA(f.title)}</b><span class="tp-v">${escA((f.genre||"").split(",")[0])}</span></div>${pstHTML(f.img,"sinemalar.com")}<i class="perf l"></i><i class="perf r"></i>
    ${b?`<span class="fc-nb${/vizyonda/.test(b)?" up":""}">${b}</span>`:""}${f.dur?`<span class="fc-du">${durTxt(f.dur)}</span>`:""}<span class="fc-g"></span></div>
   <div class="fc-in">${fHot(f).gold?`<span class="fc-hot">★ Yoğun ilgi · ${fHot(f).why}</span>`:""}<div class="fc-cat"></div><h3></h3>
    <div class="fc-v">${sh.length?`${sal} salonda · ${sh.length} seans`:"Bu gün seansı yok"}</div>
    <div class="fc-t">${nx.slice(0,4).map(x=>`<span>${x.t}</span>`).join("")}${nx.length>4?`<span class="mo">+${nx.length-4}</span>`:""}${day===todayIso&&sh.length&&!nx.length?'<span class="mo">Bugünkü seanslar bitti</span>':""}</div>
    <div class="vc-bt"><button type="button" class="vc-buy fc-go">🎟 Seanslar</button></div></div>`;
  w.querySelector("h3").textContent=f.title;hl(w.querySelector("h3"),state.q);w.querySelector(".fc-g").textContent=(f.genre||"").split(",").slice(0,2).join(" · ");
  w.querySelector(".fc-cat").textContent=["Vizyonda",f.country].filter(Boolean).join(" · ");
  w.querySelectorAll(".fc-t span:not(.mo)").forEach((x,i)=>x.title=nx[i].name+(nx[i].fmt?" · "+nx[i].fmt:""));
  const o=()=>openFilm(f,day);w.querySelector(".fc-go").onclick=o;w.querySelector("h3").onclick=o;w.querySelector(".fc-ph").onclick=o;pstWire(w);return w}
/* Sinema bileti: "Seanslar" ile açılır; günler, salonlar ve saatler; bilet sinemanın sitesinde */
let FV=null;
function openFilm(f,day){if(FV)return;const days=Object.keys(f.s||{}).filter(d=>d>=todayIso).sort();let cur=days.includes(day)?day:(days[0]||todayIso);
  const[d1,d2]=fCol(f),ov=document.createElement("div");ov.className="tkv ftv";ov.setAttribute("role","dialog");ov.setAttribute("aria-modal","true");ov.setAttribute("aria-label",f.title);
  const rel=f.release?(q=>`${q.getDate()} ${AY[q.getMonth()]} ${q.getFullYear()}`)(pd(f.release)):"";
  ov.innerHTML=`<div class="tkv-bg"></div><div class="tkv-box"><div class="tkv-bar"><button type="button" class="tkv-x">← Geri dön</button></div>
   <article class="ftk" style="--d1:${d1};--d2:${d2}"><div class="ftk-main"><i class="perf l"></i>
     <div class="ftk-top"><span>Ne Var Ne Yok · Sinema</span><span>Tek kişilik</span></div>
     <div class="ftk-hd">${f.img?`<div class="ftk-pst">${pstHTML(f.img,"sinemalar.com")}</div>`:""}<div><div class="ftk-cat"></div><h3></h3><div class="ftk-meta"></div>${(h=>h.bo||h.news.length?`<div class="ftk-hot">${h.bo?`<span>★ Hafta sonu gişede ${h.bo[0]}.${h.bo[1]?` · ${h.bo[1].toLocaleString("tr-TR")} seyirci`:""} <a href="${escA((BZ.bo||{}).url||"https://boxofficeturkiye.com")}" target="_blank" rel="noopener">Box Office Türkiye ↗</a></span>`:""}${h.news.map(([n,u])=>`<a href="${escA(u)}" target="_blank" rel="noopener">${escA(n)} haberi ↗</a>`).join("")}</div>`:"")(fHot(f))}</div></div>
     <div class="ftk-days" role="tablist" aria-label="Gün"></div><div class="ftk-list"></div></div>
    <div class="ftk-stub"><svg class="pop" viewBox="0 0 120 150" aria-hidden="true"><use href="#pop-box"/></svg><div class="adm">Seans<br>seç</div>
     <a class="vc-buy" href="${f.url}" target="_blank" rel="noopener">Bilet al ↗</a><small>Salon ve koltuk seçimi sinemanın kendi sitesinde yapılır.</small></div></article></div>`;
  ov.querySelector("h3").textContent=f.title;ov.querySelector(".ftk-cat").textContent=["Vizyonda",f.genre].filter(Boolean).join(" · ");
  ov.querySelector(".ftk-meta").textContent=[durTxt(f.dur),f.country,rel&&`Vizyon: ${rel}`].filter(Boolean).join(" · ");
  const dz=ov.querySelector(".ftk-days"),ls=ov.querySelector(".ftk-list");
  const draw=()=>{dz.innerHTML="";for(const d of days){const b=document.createElement("button");b.type="button";b.setAttribute("role","tab");b.setAttribute("aria-selected",d===cur);b.textContent=dayLbl(d);b.onclick=()=>{cur=d;draw()};dz.append(b)}
    ls.innerHTML="";const from=cur===todayIso?hmNow():"00:00",by={};for(const x of fShows(f,cur,fstate.cin))((by[x.cid]||(by[x.cid]={}))[x.fmt]||(by[x.cid][x.fmt]=[])).push(x.t);
    const ids=Object.keys(by).sort((a,b)=>((CIN[a]||{}).name||"").localeCompare((CIN[b]||{}).name||"","tr"));
    if(!ids.length){ls.innerHTML=`<p class="ftk-none">${days.length?"Bu gün için seans yok.":"Ankara seansları henüz açıklanmadı."}</p>`;return}
    for(const id of ids){const r=document.createElement("div");r.className="fcr";r.innerHTML=`<div class="fcr-h"><b></b><small></small></div>`+Object.entries(by[id]).map(([fmt,ts])=>`<div class="fcr-g">${fmt?`<span class="fmt">${fmt}</span>`:""}${ts.map(t=>`<span class="tm${t<from?" past":""}">${t}</span>`).join("")}</div>`).join("");
      r.querySelector("b").textContent=(CIN[id]||{}).name||"Sinema";r.querySelector("small").textContent=(CIN[id]||{}).addr||"";ls.append(r)}};
  draw();document.body.append(ov);pstWire(ov);lockScroll(1);
  const dur=reduce?1:420;ov.querySelector(".tkv-bg").animate([{opacity:0},{opacity:1}],{duration:dur,fill:"both"});
  ov.querySelector(".tkv-box").animate([{opacity:0,transform:"translateY(28px) scale(.96)"},{opacity:1,transform:"none"}],{duration:dur,easing:"cubic-bezier(.22,.8,.2,1)",fill:"both"});
  const close=()=>{if(!FV)return;const v=FV;FV=null;removeEventListener("keydown",v.key);const a=ov.querySelector(".tkv-box").animate([{opacity:1,transform:"none"},{opacity:0,transform:"translateY(20px) scale(.97)"}],{duration:reduce?1:260,fill:"forwards"});ov.querySelector(".tkv-bg").animate([{opacity:1},{opacity:0}],{duration:reduce?1:260,fill:"forwards"});a.onfinish=()=>{ov.remove();lockScroll(-1)}};
  FV={key:ev=>{if(ev.key==="Escape")close()}};addEventListener("keydown",FV.key);ov.querySelector(".tkv-x").onclick=close;ov.querySelector(".tkv-bg").onclick=close;setTimeout(()=>ov.querySelector(".tkv-x").focus({preventScroll:true}),dur)}
/* Sinema sahnesi: perde, ışıklı tabela, perde üstünde "Vizyonda", logolu patlamış mısır kutuları */
function cineBlock(){const box=document.createElement("section");box.className="cine";const days=fDays();if(!days.includes(fstate.day))fstate.day=days[0]||todayIso;
  const q=state.q.trim(),films=FILMS.filter(f=>(!q||fMatch(f,q)));const on=films.filter(f=>fShows(f,fstate.day,fstate.cin).length).sort((a,b)=>fScore(b)-fScore(a)),soon=films.filter(f=>f.release>fstate.day&&!fShows(f,fstate.day,fstate.cin).length);
  const tf=FILMS.filter(f=>fShows(f,todayIso).length),tSal=new Set(tf.flatMap(f=>fShows(f,todayIso).map(x=>x.cid))).size,tSe=tf.reduce((n,f)=>n+fShows(f,todayIso).length,0);
  const enter=!cineBlock.was;cineBlock.was=true;
  box.innerHTML=`<div class="cine-stage${enter&&!reduce?" open":""}"><i class="val"></i><i class="cur l"></i><i class="cur r"></i>
    <div class="scr"><i class="bulbs"></i><i class="bulbs b2"></i><div class="scr-in"><span class="k">Ankara sinemaları</span><b>Vizyonda</b><span class="s">${tf.length} film · ${tSal} salon · bugün ${tSe} seans</span></div></div>
    <svg class="pop p1" viewBox="0 0 120 150" aria-hidden="true"><use href="#pop-box"/></svg><svg class="pop p2" viewBox="0 0 120 150" aria-hidden="true"><use href="#pop-box"/></svg></div>
   <div class="cine-ctl"><div class="fdays" role="tablist" aria-label="Gün"></div><label class="sel fsal"><span>Salon</span><select></select></label></div>
   <div class="films"></div>${soon.length?`<div class="fsoon"><b>Yakında</b></div>`:""}
   <p class="cine-src">Seanslar her gün güncellenir · kaynak: sinemalar.com · bilet ve koltuk seçimi sinemanın sitesinde</p>`;
  const dz=box.querySelector(".fdays");for(const d of days){const b=document.createElement("button");b.type="button";b.className="chip";b.setAttribute("aria-pressed",d===fstate.day);b.textContent=dayLbl(d);b.onclick=()=>{fstate.day=d;render()};dz.append(b)}
  const sel=box.querySelector("select");sel.innerHTML='<option value="all">Bütün salonlar</option>'+Object.entries(CIN).sort((a,b)=>a[1].name.localeCompare(b[1].name,"tr")).map(([id,c])=>`<option value="${id}">${c.name.replace(/[<>&]/g,"")}</option>`).join("");sel.value=fstate.cin;sel.onchange=()=>{fstate.cin=sel.value;render()};
  const g=box.querySelector(".films");if(!on.length)g.innerHTML=`<p class="empty">${q?"Aramana uyan film yok.":"Bu gün için seans bulunamadı."}</p>`;else{/* kartlar parça parça eklenir: ilk 6 hemen, kalanı boşta */let i=0;const tok=cineBlock.tok=(cineBlock.tok||0)+1,later=window.requestIdleCallback?f=>requestIdleCallback(f,{timeout:200}):f=>setTimeout(f,16);
    const step=n=>{const st=Math.min(on.length,i+n);for(;i<st;i++)g.append(fcard(on[i],fstate.day));if(i<on.length)later(()=>{if(cineBlock.tok===tok)step(4)})};step(4)}
  const so=box.querySelector(".fsoon");if(so)soon.slice(0,12).forEach(f=>{const b=document.createElement("button");b.type="button";b.className="chip";b.textContent=`${f.title} · ${fBadge(f)||dayLbl(f.release)}`;b.onclick=()=>openFilm(f,f.release);so.append(b)});
  return box}
/* Ana listede "Bugün vizyonda" şeridi: sinemaya kısa yol */
function fRail(list,title){const r=document.createElement("section");r.className="frail";r.innerHTML=`<div class="frail-h"><h2><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-film"/></svg><span></span></h2><button type="button" class="chip cinec">Bütün filmler ve seanslar →</button></div><div class="frail-s"></div>`;
  r.querySelector("h2 span").textContent=title;r.querySelector("button").onclick=()=>{state.cat="sinema";state.limit=60;render();scrollTo({top:document.getElementById("main").offsetTop-90,behavior:"smooth"})};
  const s=r.querySelector(".frail-s");list.slice(0,14).forEach(f=>{const sh=fShows(f,todayIso),nx=sh.filter(x=>x.t>=hmNow()),[d1,d2]=fCol(f),b=fBadge(f),m=document.createElement("button");m.type="button";m.className="fm";m.style.cssText=`--d1:${d1};--d2:${d2}`;
    m.innerHTML=`${pstHTML(f.img)}<i class="perf l"></i><i class="perf r"></i>${b?`<span class="fc-nb${/vizyonda/.test(b)?" up":""}">${b}</span>`:""}<b></b><small></small><span class="fm-t">${nx.length?`Sıradaki ${nx[0].t}`:sh.length?"Bugünkü seanslar bitti":"Yakında"}</span>`;
    m.querySelector("b").textContent=f.title;m.querySelector("small").textContent=[durTxt(f.dur),(f.genre||"").split(",")[0]].filter(Boolean).join(" · ");m.onclick=()=>openFilm(f,todayIso);s.append(m)});pstWire(r);return r}
/* KATEGORİ SAHNELERİ: her alanın kendine özgü başlığı (sinemadaki perde gibi). Yalnızca CSS çizimi; tek, yavaş, transform animasyonu. */
const STAGE={konser:{k:"Sahnede canlı",t:"Konser"},tiyatro:{k:"Perde açılıyor",t:"Tiyatro"},standup:{k:"Mikrofon sende",t:"Stand-up"},sahne:{k:"Loca ve sahne",t:"Opera · Bale · Dans"},
  cocuk:{k:"Minikler için",t:"Çocuk · Aile"},festival:{k:"Şehir şenlikte",t:"Festival"},parti:{k:"Gece uzun",t:"Parti · Gece"},atolye:{k:"Öğren, katıl, yarış",t:"Atölye · Quiz · Söyleşi"}};
function catStage(c){const L=upcoming.filter(e=>e.cat===c),w7=iso(addDays(today,6)),td=L.filter(e=>e.d===todayIso).length,wk=L.filter(e=>e.d<=w7).length,vn=new Set(L.map(e=>e.venue)).size,x=STAGE[c];
  const b=document.createElement("section");const enter=catStage.last!==c;catStage.last=c;
  b.className=`cstage cs-${c}${enter&&animOn()?" in":""}${animOn()?" live":""}`;b.style.setProperty("--c",`var(--c-${c})`);
  b.innerHTML=`<div class="cs-art" aria-hidden="true"><i class="a1"></i><i class="a2"></i><i class="a3"></i><i class="a4"></i></div>
   <div class="cs-tx"><span class="cs-k">${x.k}</span><h2>${x.t}</h2><div class="cs-n"><span><b>${td}</b> bugün</span><span><b>${wk}</b> bu hafta</span><span><b>${vn}</b> mekân</span></div></div>`;return b}
function render(sync){
  drawChips();
  let list=filterList();
  const byDate=(a,b)=>(a.d+(a.t||"99")).localeCompare(b.d+(b.t||"99"));
  if(state.sort==="date")list.sort(byDate);else{const s=state.sort==="pa"?1:-1;list.sort((a,b)=>(a.price==null)-(b.price==null)||s*((a.price||0)-(b.price||0))||byDate(a,b))}
  shown=list.length;const main=document.getElementById("main");main.innerHTML="";
  const full=list;list=list.slice(0,state.limit);
  const cineOn=state.cat==="sinema"&&FILMS.length;document.documentElement.classList.toggle("cine-on",!!cineOn);
  if(!cineOn)cineBlock.was=false;
  if(STAGE[state.cat])main.append(catStage(state.cat));else catStage.last=null;
  if(cineOn){main.append(cineBlock());if(list.length){const h=document.createElement("div");h.className="cine-ev";h.innerHTML="<h2>Film gösterimleri ve festivaller</h2><span>Özel gösterimler, festival seansları ve sinema etkinlikleri</span>";main.append(h)}}
  else if(FILMS.length&&state.cat==="hepsi"&&state.range!=="fav"){const q=state.q.trim(),fl=q?FILMS.filter(f=>fMatch(f,q)):FILMS.filter(f=>fShows(f,todayIso).length||f.release===tomIso);
    if(fl.length&&(q||["hepsi","bugun","yarin","hafta","sonu"].includes(state.range)))main.append(fRail(q?fl:fl.sort((a,b)=>fShows(b,todayIso).length-fShows(a,todayIso).length),q?`Filmlerde: ${fl.length} sonuç`:`Bugün vizyonda · ${fl.filter(f=>fShows(f,todayIso).length).length} film`))}
  if(!list.length&&cineOn){}else if(!list.length)main.insertAdjacentHTML("beforeend",`<p class="empty">${NVD.failed?"Etkinlik listesi şu an yüklenemedi. İnternet bağlantını kontrol edip sayfayı yenile.":state.range==="fav"&&!favs.size?"Henüz kaydettiğiniz bilet yok. Bir biletteki ♡ Kaydet düğmesine dokunduğunuzda burada görünür.":"Bu filtrelere uyan etkinlik yok. Aramayı silin ya da başka bir zaman aralığı seçin."}</p>`);if(!list.length&&state.q&&!cineOn)suggest(main);
  let curP=null,curD=null,box=null,sec=null,cnt=0,cntEl=null;
  const flat=state.sort!=="date";
  const tok=render.tok=(render.tok||0)+1;let i=0;const later=window.requestIdleCallback?f=>requestIdleCallback(f,{timeout:250}):f=>setTimeout(f,16);
  const done=()=>{if(full.length>list.length){const b=document.createElement("button");b.className="more";b.type="button";b.textContent=`Daha fazla göster · ${full.length-list.length} etkinlik daha`;b.onclick=()=>{state.limit+=60;render()};main.append(b)}};
  const step=n=>{const stop=Math.min(list.length,i+n);for(;i<stop;i++){const e=list[i];const d=pd(e.d),p=flat?{k:"x",title:state.sort==="pa"?"En uygun fiyatlılar":"En yüksek fiyatlılar",rng:`${shown} etkinlik`}:period(d);
    if(p.k!==curP){curP=p.k;curD=null;cnt=0;sec=document.createElement("section");sec.className="period";sec.innerHTML=`<div class="period-h"><h2>${p.title}</h2><span class="rng">${p.rng}</span><span class="cnt"></span></div>`;main.append(sec);cntEl=sec.querySelector(".cnt")}
    if(e.d!==curD){curD=e.d;const diff=Math.round((d-today)/864e5),rel=diff===0?"Bugün":diff===1?"Yarın":diff<7?`${diff} gün sonra`:"";
      const h=document.createElement("div");h.className="day-h";h.innerHTML=`${rel?`<span class="rel${diff>1?" plain":""}">${rel}</span>`:""}<span>${GUN[d.getDay()]}, ${d.getDate()} ${AY[d.getMonth()]}</span>`;sec.append(h);
      box=document.createElement("div");box.className="tickets";sec.append(box)}
    box.append(card(e));cnt++;cntEl.textContent=`${cnt} etkinlik`}
    if(i<list.length)later(()=>{if(render.tok===tok)step(10)});else done()};
  step(sync?1e9:cineOn?0:8);drawActive();
}
{let qt;document.getElementById("q").addEventListener("input",e=>{state.q=e.target.value;state.limit=60;clearTimeout(qt);qt=setTimeout(render,140)})}
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
  w.innerHTML=`<div class="det-hd" style="--c:var(--c-${e.cat})"><div class="det-pst" style="--d1:${DEEP[e.cat][0]};--d2:${DEEP[e.cat][1]}">${tposHTML(e)}${pstHTML(e.img)}</div><div><span class="tag">${CATS[e.cat]}</span>${e.gold?'<span class="tag g">★ Yoğun ilgi</span>':""}<h2 id="sheetT"></h2><p class="dd"></p></div></div>
   <dl class="det-dl">${rows.map(()=>"<div><dt></dt><dd></dd></div>").join("")}</dl>
   <h3>Biletler</h3><div class="det-t"></div><p class="det-n"></p>
   <h3>Hava</h3><div class="det-w stub">${wxHTML(e)}</div>
   ${same.length?`<h3>Diğer tarihler</h3><div class="det-o"></div>`:""}
   <div class="det-f"><button type="button" class="shr">Bağlantıyı paylaş</button><button type="button" class="fv"></button>${mapURL(e.venue)?`<a class="mp" target="_blank" rel="noopener" href="${mapURL(e.venue)}">Haritada aç ↗</a>`:""}</div>
   <p class="det-c">Son kontrol: ${e.checked?new Date(e.checked).toLocaleString("tr-TR",{day:"numeric",month:"long",hour:"2-digit",minute:"2-digit"}):(NVD.updated?new Date(NVD.updated).toLocaleString("tr-TR",{day:"numeric",month:"long",hour:"2-digit",minute:"2-digit"}):"—")} · Fiyat ve seanslar satış sitesinde değişebilir.</p>`;
  w.querySelector("h2").textContent=e.title;w.querySelector(".dd").textContent=descOf(e);pstWire(w);
  w.querySelectorAll(".det-dl>div").forEach((r,i)=>{r.querySelector("dt").textContent=rows[i][0];r.querySelector("dd").textContent=rows[i][1]});
  const tb=w.querySelector(".det-t");e.tickets.forEach(x=>{const r=document.createElement("div");r.className="dt-row";r.innerHTML=`<span class="s"></span><span class="p">${x.price?fmtTL(x.price)+`<small> 'den · ${agoTxt(x.checked)} kontrol edildi</small>`:`<small>Güncel fiyat sitede</small>`}</span><a class="b-buy" target="_blank" rel="noopener" href="${goto(x,0)}">Bilet al ↗</a>`;r.querySelector(".s").textContent=x.site;tb.append(r)});
  w.querySelector(".det-n").textContent=priceLine(e,e.status==="tukendi"?"Tükendi":e.status==="ertelendi"?"Ertelendi":e.status==="iptal"?"İptal edildi":"");
  const o=w.querySelector(".det-o");if(o)same.forEach(x=>{const b=document.createElement("button");b.type="button";const dx=pd(x.d);b.textContent=`${dx.getDate()} ${AY[dx.getMonth()].slice(0,3)} ${x.t||""}`;b.onclick=()=>openDetail(x);o.append(b)});
  const fv=w.querySelector(".fv"),k=key(e),sf=()=>{const on=favs.has(k);fv.textContent=on?"♥ Kaydedildi":"♡ Kaydet";fv.setAttribute("aria-pressed",on)};sf();fv.onclick=()=>{favs.has(k)?favs.delete(k):favs.add(k);saveFavs();sf()};
  w.querySelector(".shr").onclick=async()=>{const u=location.href.split("#")[0]+"#e/"+slug(e);try{if(navigator.share){await navigator.share({title:e.title,text:`${e.title} · ${e.venue}`,url:u});return}await navigator.clipboard.writeText(u);toast("Bağlantı kopyalandı")}catch(_){}};
  showSheet(w,"#e/"+slug(e))}
/* Etkinlik tanımı: bilet sitelerinin tanıtım metinleri kullanılmaz; olgulardan (tür, mekân, süre, yaş, düzenleyen) kendi cümlemiz kurulur.
   Organizatörün kendisinin gönderdiği (elle eklenen) metin varsa o gösterilir. */
const SALES=/^(biletix|biletinial|passo|bubilet|biletino|mobilet|sanatçepte|sanatcepte|iticket|bilkent bilet)$/i;
function descOf(e){if(e.manual&&e.desc)return e.desc;const org=e.org&&!SALES.test(e.org.trim())?e.org:"";
  const f=[e.dur&&`süre ${e.dur}`,e.age&&`${e.age.replace("+","")} yaş ve üzeri`,org&&`düzenleyen ${org}`].filter(Boolean).join(" · ");
  return `${e.genre||CATS[e.cat]} · ${e.venue}.${f?" "+f[0].toLocaleUpperCase("tr")+f.slice(1)+".":""} Kadro, program ve kurallar için bilet sayfasına göz at.`}
/* ---------- Bilgi sayfaları ---------- */
const PAGES={hakkinda:["Hakkında",`<p><b>Ne Var Ne Yok? Ankara</b>, Ankara'da yapılacak konser, tiyatro, stand-up, opera, bale, çocuk etkinliği, festival, parti ve atölyeleri tek sayfada toplayan bağımsız bir etkinlik rehberidir.</p><p>Bilet satmıyoruz. Her etkinlikte, bileti satan sitelerin hepsi fiyatlarıyla yan yana gösterilir; “Bilet al” düğmesi seni doğrudan o sitenin satış sayfasına götürür. Satın alma, iade ve değişiklik işlemleri ilgili bilet sitesinin kurallarına tabidir.</p><p>Reklam almıyoruz, komisyon almıyoruz, kimseden ücret almıyoruz. Bir etkinliğin listede yer alması ya da öne çıkması için ödeme yapılmaz.</p><p><b>Yoğun ilgi</b> işareti, bilet sitelerindeki verilere dayanır: tükenen seans, çok sayıda seans, büyük salon ve birden fazla sitede satış gibi işaretlerden en az ikisi bulunan etkinliklere verilir. Kimse bu işaret için ödeme yapmaz.</p>`],
 kaynaklar:["Veri kaynakları ve güncelleme",`<p>Etkinlikler bilet sitelerinin, kurumların, mekânların ve belediyelerin herkese açık sayfalarından toplanır. Şu an taranan kaynaklar: <span class="srcl"></span></p><p>Toplama her sabah yeniden yapılır; öğleden sonra da bilinen etkinliklerin fiyat ve satış durumu bir kez daha kontrol edilir. Bir site o gün okunamazsa son doğrulanmış bilgisi korunur. Tarihi geçen etkinlikler kendiliğinden kaldırılır. Elle eklenen etkinlikler de aynı listeye katılır.</p><p>Gösterilen fiyat, o sitede listelenen en uygun kategoridir. Fiyat, seans ve satış durumu satış sitesinde değişebilir; satın almadan önce bilet sayfasını kontrol et.</p><p><b>Hava durumu</b> Open-Meteo'dan anlık alınır; 16 günden ileri tarihlerde mevsim normali gösterilir ve öyle etiketlenir. Mekân konumları Google Haritalar'a bağlanır.</p><p class="upd2"></p>`],
 gizlilik:["Gizlilik",`<p>Bu site hesap açtırmaz, form doldurtmaz ve kişisel veri toplamaz. Çerez ya da reklam takibi kullanmaz.</p><p>Kaç kişinin siteye girdiğini görmek için çerezsiz bir sayaç (GoatCounter) kullanılır: kimliğin, IP adresin ya da cihaz kimliğin saklanmaz; yalnızca girilen sayfa, gelinen site ve tarayıcı türü gibi kimseyi tanımlamayan toplam sayılar tutulur. Uygulamayı indirme ve "Bilet al" düğmelerine kaç kez basıldığı da aynı şekilde yalnızca sayı olarak tutulur.</p><p>Kaydettiğin etkinlikler, tema tercihin ve girişi bir kez izlediğin bilgisi yalnızca kendi tarayıcında (yerel depolama) saklanır; sunucuya gönderilmez. Tarayıcı verilerini silerek bunları kaldırabilirsin.</p><p>Hava durumu için tarayıcın Open-Meteo'ya Ankara'nın sabit koordinatlarıyla istek gönderir; senin konumun gönderilmez. Bilet sitelerine ve Google Haritalar'a gittiğinde o sitelerin kendi gizlilik kuralları geçerlidir.</p>`],
 kosullar:["Kullanım koşulları",`<p>Bu site bilgilendirme amaçlıdır. Etkinlik bilgileri (ad, tarih, saat, mekân, fiyat, satış durumu) herkese açık sayfalardan otomatik toplanır; tanıtım metinleri kopyalanmaz. Afişler kopyalanmaz ve sunucumuzda saklanmaz: yalnızca yayımlandıkları kaynak adresten, değiştirilmeden gösterilir (gömülür) ve her afişin üzerinde kaynağı yazar. Kaynak afişi kaldırdığında bizde de görünmez. Etkinlik tanımları bu bilgilerden site tarafından yazılır. Toplayıcı kendini <i>NeVarNeYokBot</i> olarak tanıtır ve sitelerin robots.txt kurallarına uyar.</p><p>Hak sahipleri bir içeriğin kaldırılmasını <a href="mailto:${SITE.contact}?subject=Kald%C4%B1rma%20talebi">${SITE.contact}</a> adresinden isteyebilir; talep en geç 48 saat içinde, afişlerde 24 saat içinde yerine getirilir.</p><p>Etkinlik bilgileri; doğruluğu için özen gösterilir ama tarih, saat, fiyat ve satış durumunda değişiklik olabilir. Kesin bilgi her zaman etkinliğin satıldığı sitededir.</p><p>Bilet satın alma işlemleri bu sitede değil, bağlantı verilen bilet sitelerinde yapılır; o işlemlerden ilgili site sorumludur. Etkinlik adları, afişler ve markalar sahiplerine aittir. Afişi olmayan etkinliklerde görülen görseller site tarafından çizilmiş temsili çizimlerdir.</p>`],
 iletisim:["İletişim",""]};
function openPage(k){const[ttl,html]=PAGES[k];const w=document.createElement("div");w.className="pg";w.innerHTML=`<h2 id="sheetT"></h2>${html}`;w.querySelector("h2").textContent=ttl;
  if(k==="iletisim"){const L=[];if(SITE.contact)L.push(`E-posta: <a href="mailto:${SITE.contact}">${SITE.contact}</a>`);if(SITE.instagram)L.push(`Instagram: <a href="https://instagram.com/${SITE.instagram}" target="_blank" rel="noopener">@${SITE.instagram}</a>`);
    if(SITE.repo)L.push(`Hata bildirimi ve etkinlik önerisi: <a href="https://github.com/${SITE.repo}/issues/new" target="_blank" rel="noopener">GitHub üzerinden yaz</a>`);
    const add=SITE.contact?`mailto:${SITE.contact}?subject=${encodeURIComponent("Etkinlik ekleme")}&body=${encodeURIComponent("Etkinlik adı:\nTarih ve saat:\nMekân:\nKategori (konser, tiyatro…):\nBilet bağlantısı:\nKısa tanım (isteğe bağlı, kendi metniniz):\nDüzenleyen:\n")}`:"";
    w.insertAdjacentHTML("beforeend",`<p>Öneri, düzeltme ya da eklenmesini istediğin bir etkinlik için bize ulaş.</p>${L.length?`<p>${L.join("<br>")}</p>`:"<p>İletişim bilgileri yakında burada olacak.</p>"}
      ${add?`<h3>Etkinliğini ekle</h3><p>Organizatör ya da mekân isen etkinliğini bize kendin gönderebilirsin; kendi yazdığın tanım da sitede yer alır. <a href="${add}">E-postayla gönder</a></p>`:""}
      ${SITE.contact?`<h3>Kaldırma talebi</h3><p>Hak sahibi olduğun bir içeriğin sitede yer almasını istemiyorsan <a href="mailto:${SITE.contact}?subject=${encodeURIComponent("Kaldırma talebi")}">bize yaz</a>. Talep en geç 48 saat içinde yerine getirilir ve içerik bir daha listelenmez.</p>`:""}`)}
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

/* ---------- GİRİŞ: NE VAR NE Y_K belirir → büyüteç dönerek gelip O olur → camı zamanın rengiyle dolar ve parlar → sayfaya geçilir ---------- */
window.spTimers=[];window.spAnims=[];
function introLogo(){const sp=document.getElementById("splash");if(!sp||spLeft)return;
  const ring=sp.querySelector(".sp-logo .sr-ring"),glass=sp.querySelector(".sp-logo .sr-glass"),O=sp.querySelector(".sp-logo .O"),quick=sp.classList.contains("quick");
  if(matchMedia("(prefers-reduced-motion: reduce)").matches){ring.style.opacity=glass.style.opacity=1;return}
  ring.style.opacity=1;
  const a=ring.animate([{transform:"translate(170%,-160%) rotate(220deg) scale(.55)",opacity:0},{opacity:1,offset:.25},{transform:"translate(-6%,4%) rotate(-14deg) scale(1.12)",offset:.78},{transform:"none",opacity:1}],{duration:quick?560:900,delay:quick?60:160,easing:"cubic-bezier(.3,.9,.35,1)",fill:"both"});spAnims.push(a);
  a.onfinish=()=>{glass.style.opacity=1;if(spLeft)return;
    spAnims.push(glass.animate([{opacity:0,transform:"scale(.35)"},{opacity:1,transform:"scale(1.1)",offset:.6},{opacity:1,transform:"none"}],{duration:620,easing:"cubic-bezier(.3,1.3,.5,1)"}));
    spAnims.push(O.animate([{transform:"none"},{transform:"scale(1.08)",offset:.45},{transform:"none"}],{duration:620,easing:"ease-out"}));
    spTimers.push(setTimeout(leaveSplash,quick?650:1100))}}
function startIntro(){const sp=document.getElementById("splash");if(!sp){document.documentElement.classList.remove("spl");introDone();return}
  const go=()=>{if(sp.classList.contains("go"))return;sp.classList.add("go");
    const quick=sp.classList.contains("quick");spTimers.push(setTimeout(introLogo,quick?700:4350));spTimers.push(setTimeout(leaveSplash,quick?6000:12000))};
  // yazı tipleri ve ilk çizim bitince başla (takılma olmasın), en fazla 900 ms bekle
  Promise.race([document.fonts?document.fonts.ready:Promise.resolve(),new Promise(r=>setTimeout(r,900))]).then(()=>requestAnimationFrame(()=>requestAnimationFrame(go)))}
render();startSky();setTimeout(fromHash,50);startIntro();
document.getElementById("heroLogo")?.classList.add("rest");
/* ---------- Ayarlar (tema) ve Filtreler ---------- */
(()=>{const sb=document.getElementById("setBtn"),P=document.getElementById("setP"),O=document.getElementById("themeOpts"),N=document.getElementById("themeNote");
  try{localStorage.removeItem("nvny-theme")}catch(e){}
  const NOTE={oto:"Tema Ankara'da güneşin konumuna göre kendiliğinden değişir: sabah, gün, gün batımı ve gece.",sabah:"Sabah teması sabit kalır.",gun:"Gün teması sabit kalır.",gunbatimi:"Gün batımı teması sabit kalır.",gece:"Gece teması sabit kalır."};
  const paint=()=>{const v=themePref();O.querySelectorAll("button").forEach(b=>b.setAttribute("aria-checked",b.dataset.v===v));N.textContent=NOTE[v]||""};
  const open=o=>{P.hidden=!o;sb.setAttribute("aria-expanded",o)};
  sb.onclick=e=>{e.stopPropagation();open(P.hidden)};P.querySelector(".sp-x").onclick=()=>open(false);
  document.addEventListener("click",e=>{if(!P.hidden&&!P.contains(e.target))open(false)});document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!P.hidden){open(false);sb.focus()}});
  O.onclick=e=>{const b=e.target.closest("button");if(!b)return;const H=document.documentElement;H.classList.add("tswitch");clearTimeout(O._t);O._t=setTimeout(()=>H.classList.remove("tswitch"),1400);try{localStorage.setItem("nvny-tema",b.dataset.v)}catch(err){}paint();if(sky.state)update(new Date())};
  const at=document.getElementById("animT");at.checked=animOn();if(reduce){at.disabled=true}
  at.onchange=()=>{try{localStorage.setItem("nvny-anim",at.checked?"1":"0")}catch(e){}if(at.checked)kick();else fxFrame(performance.now(),true);if(sky.state)paintBg(performance.now())};
  paint();
  const fb=document.getElementById("filtBtn"),row=document.getElementById("selRow"),fn=document.getElementById("filtN");
  const setF=o=>{row.classList.toggle("shut",!o);fb.setAttribute("aria-expanded",o)};setF(matchMedia("(min-width:900px)").matches);
  fb.onclick=()=>setF(row.classList.contains("shut"));
  const cnt=()=>{let k=0;row.querySelectorAll("select").forEach(s=>{if(s.id!=="fSort"&&s.value!=="all")k++});fn.hidden=!k;fn.textContent=k};
  row.addEventListener("change",cnt);document.addEventListener("click",()=>setTimeout(cnt,0));cnt();})();


/* UYGULAMAYI İNDİR: Android'de Chrome'un kendi yükleme penceresi (gerçek uygulama olarak kurulur, uyarı yok; service worker gerekmez),
   iPhone'da "Ana Ekrana Ekle" adımları, Instagram gibi uygulama içi tarayıcılarda "tarayıcıda aç" yönlendirmesi.
   Telefonda giriş bittikten birkaç saniye sonra altta küçük bir düğme çıkar; kapatılırsa 7 gün görünmez. Uygulama olarak açıldıysa hiçbiri görünmez. */
(()=>{const ua=navigator.userAgent,isApp=matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
  if(isApp){document.documentElement.classList.add("app");return}
  const ios=/iPhone|iPad|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1),and=/Android/i.test(ua),
    inApp=/Instagram|FBAN|FBAV|FB_IAB|FBIOS|Line\/|TikTok|musical_ly|Twitter|Snapchat|LinkedInApp/i.test(ua),samsung=/SamsungBrowser/i.test(ua),
    P=document.getElementById("appPill"),S=document.getElementById("appSheet"),B=S.querySelector(".as-b");
  let dp=null,done=false;
  addEventListener("beforeinstallprompt",e=>{e.preventDefault();dp=e});
  addEventListener("appinstalled",()=>{gcEv("uygulama-kuruldu","Uygulama kuruldu");done=true;hidePill();sheet("ok")});
  const url=location.href.split("#")[0];
  const body=k=>k==="ok"?`<p>Kuruldu! Ne Var Ne Yok artık uygulamalarının arasında.</p>`
    :k==="inapp"?(and?`<p>Bu sayfa Instagram'ın içinde açıldı; uygulama buradan kurulamıyor.</p><a class="as-btn" href="intent://${location.host}${location.pathname}#Intent;scheme=https;package=com.android.chrome;end">Chrome'da aç</a><p style="margin-top:12px;font-size:12px;opacity:.75">Açılınca "Uygulamayı indir"e yeniden dokun.</p>`
      :`<p>Bu sayfa Instagram'ın içinde açıldı. Uygulamayı kurmak için:</p><ol><li>Sağ üstteki <kbd>⋯</kbd> menüsüne dokun</li><li><b>"Tarayıcıda aç"</b>ı seç (Safari)</li><li>Açılınca "Uygulamayı indir"e yeniden dokun</li></ol>`)
    :k==="ios"?`<p>iPhone'da üç adımda kurulur:</p><ol><li>Alttaki <kbd>Paylaş</kbd> simgesine (kare ve yukarı ok) dokun</li><li><b>"Ana Ekrana Ekle"</b>yi seç</li><li>Sağ üstte <b>"Ekle"</b>ye dokun</li></ol><p style="font-size:12px;opacity:.75">Ne Var Ne Yok simgesiyle ana ekranına gelir, tam ekran açılır.</p>`
    :k==="samsung"?`<p>Samsung İnternet'te:</p><ol><li>Alttaki <kbd>☰</kbd> menüye dokun</li><li><b>"Sayfayı ekle"</b> → <b>"Ana ekran"</b>ı seç</li></ol><p style="font-size:12px;opacity:.75">Chrome'da açarsan tek dokunuşla kurulur.</p>`
    :and?`<p>Chrome'da:</p><ol><li>Sağ üstteki <kbd>⋮</kbd> menüye dokun</li><li><b>"Uygulamayı yükle"</b> ya da <b>"Ana ekrana ekle"</b>yi seç</li></ol>`
    :`<p>Bilgisayarda adres çubuğunun sağındaki <kbd>⊕ Yükle</kbd> simgesine tıkla. Telefonda açarsan tek dokunuşla kurulur:</p><p><b>${location.host}</b></p>`;
  function sheet(k){gcEv("indir-yonerge-"+k,"İndirme yönergesi: "+k);B.innerHTML=body(k);S.hidden=false;S.classList.add("out");requestAnimationFrame(()=>requestAnimationFrame(()=>S.classList.remove("out")))}
  function closeSheet(){S.classList.add("out");setTimeout(()=>{S.hidden=true},300)}
  S.addEventListener("click",e=>{if(e.target===S||e.target.closest(".as-x"))closeSheet()});
  async function go(){hidePill();
    if(dp){const d=dp;dp=null;try{await d.prompt();const r=await d.userChoice;if(r.outcome==="accepted")return}catch{}}
    sheet(inApp?"inapp":ios?"ios":samsung?"samsung":"and")}
  document.addEventListener("click",e=>{const b=e.target.closest("[data-app]");if(b){e.preventDefault();gcEv("indir-dugmesi","Uygulamamızı indirin düğmesi");go()}});
  function hidePill(){if(!P||P.hidden)return;P.classList.add("out");setTimeout(()=>{P.hidden=true},450)}
  if(P)P.querySelector(".ap-x").onclick=()=>{hidePill();try{localStorage.setItem("nvny-app-x",String(Date.now()))}catch{}};
  let x=0;try{x=+localStorage.getItem("nvny-app-x")||0}catch{}
  if(P&&(ios||and)&&Date.now()-x>7*864e5)afterIntro(()=>setTimeout(()=>{if(done)return;P.hidden=false;P.classList.add("out");requestAnimationFrame(()=>requestAnimationFrame(()=>P.classList.remove("out")))},4000));
})();

/* SAYAÇ OLAYLARI (GoatCounter, çerezsiz; yalnızca toplam sayılar): uygulama olarak açılış, "Bilet al" tıklamaları (site adına göre) */
function gcEv(p,t){const f=()=>{try{window.goatcounter&&goatcounter.count&&goatcounter.count({path:p,title:t||p,event:true})}catch(e){}};if(window.goatcounter&&goatcounter.count)f();else setTimeout(f,3000)}
(()=>{if(matchMedia("(display-mode: standalone)").matches||navigator.standalone===true){try{if(!sessionStorage.getItem("nvny-gc-app")){sessionStorage.setItem("nvny-gc-app","1");gcEv("uygulama-acilis","Uygulama olarak açıldı")}}catch(e){}}
  document.addEventListener("click",e=>{const a=e.target.closest("a.vc-buy,a.b-buy");if(!a)return;let h="";try{h=new URL(a.href).hostname.replace(/^www\./,"")}catch(x){}gcEv("bilet-al/"+(h||"bilinmiyor"),"Bilet al: "+(h||"?"))},true)})();
