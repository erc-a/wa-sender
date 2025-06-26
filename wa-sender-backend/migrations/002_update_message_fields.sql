-- Remove skor_kredit and add new boolean columns
ALTER TABLE messages DROP COLUMN skor_kredit;
ALTER TABLE messages ADD COLUMN macet BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE messages ADD COLUMN daftar_hitam BOOLEAN NOT NULL DEFAULT true;
