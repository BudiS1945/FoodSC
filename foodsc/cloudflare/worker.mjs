const DEFAULT_MODEL = "qwen/qwen3.8-27b";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const corsHeaders = origin => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Vary": "Origin"
});
function json(data, status, origin) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(origin) } });
}
function normalizeNutrition(n = {}) {
  const keys = ["calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium"];
  const out = {};
  for (const key of keys) {
    const value = Number(n[key]);
    if (!Number.isFinite(value) || value < 0 || value > 100000) throw new Error("Nilai nutrisi dari AI tidak valid.");
    out[key] = Math.round(value * 10) / 10;
  }
  return out;
}
function cleanString(v, max = 600) { return typeof v === "string" ? v.slice(0, max) : ""; }
function cleanArray(v) { return Array.isArray(v) ? v.slice(0, 6).map(x => cleanString(x, 180)).filter(Boolean) : []; }
export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || "https://YOUR-SITE.netlify.app";
    const origin = request.headers.get("Origin") || "";
    const corsOrigin = origin === allowedOrigin ? origin : allowedOrigin;
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(corsOrigin) });
    const url = new URL(request.url);
    if (url.pathname !== "/scan") return json({ error: "Endpoint tidak ditemukan." }, 404, corsOrigin);
    if (origin && origin !== allowedOrigin) return json({ error: "Origin tidak diizinkan." }, 403, corsOrigin);
    if (request.method !== "POST") return json({ error: "Gunakan metode POST." }, 405, corsOrigin);
    if (!env.GROQ_API_KEY) return json({ error: "API Key Groq belum dikonfigurasi di Cloudflare Worker Secrets." }, 503, corsOrigin);
    const contentLength = Number(request.headers.get("Content-Length") || 0);
    if (contentLength > MAX_BYTES + 100_000) return json({ error: "Request terlalu besar. Maksimal gambar 5 MB." }, 413, corsOrigin);
    let form;
    try { form = await request.formData(); } catch { return json({ error: "Form-data tidak valid." }, 400, corsOrigin); }
    const image = form.get("image");
    if (!(image instanceof File)) return json({ error: "File gambar tidak ditemukan." }, 400, corsOrigin);
    if (!ALLOWED_TYPES.has(image.type)) return json({ error: "Format gambar harus JPEG, PNG, atau WebP." }, 415, corsOrigin);
    if (image.size <= 0 || image.size > MAX_BYTES) return json({ error: "Ukuran gambar harus lebih dari 0 dan maksimal 5 MB." }, 413, corsOrigin);
    let context = {};
    try { const raw = form.get("context"); if (typeof raw === "string") context = JSON.parse(raw); } catch { context = {}; }
    const safeGoal = cleanString(context.goal, 120);
    const safeAllergies = cleanString(context.allergies, 200);
    const bytes = new Uint8Array(await image.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    const base64 = btoa(binary);
    const model = env.GROQ_MODEL || DEFAULT_MODEL;
    const prompt = `Kamu adalah asisten informasi makanan. Analisis foto secara visual dan jawab dalam bahasa Indonesia. Jangan membuat diagnosis, klaim penyembuhan, atau saran diet ekstrem. Jangan menyatakan angka sebagai pasti: seluruh nutrisi adalah estimasi visual untuk satu porsi yang tampak. Jika identifikasi tidak jelas, tulis "Identifikasi belum pasti" dan confidence "rendah". Konteks preferensi pengguna (bukan fakta medis terverifikasi): tujuan="${safeGoal}", alergi yang dicatat="${safeAllergies}". Jangan menjamin makanan aman untuk alergi; ingatkan untuk memeriksa bahan, label, dan kontaminasi silang. Kembalikan HANYA JSON valid dengan struktur: {"foodName":"string","description":"string","confidence":"rendah/sedang/tinggi","portion":"string","nutrition":{"calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0,"sugar":0,"sodium":0},"benefits":["string"],"considerations":["string"],"goalFit":"string","pairings":["string"],"portionAdvice":"string","allergyNote":"string"}. Gunakan angka non-negatif. Sodium dalam mg, kalori kcal, makro dalam gram. Jika tidak dapat diperkirakan, gunakan 0 dan jelaskan keterbatasannya.`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55_000);
    let upstream;
    try {
      upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${env.GROQ_API_KEY}`, "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:${image.type};base64,${base64}` } }
          ] }],
          temperature: 0.2,
          max_completion_tokens: 1600,
          response_format: { type: "json_object" }
        })
      });
    } catch (error) {
      clearTimeout(timeout);
      if (error.name === "AbortError") return json({ error: "Permintaan ke AI melewati batas waktu. Silakan coba lagi." }, 504, corsOrigin);
      return json({ error: "Tidak dapat terhubung ke layanan AI. Periksa koneksi dan coba lagi." }, 502, corsOrigin);
    } finally { clearTimeout(timeout); }
    if (!upstream.ok) {
      const status = upstream.status;
      let detail = "";
      try { detail = (await upstream.json())?.error?.message || ""; } catch {}
      if (status === 401) return json({ error: "API Key Groq tidak valid. Periksa Worker Secret." }, 502, corsOrigin);
      if (status === 429) return json({ error: "Batas penggunaan Groq tercapai. Tunggu sebentar lalu coba lagi." }, 429, corsOrigin);
      if (status === 400 || status === 404) return json({ error: `Model vision tidak tersedia atau request ditolak. Periksa GROQ_MODEL di Cloudflare. ${cleanString(detail, 180)}` }, 502, corsOrigin);
      return json({ error: "Layanan AI sedang bermasalah. Coba lagi nanti." }, 502, corsOrigin);
    }
    let payload;
    try { payload = await upstream.json(); } catch { return json({ error: "Respons AI bukan JSON yang valid." }, 502, corsOrigin); }
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return json({ error: "AI tidak mengembalikan hasil analisis." }, 502, corsOrigin);
    let result;
    try { result = JSON.parse(content); } catch { return json({ error: "Format hasil AI tidak valid. Silakan ulangi scan." }, 502, corsOrigin); }
    try {
      const normalized = {
        foodName: cleanString(result.foodName, 100) || "Identifikasi belum pasti",
        description: cleanString(result.description, 500),
        confidence: cleanString(result.confidence, 30) || "Tidak tersedia",
        portion: cleanString(result.portion, 100) || "Tidak diketahui",
        nutrition: normalizeNutrition(result.nutrition),
        benefits: cleanArray(result.benefits),
        considerations: cleanArray(result.considerations),
        goalFit: cleanString(result.goalFit, 500),
        pairings: cleanArray(result.pairings),
        portionAdvice: cleanString(result.portionAdvice, 300),
        allergyNote: cleanString(result.allergyNote, 400)
      };
      return json({ ok: true, result: normalized }, 200, corsOrigin);
    } catch (error) { return json({ error: error.message || "Data hasil AI tidak valid." }, 502, corsOrigin); }
  }
};