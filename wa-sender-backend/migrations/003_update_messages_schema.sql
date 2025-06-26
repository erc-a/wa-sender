-- First, drop the NOT NULL constraint on skor_kredit
ALTER TABLE messages ALTER COLUMN skor_kredit DROP NOT NULL;

-- Add the new boolean columns with defaults
ALTER TABLE messages ADD COLUMN IF NOT EXISTS macet boolean DEFAULT true;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS daftar_hitam boolean DEFAULT true;

-- Finally, drop the skor_kredit column as it's no longer needed
ALTER TABLE messages DROP COLUMN skor_kredit;
