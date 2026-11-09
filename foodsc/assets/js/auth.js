(() => {
 const $=s=>document.querySelector(s),F=()=>window.FoodSC;
 async function hash(value){const bytes=new TextEncoder().encode(value);const digest=await crypto.subtle.digest("SHA-256",bytes);return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("");}
 document.addEventListener("DOMContentLoaded",()=>{
  const page=document.body.dataset.page;
  if(page==="biodata"){
   const form=$("#biodataForm");
   document.querySelectorAll('input[name="hasCondition"]').forEach(x=>x.addEventListener("change",()=>$("#conditionField").hidden=x.value!=="yes"||!x.checked));
   document.querySelectorAll('input[name="hasAllergy"]').forEach(x=>x.addEventListener("change",()=>$("#allergyField").hidden=x.value!=="yes"||!x.checked));
   form.addEventListener("submit",e=>{e.preventDefault();if(!form.reportValidity())return;const fd=new FormData(form);const age=Number(fd.get("age")),height=Number(fd.get("height")),weight=Number(fd.get("weight"));if(age<13||age>100||height<80||height>250||weight<20||weight>350){F().toast("Periksa kembali umur, tinggi, dan berat.");return;}
    const p={fullName:fd.get("fullName").trim(),age,gender:fd.get("gender"),height,weight,activity:fd.get("activity"),goal:fd.get("goal"),condition:fd.get("hasCondition")==="yes"?String(fd.get("condition")||"").trim():"",allergies:fd.get("hasAllergy")==="yes"?String(fd.get("allergies")||"").trim():""};
    F().update(d=>d.profile=p);location.href="register.html";
   });
  }
  if(page==="register"){
   if(!F().profile()){location.href="biodata.html";return;}
   $("#registerForm").addEventListener("submit",async e=>{e.preventDefault();const f=e.currentTarget;if(!f.reportValidity())return;const fd=new FormData(f),username=String(fd.get("username")).trim(),email=String(fd.get("email")).trim().toLowerCase(),pw=String(fd.get("password"));if(pw!==fd.get("confirmPassword")){F().toast("Konfirmasi password tidak sama.");return;}const d=F().read();if(d.accounts.some(a=>a.email===email||a.username.toLowerCase()===username.toLowerCase())){F().toast("Username atau email sudah digunakan.");return;}const id=crypto.randomUUID();d.accounts.push({id,username,email,passwordHash:await hash(pw)});F().write(d);F().toast("Akun berhasil dibuat. Silakan login.");setTimeout(()=>location.href="login.html",700);
   });
  }
  if(page==="login"){
   document.querySelectorAll("[data-toggle-password]").forEach(b=>b.addEventListener("click",()=>{const input=document.getElementById(b.dataset.togglePassword);input.type=input.type==="password"?"text":"password";b.textContent=input.type==="password"?"Lihat":"Sembunyikan";}));
   $("#loginForm").addEventListener("submit",async e=>{e.preventDefault();const fd=new FormData(e.currentTarget),identity=String(fd.get("identity")).trim().toLowerCase(),pw=String(fd.get("password"));const d=F().read(),a=d.accounts.find(x=>x.email===identity||x.username.toLowerCase()===identity);if(!a||a.passwordHash!==await hash(pw)){F().toast("Email/username atau password tidak sesuai.");return;}d.session=a.id;F().write(d);location.href="dashboard.html";});
  }
 });
})();