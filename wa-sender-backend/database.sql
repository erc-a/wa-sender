CREATE DATABASE IF NOT EXISTS wa_sender;
USE wa_sender;

CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama_nasabah VARCHAR(255) NOT NULL,
    nomor_telepon VARCHAR(20) NOT NULL,
    no_rekening VARCHAR(50) NOT NULL,
    jumlah_tunggakan DECIMAL(15,2) NOT NULL,
    skor_kredit INT NOT NULL,
    status ENUM('sent', 'replied') DEFAULT 'sent',
    wa_message_id VARCHAR(100),
    reply_message TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    replied_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
