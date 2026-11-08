import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL,SUPABASE_ANON_KEY,SITE_URL } from "./config.js";
const $ = (id) => document.getElementById(id);
const configured =
  /^https:\/\/[a-zA-Z0-9-]+\.supabase\.co\/?$/.test(SUPABASE_URL) &&
  !!SUPABASE_ANON_KEY &&
  !SUPABASE_ANON_KEY.includes("PASTE_");
const db = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const msg = (id, text) => { $(id).textContent = text; };
const siteBase = () => SITE_URL.endsWith("/") ? SITE_URL : `${SITE_URL}/`;
function showDash(on){$("dashboard").classList.toggle("hidden",!on);$("loginCard").classList.toggle("hidden",on);}
function clearForm(){$("letterForm").reset();$("letterId").value="";$("editorTitle").textContent="Buat surat";msg("formStatus","");}
function randomToken(){const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);return [...bytes].map(b=>b.toString(16).padStart(2,"0")).join("");}
async function sha256(s){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("");}
async function checkAdmin(){
 if (!configured) { showDash(false); msg("loginStatus", "Isi URL dan anon/publishable key Supabase di config.js terlebih dahulu."); return; }
 const {data:{user}}=await db.auth.getUser();if(!user){showDash(false);return;}
 const {data,error}=await db.from("admin_users").select("user_id").eq("user_id",user.id).maybeSingle();
 if(error||!data){await db.auth.signOut();showDash(false);msg("loginStatus","Akun ini belum terdaftar sebagai admin.");return;}
 showDash(true);await loadRows();
}
$("loginForm").addEventListener("submit",async e=>{
 e.preventDefault();
 if (!configured) { msg("loginStatus", "Isi URL dan anon/publishable key Supabase di config.js terlebih dahulu."); return; }
 msg("loginStatus","Memeriksa akun…");
 const {error}=await db.auth.signInWithPassword({email:$("adminEmail").value.trim(),password:$("adminPassword").value});
 if(error){msg("loginStatus","Login gagal. Periksa email dan password.");return;}
 await checkAdmin();
});
$("logoutBtn").addEventListener("click",async()=>{await db.auth.signOut();showDash(false);});
async function loadRows(){
 msg("dashStatus","Memuat data…");
 const {data,error}=await db.from("letters").select("id,recipient_name,recipient_email,published,token_hash,created_at").order("created_at",{ascending:false});
 if(error){msg("dashStatus","Gagal memuat data. Periksa setup SQL dan RLS.");return;}
 const tbody=$("letterRows");tbody.replaceChildren();
 for(const r of data||[]){
  const tr=document.createElement("tr");
  for(const val of [r.recipient_name,r.recipient_email||"—",r.published?"Terbit":"Draft"]){const td=document.createElement("td");td.textContent=val;tr.appendChild(td);}
  const linkCell=document.createElement("td");
  if(r.token_hash){const copy=document.createElement("button");copy.textContent="Salin link";copy.addEventListener("click",async()=>{const {data:raw,error}=await db.rpc("admin_get_letter_token",{p_letter_id:r.id});if(error||!raw){msg("dashStatus","Tidak bisa mengambil link. Buat ulang link surat.");return;}const url=siteBase()+"?letter="+encodeURIComponent(raw);
   try { await navigator.clipboard.writeText(url); msg("dashStatus","Link personal berhasil disalin."); }
   catch { window.prompt("Salin link personal ini:", url); }});linkCell.appendChild(copy);}
  else linkCell.textContent="Belum ada link";
  tr.appendChild(linkCell);
  const actions=document.createElement("td");
  const edit=document.createElement("button");edit.textContent="Edit";edit.addEventListener("click",()=>editRow(r.id));
  const del=document.createElement("button");del.textContent="Hapus";del.className="danger";del.addEventListener("click",()=>deleteRow(r.id,r.recipient_name));
  actions.append(edit,del);tr.appendChild(actions);tbody.appendChild(tr);
 }
 msg("dashStatus",`${(data||[]).length} surat tersimpan.`);
}
$("newBtn").addEventListener("click",()=>{clearForm();$("editor").classList.remove("hidden");$("editor").scrollIntoView({behavior:"smooth"});});
$("cancelBtn").addEventListener("click",()=>{$("editor").classList.add("hidden");clearForm();});
async function editRow(id){
 const {data,error}=await db.from("letters").select("*").eq("id",id).single();if(error){msg("dashStatus","Tidak bisa membuka surat.");return;}
 clearForm();$("letterId").value=data.id;$("recipientName").value=data.recipient_name;$("recipientEmail").value=data.recipient_email||"";
 $("body").value=data.body;$("senderName").value=data.sender_name||"";$("published").checked=data.published;
 $("editorTitle").textContent="Edit surat";$("editor").classList.remove("hidden");$("editor").scrollIntoView({behavior:"smooth"});
}
async function deleteRow(id,name){if(!confirm(`Hapus surat untuk ${name}?`))return;const {error}=await db.from("letters").delete().eq("id",id);if(error){msg("dashStatus","Gagal menghapus surat.");return;}await loadRows();}
$("letterForm").addEventListener("submit",async e=>{
 e.preventDefault();msg("formStatus","Menyimpan surat…");
 const id=$("letterId").value, files=[...$("photos").files];
 const payload={recipient_name:$("recipientName").value.trim(),recipient_email:$("recipientEmail").value.trim().toLowerCase(),body:$("body").value,sender_name:$("senderName").value.trim(),published:$("published").checked};
 let letterId=id, tokenHash=null, rawToken=null;
 if(!id){
  rawToken=randomToken();
  tokenHash=await sha256(rawToken);
  payload.token_hash=tokenHash;
  payload.token_value=rawToken;
 }
 if(id){const {error}=await db.from("letters").update(payload).eq("id",id);if(error){msg("formStatus","Gagal menyimpan surat.");return;}}
 else{const {data,error}=await db.from("letters").insert(payload).select("id").single();if(error){msg("formStatus","Gagal membuat surat. Periksa setup database.");return;}letterId=data.id;}
 for(const f of files){
  if(!["image/jpeg","image/png","image/webp"].includes(f.type)||f.size>5*1024*1024){msg("formStatus",`Lewati ${f.name}: gunakan JPG/PNG/WebP maksimal 5 MB.`);continue;}
  const safe=f.name.replace(/[^a-zA-Z0-9._-]/g,"-"),path=`${letterId}/${Date.now()}-${safe}`;
  const {error}=await db.storage.from("letter-photos").upload(path,f,{upsert:false,contentType:f.type});
  if(error){msg("formStatus",`Surat tersimpan, tetapi foto ${f.name} gagal diunggah.`);await loadRows();return;}
 }
 if(rawToken){
  const url=siteBase()+"?letter="+encodeURIComponent(rawToken);
  try{await navigator.clipboard.writeText(url);msg("formStatus","Surat dibuat. Link personal baru sudah disalin. Simpan link ini sekarang; token tidak ditampilkan lagi.");}
  catch{window.prompt("Salin link personal ini dan simpan:", url);msg("formStatus","Surat dibuat. Jika link tidak tersalin, salin dari kotak yang muncul.");}
 }else msg("formStatus","Surat berhasil diperbarui. Link lama tetap sama.");
 $("editor").classList.add("hidden");clearForm();await loadRows();
});
if (!configured) {
 showDash(false);
 msg("loginStatus", "Konfigurasi Supabase belum diisi. Admin perlu melengkapi config.js.");
} else {
 const {data:{session}}=await db.auth.getSession();
 if(session) await checkAdmin();
}
