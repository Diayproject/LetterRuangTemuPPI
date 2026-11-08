import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const $ = (id) => document.getElementById(id);
const configured =
  /^https:\/\/[a-zA-Z0-9-]+\.supabase\.co\/?$/.test(SUPABASE_URL) &&
  !!SUPABASE_ANON_KEY &&
  !SUPABASE_ANON_KEY.includes("PASTE_");

const db = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const params = new URLSearchParams(location.search);
const token = params.get("letter");

function show(id) {
  ["loading", "envelopeScreen", "letterView"].forEach((x) =>
    $(x).classList.toggle("hidden", x !== id)
  );
}
function status(message) {
  $("loadStatus").textContent = message;
}
function photoUrl(objectName) {
  const safePath = String(objectName)
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/letter-photos/${safePath}`;
}

let letterData = null;

async function init() {
  if (!configured) {
    status("Website belum dikonfigurasi oleh admin.");
    return;
  }
  if (!token) {
    status("Link surat tidak lengkap. Periksa kembali tautan yang kamu terima.");
    return;
  }

  const { data, error } = await db.rpc("get_letter_by_token", { p_token: token });
  if (error || !data || !data.id) {
    status("Surat tidak ditemukan atau link sudah tidak berlaku.");
    return;
  }

  letterData = data;
  $("helloText").textContent = `Ada surat khusus untukmu, ${data.recipient_name}.`;
  show("envelopeScreen");
}

function openLetter() {
  if (!letterData) return;

  $("envelope").classList.add("open");
  $("openBtn").disabled = true;
  $("openBtn").textContent = "Membuka surat…";

  window.setTimeout(() => {
    $("recipientName").textContent = `Dear, ${letterData.recipient_name}`;
    $("letterBody").textContent = letterData.body || "";
    $("senderName").textContent = letterData.sender_name || "";

    const gallery = $("gallery");
    gallery.replaceChildren();

    (letterData.photos || []).forEach((objectName) => {
      const img = document.createElement("img");
      img.src = photoUrl(objectName);
      img.alt = "Foto kenangan";
      img.loading = "lazy";
      gallery.appendChild(img);
    });

    show("letterView");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, 900);
}

$("openBtn").addEventListener("click", openLetter);
$("envelope").addEventListener("click", openLetter);
$("envelope").addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openLetter();
  }
});

init();
