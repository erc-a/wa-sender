# WhatsApp Sender Backend

Aplikasi ini menggunakan PostgreSQL dengan Supabase sebagai database. Berikut adalah langkah-langkah untuk mengatur dan menjalankan aplikasi:

## Konfigurasi Database

1. Buat akun Supabase dan buat project baru di [app.supabase.com](https://app.supabase.com)
2. Setelah project dibuat, buka SQL Editor di dashboard Supabase
3. Jalankan script SQL dari file `database.sql` untuk membuat tabel yang diperlukan
4. Dapatkan informasi koneksi database dari menu Settings > Database

## Konfigurasi Aplikasi

1. Salin file `.env.example` menjadi `.env`
2. Isi informasi koneksi Supabase dan database di file `.env`:
   - `SUPABASE_URL`: URL Supabase Anda
   - `SUPABASE_KEY`: Anon/Public key dari Supabase
   - `DB_HOST`: Host database PostgreSQL (biasanya `db.[project-id].supabase.co`)
   - `DB_PORT`: Port database (biasanya 5432)
   - `DB_USER`: Username database (biasanya `postgres`)
   - `DB_PASSWORD`: Password database yang Anda tetapkan saat membuat project
   - `DB_NAME`: Nama database (biasanya `postgres`)
   - `DB_SSL`: Set `true` untuk koneksi aman

## Menjalankan Aplikasi

1. Install dependensi: `npm install`
2. Jalankan server: `npm run start` atau `npm run dev` untuk mode pengembangan

## Migrasi dari MySQL

Jika Anda bermigrasi dari MySQL ke PostgreSQL, perhatikan perubahan berikut:

1. Format parameter query berubah dari `?` menjadi `$1`, `$2`, dll.
2. Nama kolom case-sensitive di PostgreSQL
3. ENUM di MySQL diubah menjadi CHECK constraint di PostgreSQL
4. AUTO_INCREMENT diubah menjadi SERIAL
5. ON UPDATE CURRENT_TIMESTAMP diganti dengan trigger
