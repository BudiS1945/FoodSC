(() => {
  const KEY = "foodsc_v1";
  const defaults = {profile:null,accounts:[],session:null,history:[]};
  function read(){try{const raw=localStorage.getItem(KEY);if(!raw)return structuredClone(defaults);const v=JSON.parse(raw);return {...defaults,...(v&&typeof v==="object"?v:{})};}catch(e){console.warn("FoodSC storage corrupted; resetting.",e);localStorage.removeItem(KEY);return structuredClone(defaults);}}
  function write(data){try{localStorage.setItem(KEY,JSON.stringify(data));return true;}catch(e){console.error(e);toast("Penyimpanan browser penuh atau tidak tersedia.");return false;}}
  function update(fn){const d=read();fn(d);write(d);return d;}
  function toast(message){const el=document.getElementById("toast");if(!el)return;el.textContent=message;el.classList.add("show");clearTimeout(window.__foodscToast);window.__foodscToast=setTimeout(()=>el.classList.remove("show"),3000);}
  function profile(){return read().profile;}
  function currentAccount(){const d=read();return d.accounts.find(a=>a.id===d.session)||null;}
  function session(){return Boolean(currentAccount());}
  function requireAuth(){if(!session()){location.href=profile()?"login.html":"biodata.html";return false;}return true;}
  function safeText(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function fmtDate(v){try{return new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v));}catch{return "";}}
  window.FOODSC_WORKER_URL = "https://YOUR-WORKER.workers.dev/scan";
  window.FoodSC={KEY,read,write,update,toast,profile,currentAccount,session,requireAuth,safeText,fmtDate};
  document.addEventListener("DOMContentLoaded",()=>{
    const page=document.body.dataset.page;
    if(["dashboard","scanner","history","profile","recommendations"].includes(page))requireAuth();
    const d=read(),acc=currentAccount(),p=d.profile;
    const name=(p&&p.fullName)||(acc&&acc.username)||"FoodSC User";
    ["sideName"].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=name;});
    ["sideAvatar","topAvatar"].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=name.trim().charAt(0).toUpperCase()||"F";});
    const today=document.getElementById("todayLabel");if(today)today.textContent=new Intl.DateTimeFormat("id-ID",{dateStyle:"medium"}).format(new Date());
    document.querySelectorAll("[data-nav]").forEach(a=>{if(a.dataset.nav===page)a.classList.add("active");});
    const menu=document.getElementById("menuToggle"),sidebar=document.getElementById("sidebar");if(menu&&sidebar)menu.addEventListener("click",()=>sidebar.classList.toggle("open"));
    const logout=document.getElementById("logoutBtn");if(logout)logout.addEventListener("click",()=>{update(x=>x.session=null);location.href="login.html";});
  });
})();