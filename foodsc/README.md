# FoodSC — AI Food Scanner & Personal Nutrition Assistant

FoodSC adalah aplikasi web untuk mengenali makanan dari foto dan menyajikan estimasi nutrisi. Frontend berupa HTML/CSS/JavaScript statis yang di-host di Netlify. Backend AI berjalan di Cloudflare Workers dan memanggil Groq Vision API.

## Teknologi
- HTML5, CSS3, Vanilla JavaScript
- Netlify untuk hosting frontend statis
- Cloudflare Workers untuk endpoint backend
- Groq Vision API untuk analisis gambar
- LocalStorage untuk biodata, akun demo, status login, dan riwayat

## Struktur
```text
foodsc/
├── index.html, biodata.html, login.html, register.html
├── dashboard.html, scanner.html, history.html
├── profile.html, recommendations.html
├── assets/css/
├── assets/js/
├── cloudflare/worker.mjs
├── cloudflare/wrangler.toml
├── netlify.toml
└── README.md
```

## Prasyarat
- Node.js versi LTS
- Akun Netlify
- Akun Cloudflare
- Akun GroqCloud dan API Key
- Git (opsional, untuk deployment GitHub)

## 1. Jalankan website secara lokal
1. Ekstrak ZIP.
2. Buka terminal di folder project.
3. Jalankan `npm install`.
4. Jalankan `npm run dev`.
5. Buka URL lokal yang ditampilkan Netlify CLI (biasanya `http://localhost:8888`).

Kamera browser membutuhkan HTTPS atau localhost. Untuk menguji endpoint Worker secara lokal, gunakan instruksi di bagian Cloudflare.

## 2. Buat API Key Groq
1. Buka https://console.groq.com/ dan buat/login akun.
2. Buka bagian API Keys.
3. Buat API Key baru dan salin sekali saat ditampilkan.
4. Jangan masukkan API Key ke file frontend, GitHub, atau LocalStorage.

Dokumentasi vision: https://console.groq.com/docs/vision  
Daftar model: https://console.groq.com/docs/models

## 3. Pilih model vision
Konfigurasi awal menggunakan `qwen/qwen3.8-27b` sesuai dokumentasi model vision Groq yang diperiksa saat pembuatan project. Ketersediaan model dapat berubah dan dapat bergantung pada akun. Periksa daftar model aktif dan kemampuan vision di dokumentasi Groq sebelum deploy. Model dapat diganti melalui `GROQ_MODEL` pada konfigurasi Cloudflare.

## 4. Deploy Cloudflare Worker
1. Buat akun Cloudflare dan instal Wrangler:
   `npm install`
2. Login:
   `npx wrangler login`
3. Buka `cloudflare/wrangler.toml`.
4. Ganti `ALLOWED_ORIGIN` dengan domain Netlify yang sebenarnya. Saat pengujian lokal, origin harus disesuaikan dengan origin lokal yang dipakai.
5. Periksa `GROQ_MODEL`.
6. Tambahkan secret API Key:
   `npx wrangler secret put GROQ_API_KEY --config cloudflare/wrangler.toml`
7. Tempel API Key saat terminal memintanya.
8. Deploy:
   `npx wrangler deploy --config cloudflare/wrangler.toml`

Setelah deploy, catat URL Worker, misalnya `https://foodsc-api.<subdomain>.workers.dev`.

## 5. Hubungkan frontend ke Worker
Buka `assets/js/app.js`, cari deklarasi `window.FoodSC=...` dan tambahkan konfigurasi berikut di dalam IIFE sebelum penutup:
```js
window.FOODSC_WORKER_URL = "https://foodsc-api.SUBDOMAIN.workers.dev/scan";
```
Ganti URL dengan URL Worker milikmu. Jangan menambahkan API Key di sini.

Pastikan `ALLOWED_ORIGIN` pada `cloudflare/wrangler.toml` sama persis dengan origin website Netlify, misalnya `https://nama-site.netlify.app`, tanpa slash di akhir. Deploy ulang Worker setelah mengubah konfigurasi:
`npx wrangler deploy --config cloudflare/wrangler.toml`

## 6. Uji Worker
Tes endpoint dengan curl (ganti URL dan path gambar):
```bash
curl -X POST "https://foodsc-api.SUBDOMAIN.workers.dev/scan" \
  -F "image=@contoh-makanan.jpg;type=image/jpeg" \
  -F 'context={"goal":"Menjaga pola makan sehat","allergies":""}'
```
Worker akan mengembalikan JSON. Uji juga file yang bukan gambar, gambar lebih dari 5 MB, API Key tidak valid, dan model yang tidak tersedia. Jangan pernah menguji dengan membagikan API Key ke orang lain.

## 7. Upload ke GitHub
1. Buat repository baru.
2. Pastikan file rahasia tidak masuk repository. `.gitignore` sudah mengecualikan `.env` dan direktori lokal.
3. Jalankan:
```bash
git init
git add .
git commit -m "Initial FoodSC application"
git branch -M main
git remote add origin https://github.com/USERNAME/foodsc.git
git push -u origin main
```

## 8. Hubungkan ke Netlify
1. Login ke Netlify.
2. Pilih Add new site → Import an existing project.
3. Hubungkan GitHub dan pilih repository FoodSC.
4. Build command dapat dikosongkan untuk situs statis ini.
5. Publish directory isi dengan `.`.
6. Deploy site.

`netlify.toml` sudah menetapkan publish directory root.

## 9. Konfigurasi dan redeploy
- `GROQ_API_KEY`: simpan sebagai Cloudflare Worker Secret, bukan Netlify variable atau frontend variable.
- `GROQ_MODEL`: variabel konfigurasi Worker di `cloudflare/wrangler.toml`.
- `ALLOWED_ORIGIN`: domain frontend Netlify yang diizinkan.

Setelah mengubah secret atau variabel, deploy ulang Worker. Setelah mengubah file frontend, push perubahan ke GitHub agar Netlify membangun ulang situs.

## 10. Alur aplikasi
1. Pengunjung mengisi biodata.
2. Pengunjung membuat akun demo.
3. Pengguna login.
4. Dashboard menampilkan profil dan riwayat.
5. Scanner menerima foto galeri atau kamera.
6. Gambar dikirim ke Cloudflare Worker.
7. Worker memvalidasi gambar dan mengirimkannya ke Groq Vision.
8. Hasil JSON ditampilkan dan disimpan ke LocalStorage.

## 11. Keamanan dan keterbatasan penting
- Akun dan autentikasi di project ini hanya demonstrasi lokal. Password di-hash menggunakan Web Crypto, tetapi hash dan status akun berada di LocalStorage sehingga tetap dapat dimanipulasi oleh pengguna perangkat. Ini bukan autentikasi aman untuk aplikasi publik.
- LocalStorage hanya tersedia pada browser/perangkat yang sama dan dapat hilang ketika data browser dibersihkan. Tidak ada sinkronisasi antarperangkat atau database online.
- Biodata, termasuk informasi yang mungkin sensitif, disimpan di browser. Gunakan hanya data uji yang tidak sensitif.
- Worker membatasi origin CORS, tipe file, dan ukuran file, tetapi CORS bukan autentikasi dan tidak mencegah semua penyalahgunaan endpoint. Untuk layanan publik, tambahkan autentikasi server-side, rate limiting, dan mekanisme anti-abuse.
- API Key hanya disimpan sebagai Cloudflare Worker Secret. Jangan pernah menaruhnya di frontend.
- Nutrisi adalah estimasi visual, bukan pengukuran laboratorium. Foto tidak mengungkap semua bahan, minyak, saus, atau ukuran porsi.
- FoodSC tidak mendiagnosis, mengobati, atau menggantikan tenaga kesehatan. Untuk alergi, periksa label dan kontaminasi silang. Jika ada kondisi kesehatan atau alergi, diskusikan pilihan makanan dengan tenaga kesehatan.
- Rekomendasi adalah inspirasi umum, bukan diet khusus atau instruksi pembatasan makan.

## 12. Pemecahan masalah
- **CORS error:** pastikan `ALLOWED_ORIGIN` cocok persis dengan domain website (termasuk `https://`), lalu deploy ulang Worker.
- **API Key belum dikonfigurasi:** jalankan `wrangler secret put GROQ_API_KEY`.
- **401 dari Groq:** periksa API Key dan pastikan secret tersimpan pada Worker yang benar.
- **Model tidak ditemukan / 400:** periksa model vision aktif di dokumentasi Groq dan ubah `GROQ_MODEL`.
- **429:** batas penggunaan Groq tercapai; tunggu sebelum mencoba kembali.
- **Kamera tidak terbuka:** gunakan HTTPS atau localhost, izinkan akses kamera, dan pastikan perangkat memiliki kamera.
- **Gambar terlalu besar:** pilih gambar JPEG/PNG/WebP di bawah 5 MB.
- **Riwayat tidak muncul:** pastikan browser tidak memblokir LocalStorage dan gunakan browser/perangkat yang sama.

## Lisensi dan penggunaan
Project ini merupakan starter aplikasi demonstrasi. Periksa syarat layanan Groq, Cloudflare, dan Netlify sebelum penggunaan publik.
