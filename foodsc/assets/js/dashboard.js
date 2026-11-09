(() => {
 document.addEventListener("DOMContentLoaded",()=>{
  const page=document.body.dataset.page,F=window.FoodSC;if(!F||!F.session())return;const d=F.read(),p=d.profile,h=[...d.history].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  if(page==="dashboard"){
   const w=document.getElementById("welcomeTitle");if(w)w.textContent=`Halo, ${p?.fullName?.split(" ")[0]||"teman"}!`;
   const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};set("statScans",h.length);set("statLast",h[0]?.foodName||"Belum ada");set("statGoal",p?.goal||"—");
   const recent=document.getElementById("recentScans");if(recent)recent.innerHTML=h.slice(0,4).map(x=>`<div class="recent-item"><div class="food-thumb">🍽</div><div class="recent-info"><b>${F.safeText(x.foodName)}</b><small>${F.fmtDate(x.createdAt)}</small></div><span class="recent-cal">${Number(x.nutrition?.calories||0)} kcal</span></div>`).join("")||'<div class="empty-state">Belum ada scan. Mulai dengan memotret makanan.</div>';
   const summary=document.getElementById("profileSummary");if(summary)summary.innerHTML=[["Tujuan",p?.goal||"Belum diatur"],["Aktivitas",p?.activity||"—"],["Alergi",p?.allergies||"Tidak dicatat"]].map(([a,b])=>`<div class="summary-line"><span>${a}</span><b>${F.safeText(b)}</b></div>`).join("");
   const last=document.getElementById("lastNutrition");if(last&&h[0])last.innerHTML=[["Kalori",h[0].nutrition.calories,"kcal"],["Protein",h[0].nutrition.protein,"g"],["Karbohidrat",h[0].nutrition.carbs,"g"],["Lemak",h[0].nutrition.fat,"g"],["Serat",h[0].nutrition.fiber,"g"]].map(x=>`<div class="nutri-tile"><span>${x[0]}</span><b>${Number(x[1]||0)}</b><small>${x[2]}</small></div>`).join("");
  }
 });
})();