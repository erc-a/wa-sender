-- PostgreSQL syntax for Supabase
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    nama_nasabah VARCHAR(255) NOT NULL,
    nomor_telepon VARCHAR(20) NOT NULL,
    no_rekening VARCHAR(50) NOT NULL,
    jumlah_tunggakan DECIMAL(15,2) NOT NULL,
    skor_kredit INT NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'replied', 'failed')),
    wa_message_id VARCHAR(100),
    reply_message TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    replied_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create function for auto-updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$ language 'plpgsql';

-- Create trigger for auto-updating updated_at
CREATE TRIGGER update_messages_modtime
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
