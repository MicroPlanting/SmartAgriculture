import{initializeApp}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import{getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import{getDatabase,ref,onValue}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import{firebaseConfig,missingFields}from"./firebase-config.js";
import{audio}from"./audio.js";
import{fx}from"./particles.js";
import{evaluate,TEMPERATURE_THRESHOLD,GAS_THRESHOLD,SOIL_DRY_LIMIT}from"./thresholds.js";
const DATA_PATH="readings";
const CFG={tempMax:TEMPERATURE_THRESHOLD,gasMax:GAS_THRESHOLD,soilDry:SOIL_DRY_LIMIT,staleMs:60000,maxHist:60};

const $=id=>document.getElementById(id);
const num=v=>{const n=typeof v==="string"&&v.trim()!==""?Number(v):v;return typeof n==="number"&&Number.isFinite(n)?n:null};
const bool=v=>{if(v===true||v===1||v==="1"||/^(on|true|open)$/i.test(v))return true;if(v===false||v===0||v==="0"||/^(off|false|closed)$/i.test(v))return false;return null};
const set=(id,t)=>{const e=$(id);if(e&&e.textContent!==t)e.textContent=t};
const RM=matchMedia("(prefers-reduced-motion:reduce)").matches,tw={};
function tween(id,n,d,unit){const e=$(id);if(n===null){e.textContent="—";tw[id]=null;return}const to=Number(n.toFixed(d)),from=tw[id];tw[id]=to;
 if(RM||from==null||from===to||document.hidden){e.textContent=to.toFixed(d)+unit;return}const t0=performance.now();
 (function s(t){const k=Math.min(1,(t-t0)/500),v=from+(to-from)*(1-Math.pow(1-k,3));e.textContent=v.toFixed(d)+unit;if(k<1&&tw[id]===to)requestAnimationFrame(s)})(t0)}
const st={conn:"connecting",online:null,latest:null,recv:null,hist:[],active:false};

// ---- scroll reveal, nav, parallax ----
document.documentElement.classList.add("js");
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}}),{threshold:.15});
document.querySelectorAll(".rv").forEach(e=>io.observe(e));
const links=[...document.querySelectorAll("#links a")];
const so=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)links.forEach(a=>a.classList.toggle("on",a.getAttribute("href")==="#"+e.target.id))}),{rootMargin:"-45% 0px -50% 0px"});
document.querySelectorAll("main section[id]").forEach(s=>so.observe(s));
$("menu").onclick=()=>{const o=$("links").classList.toggle("open");$("menu").setAttribute("aria-expanded",o)};
links.forEach(a=>a.addEventListener("click",()=>{$("links").classList.remove("open");$("menu").setAttribute("aria-expanded","false")}));
if(matchMedia("(hover:hover) and (min-width:900px)").matches&&!matchMedia("(prefers-reduced-motion:reduce)").matches){
 document.querySelector(".hero").addEventListener("pointermove",e=>{const g=document.querySelector(".glow");g.style.setProperty("--px",((e.clientX/innerWidth-.5)*30)+"px");g.style.setProperty("--py",((e.clientY/innerHeight-.5)*30)+"px")})}
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(e=>console.warn("SW registration failed:",e.message));

// ---- connection status ----
const LBL={connecting:"Connecting…",connected:"Connected to Firebase",offline:"Offline — cannot reach Firebase",stale:"Stale data",auth:"Sign in required",denied:"Access denied by database rules",notconfigured:"Firebase not configured"};
function conn(){let k=st.conn;if(k==="connected"&&st.recv&&Date.now()-st.recv>CFG.staleMs)k="stale";if(k==="connected"&&!st.recv)k="connected";
 for(const id of["connPill","heroStatus"]){const p=$(id);p.className="pill"+(k==="connected"?" ok":k==="connecting"?"":" bad");p.querySelector("span").textContent=LBL[k]}
 set("updated",st.recv?`Last update received ${Math.round((Date.now()-st.recv)/1000)}s ago (${new Date(st.recv).toLocaleTimeString()}) — time received by this page, not measured`:"No data received yet");
 const nav=!navigator.onLine;if(nav){$("msg").hidden=false;$("msg").textContent="Your device is offline. Values below are NOT live."}else if((st.conn==="connected"||st.conn==="connecting")&&!st.initErr)$("msg").hidden=true}
setInterval(conn,5000);addEventListener("online",conn);addEventListener("offline",conn);

// ---- Firebase ----
let db,auth,unsub=null;
const miss=missingFields();
let app=null;
if(!miss.length){try{app=initializeApp(firebaseConfig);auth=getAuth(app);db=getDatabase(app)}catch(e){console.error("Firebase init failed:",e.message);st.initErr=true;st.conn="offline";conn();$("msg").hidden=false;$("msg").textContent="Firebase could not start: "+e.message+". Check firebase-config.js against the Firebase console."}}
if(miss.length){st.conn="notconfigured";conn();$("msg").hidden=false;$("msg").textContent="Firebase is not configured. Missing in firebase-config.js: "+miss.join(", ")+". Get them in Firebase console > Project settings > Your apps > Web app > Config."}
if(app&&db){
 onValue(ref(db,".info/connected"),s=>{st.online=s.val()===true;if(st.online&&st.conn==="offline")st.conn="connected";if(!st.online&&auth.currentUser)st.conn="offline";conn()});
 onAuthStateChanged(auth,u=>{$("authBtn").textContent=u?"Sign out":"Sign in";if(unsub){unsub();unsub=null}
  if(!u){st.conn="auth";$("msg").hidden=false;$("msg").textContent="Sign in to view live readings.";conn();return}
  st.conn="connecting";conn();$("msg").hidden=true;
  unsub=onValue(ref(db,DATA_PATH),s=>{st.conn="connected";handle(s.val());conn()},err=>{
   st.conn=/permission/i.test(err.code+err.message)?"denied":"offline";$("msg").hidden=false;
   $("msg").textContent=st.conn==="denied"?"Access denied. Check that your account is signed in and that the database rules allow authenticated reads of /"+DATA_PATH+". Do not make the database public.":"Could not read data: "+err.code;conn()})})}

// ---- parse + render ----
const KEYS=["temperature","humidity","soil","soil_raw","gas","pump","servo_angle","alarm"];
function parse(o){if(!o||typeof o!=="object")return null;const soil=o.soil;
 const r={t:num(o.temperature),h:num(o.humidity),raw:num(o.soil_raw),g:num(o.gas),pump:bool(o.pump),servo:num(o.servo_angle),alarm:bool(o.alarm),dev:num(o.timestamp)};
 r.pct=typeof soil==="number"||(typeof soil==="string"&&num(soil)!==null)?num(soil):(r.raw!==null?Math.round((4095-Math.min(4095,Math.max(0,r.raw)))/4095*100):null);
 r.dry=typeof soil==="string"&&/^(dry|wet)/i.test(soil)?/^dry/i.test(soil):(r.raw!==null?r.raw>=CFG.soilDry:null);return r}
function handle(v){if(v===null||typeof v!=="object"){st.latest=null;render();return}
 let latest,list;if(KEYS.some(k=>k in v)){latest=v;list=[v]}else{const ks=Object.keys(v).sort();list=ks.map(k=>v[k]);latest=list[list.length-1]}
 const p=parse(latest);st.latest=p;st.recv=Date.now();
 if(list.length>1&&!st.hist.length)st.hist=list.slice(-CFG.maxHist).map(parse).filter(Boolean).map(x=>({...x,at:Date.now()}));
 else if(p){st.hist.push({...p,at:Date.now()});if(st.hist.length>CFG.maxHist)st.hist.shift()}
 render();charts()}
const f=(n,d=1)=>n===null?"—":n.toFixed(d);
function render(){const p=st.latest;const na=!p;
 tween("vT",na?null:p.t,1," °C");set("sT",p&&p.t===null?"Unavailable":na?"Awaiting data":"Latest reading");
 tween("vH",na?null:p.h,1," %");set("sH",p&&p.h===null?"Unavailable":na?"Awaiting data":"Latest reading");
 set("vS",!p||p.dry===null?"—":p.dry?"DRY":"WET");set("sS",p?`${p.pct!==null?p.pct+"% moisture":"% unavailable"} · raw ${p.raw!==null?p.raw:"n/a"}`:"Awaiting data");
 tween("vG",na?null:p.g,0,"");set("sG",p&&p.g===null?"Unavailable":na?"Awaiting data":"raw units · limit "+CFG.gasMax);
 set("vP",!p||p.pump===null?"—":p.pump?"ON":"OFF");set("sP",!p?"Awaiting data":p.pump===null?"Pump state not reported":"Last reported state");
 set("vV",!p||p.servo===null?"—":(p.servo>0?"OPEN":"CLOSED"));set("sV",!p||p.servo===null?"Awaiting data":p.servo+"° (last reported)");
 const ev=p?evaluate({temperature:p.t,gas:p.g}):{temp:false,gas:false},tH=ev.temp,gH=ev.gas;
 scene(p);$("vT").closest(".card").classList.toggle("warn",!!tH);$("vG").closest(".card").classList.toggle("warn",!!gH);alertUI(tH,gH,p)}
function scene(p){const s=$("scene"),soil=$("soil");s.classList.toggle("on",!!(p&&p.pump===true));soil.classList.toggle("dry",!!(p&&p.dry===true));
 set("sceneC",!p?"Awaiting data.":`Reported soil: ${p.dry===null?"unknown":p.dry?"DRY":"WET"}. Reported pump: ${p.pump===null?"unknown":p.pump?"ON (water animated)":"OFF (no flow)"}.`)}
function alertUI(tH,gH,p){const on=tH||gH,was=st.active;$("alert").hidden=!on;
 if(on){const l=$("alertList");l.replaceChildren();
  if(tH){const li=document.createElement("li");li.textContent=`HIGH TEMPERATURE DETECTED: ${p.t.toFixed(1)} °C (limit ${CFG.tempMax} °C)`;l.append(li)}
  if(gH){const li=document.createElement("li");li.textContent=`HIGH GAS LEVEL DETECTED: ${p.g} (limit ${CFG.gasMax})`;l.append(li)}
  set("alertTitle","Emergency condition active");
  set("buzz",p.alarm===null?"Buzzer: not confirmed — this alert is inferred from the thresholds. The ESP32 controls the physical buzzer.":"Device alarm flag: "+(p.alarm?"ON":"OFF"));
  $("recovered").hidden=true;audio.setAlarmActive(true);fx.setMood("alert");set("soundHint",audio.state.alarm?"Browser alert sound is on.":"Browser alert sound is off. Turn it on under Browser sound.")}
 else{audio.setAlarmActive(false);fx.setMood("calm");set("soundHint","");if(was)$("recovered").hidden=false}
 st.active=!!on}
// ---- browser sound controls ----
const sync=()=>{const m=audio.state.music,a=audio.state.alarm;$("musicBtn").setAttribute("aria-pressed",m);$("musicBtn").textContent="Calm music: "+(m?"on":"off");
 $("heroSound").setAttribute("aria-pressed",m);$("heroSound").textContent=m?"Calm music: on":"Enable calm music";$("alarmBtn").setAttribute("aria-pressed",a);$("alarmBtn").textContent="Alert sound: "+(a?"on":"off")};
const toggleMusic=()=>{audio.setMusic(!audio.state.music);sync()};
$("musicBtn").onclick=toggleMusic;$("heroSound").onclick=toggleMusic;
$("alarmBtn").onclick=()=>{audio.setAlarmEnabled(!audio.state.alarm);sync();if(st.active)set("soundHint",audio.state.alarm?"Browser alert sound is on.":"Browser alert sound is off. Turn it on under Browser sound.")};
$("testBtn").onclick=()=>audio.test();
$("vol").value=Math.round(audio.state.vol*100);$("vol").oninput=e=>audio.setVolume(e.target.value/100);
if(!audio.supported())["musicBtn","alarmBtn","testBtn","heroSound"].forEach(i=>{$(i).disabled=true});
sync();

// ---- charts ----
const CH={};const DEF=[["cT","t","Temperature (°C)","dT","#F4C96B"],["cH","h","Humidity (%)","dH","#6EE7B7"],["cS","pct","Soil moisture (%)","dS","#10B981"],["cG","g","Gas (raw)","dG","#FF5D68"]];
function charts(){if(typeof Chart==="undefined"){DEF.forEach(d=>set(d[3],d[2]+": chart library unavailable."));return}
 for(const[cid,key,label,did,col]of DEF){const pts=st.hist.filter(x=>x[key]!==null);
  if(pts.length<2){set(did,`${label}: not enough readings yet — this chart fills as data arrives.`);continue}
  const labels=pts.map(x=>new Date(x.at).toLocaleTimeString()),data=pts.map(x=>x[key]);
  if(!CH[cid])CH[cid]=new Chart($(cid),{type:"line",data:{labels,datasets:[{label,data,borderColor:col,backgroundColor:col+"22",fill:true,tension:.3,pointRadius:0}]},options:{responsive:true,animation:false,scales:{x:{ticks:{color:"#A6B8AC",maxTicksLimit:5},title:{display:true,text:"Time received",color:"#A6B8AC"}},y:{ticks:{color:"#A6B8AC"},title:{display:true,text:label,color:"#A6B8AC"}}},plugins:{legend:{display:false}}}});
  else{const c=CH[cid];c.data.labels=labels;c.data.datasets[0].data=data;c.update("none")}
  set(did,`${label}: ${data.length} readings this session, latest ${data[data.length-1]}, min ${Math.min(...data)}, max ${Math.max(...data)}.`)}}

// ---- auth dialog ----
$("authBtn").onclick=()=>{if(!auth){$("msg").hidden=false;$("msg").textContent="Firebase is not configured yet. Fill in firebase-config.js.";return}
 if(auth.currentUser)signOut(auth);else{$("ferr").textContent="";$("dlg").showModal();$("em").focus()}};
$("cancel").onclick=()=>$("dlg").close();
$("show").onchange=e=>{$("pw").type=e.target.checked?"text":"password"};
$("form").addEventListener("submit",async e=>{e.preventDefault();if(!auth)return;$("go").disabled=true;$("go").textContent="Signing in…";$("ferr").textContent="";
 try{await signInWithEmailAndPassword(auth,$("em").value.trim(),$("pw").value);$("pw").value="";$("dlg").close()}
 catch(err){const m={"auth/invalid-credential":"Email or password is incorrect.","auth/invalid-email":"Enter a valid email address.","auth/too-many-requests":"Too many attempts. Try again later.","auth/network-request-failed":"Network error. Check your connection.","auth/operation-not-allowed":"Email/password sign-in is not enabled in the Firebase console."};
  $("ferr").textContent=m[err.code]||"Sign-in failed ("+err.code+")."}
 finally{$("go").disabled=false;$("go").textContent="Sign in"}});
conn();

addEventListener("keydown",e=>{if(e.key==="Escape"&&$("links").classList.contains("open")){$("links").classList.remove("open");$("menu").setAttribute("aria-expanded","false");$("menu").focus()}});
addEventListener("scroll",()=>document.querySelector(".nav").classList.toggle("compact",scrollY>60),{passive:true});
document.addEventListener("visibilitychange",()=>document.body.classList.toggle("paused",document.hidden));
const sc=new IntersectionObserver(es=>es.forEach(e=>e.target.classList.toggle("paused",!e.isIntersecting)));document.querySelectorAll(".hero,.scene").forEach(e=>sc.observe(e));
