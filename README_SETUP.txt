A LETTER FOR YOU v2 — LINK PERSONAL + DASHBOARD ADMIN
VERSI PERBAIKAN

ISI FILE
- index.html          halaman surat penerima
- letter.js           membaca token dari link dan memuat surat/foto
- admin.html          dashboard admin
- admin.js            tambah/edit/hapus surat, upload foto, salin link
- config.js           URL Supabase + anon/publishable key + URL GitHub Pages
- supabase_setup.sql  tabel, fungsi RPC, RLS, bucket foto

PENTING SEBELUM MULAI
- Jangan letakkan service_role key atau secret key di config.js.
- Link peserta adalah bearer link: siapa pun yang memegang link dapat membuka surat.
- Bucket foto dibuat publik; siapa pun yang mengetahui URL foto dapat melihatnya.
- Jangan unggah foto atau isi surat yang sangat sensitif.
- Simpan salinan website lama sebelum mengganti file di repository.

LANGKAH SETUP SUPABASE
1. Buat akun dan project di https://supabase.com/
2. Pilih region terdekat yang tersedia (misalnya Singapore).
3. Buka SQL Editor > New query.
4. Buka file supabase_setup.sql, salin seluruh isinya, tempel ke SQL Editor, lalu tekan Run.
5. Buka Authentication > Users > Add user, lalu buat akun admin dengan email dan password.
   Gunakan email/password ini untuk login dashboard admin.
6. Setelah user dibuat, salin UUID user tersebut.
7. Kembali ke SQL Editor, jalankan perintah ini dengan mengganti UUID:
   insert into public.admin_users(user_id) values ('UUID-ADMIN-KAMU');
8. Buka Project Settings > API (atau Data API / API Keys, tergantung tampilan).
   Salin Project URL dan anon/public atau publishable key. Jangan salin service_role/secret key.

LANGKAH KONFIGURASI WEBSITE
9. Buka config.js.
10. Ganti PASTE_SUPABASE_PROJECT_URL dengan Project URL dari Supabase.
11. Ganti PASTE_SUPABASE_ANON_OR_PUBLISHABLE_KEY dengan anon/public atau publishable key.
12. Ganti USERNAME dan NAMA-REPOSITORY pada SITE_URL sesuai alamat GitHub Pages.
    Contoh: https://username.github.io/nama-repository/
    Pastikan ada tanda / di akhir.

LANGKAH UNGGAH KE GITHUB
13. Simpan semua file di atas pada root repository (bukan di dalam folder lain).
14. Pastikan index.html berada langsung di root repository.
15. Buka repository > Settings > Pages.
16. Pada Build and deployment, pilih Deploy from a branch.
17. Pilih branch main dan folder /(root), lalu Save.
18. Tunggu GitHub Pages selesai menerbitkan website.

ALAMAT WEBSITE
- Halaman peserta: https://username.github.io/nama-repository/
- Dashboard admin: https://username.github.io/nama-repository/admin.html

CARA MEMBUAT SURAT
1. Buka alamat dashboard admin.
2. Login dengan email dan password akun Supabase admin yang sudah didaftarkan di admin_users.
3. Klik Buat surat baru.
4. Isi nama penerima, email (opsional/catatan admin), isi surat, dan nama pengirim.
5. Pilih foto JPG/PNG/WebP, maksimal 5 MB per foto.
6. Centang Terbitkan jika surat sudah boleh dibuka peserta.
7. Klik Simpan surat.
8. Simpan link personal yang muncul. Kamu juga bisa klik Salin link di daftar surat.
9. Kirim link tersebut kepada peserta secara pribadi.

CATATAN PENGGUNAAN
- Penerima tidak perlu login dan tidak perlu verifikasi email.
- Email peserta hanya catatan admin, bukan metode autentikasi.
- Setiap surat baru mendapatkan token acak 256-bit.
- Database menyimpan hash token untuk pencocokan dan token mentah untuk fungsi salin link admin.
  Token mentah hanya dapat diambil melalui RPC yang memeriksa status admin.
- Foto lama tidak otomatis dihapus saat surat diedit atau dihapus. Untuk menghemat storage,
  hapus foto lama secara manual dari Storage > letter-photos bila sudah tidak diperlukan.
- Jika surat dihapus, linknya tidak lagi menemukan surat.
- Email otomatis tidak dikirim oleh website. Link dibagikan manual melalui WhatsApp/email.
- Uji dulu dengan dua surat dummy dan buka masing-masing link melalui browser lain/incognito.
- Jika URL Supabase atau key salah, halaman admin akan menampilkan pesan konfigurasi.

PEMECAHAN MASALAH
- "Surat tidak ditemukan": pastikan token link lengkap dan surat sudah dicentang Terbitkan.
- Login gagal: pastikan user dibuat di Authentication > Users dan UUID-nya dimasukkan ke admin_users.
- Admin tidak bisa memuat surat: pastikan SQL sudah dijalankan seluruhnya dan login dengan user admin.
- Foto tidak muncul: pastikan upload berhasil, bucket letter-photos ada, dan URL Project di config.js benar.
- GitHub Pages 404: pastikan index.html berada di root dan Pages memakai branch main / root.

KEAMANAN
Link surat bekerja seperti kunci. Siapa pun yang mendapat atau meneruskan link dapat membuka surat.
Foto berada di bucket publik. Jangan mengunggah konten privat yang tidak ingin dapat diakses lewat URL.
Jangan pernah memasukkan service_role/secret key ke file frontend atau repository GitHub.
