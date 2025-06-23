const express = require('express');
const router = express.Router();
const db = require('../config/database');
const whatsappService = require('../services/whatsapp');

// Get WhatsApp connection status
router.get('/status', (req, res) => {
    try {
        const status = {
            isReady: whatsappService.isReady,
            isInitializing: whatsappService.isInitializing,
            lastError: whatsappService.lastError,
            qrCode: whatsappService.qrCode
        };
        res.json(status);
    } catch (error) {
        console.error('Error getting WhatsApp status:', error);
        res.status(500).json({ error: 'Failed to get WhatsApp status' });
    }
});

// Format pesan WhatsApp
function formatMessage(data) {
    return `*PEMBERITAHUAN TUNGGAKAN KREDIT*

Yth. Bapak/Ibu ${data.nama_nasabah}
No. Rekening: ${data.no_rekening}

Dengan hormat,
Kami informasikan bahwa rekening Bapak/Ibu tercatat memiliki tunggakan sebesar Rp ${Number(data.jumlah_tunggakan).toLocaleString('id-ID')}.

Status kredit Anda saat ini:
${getSkorKreditDescription(data.skor_kredit)}

Mohon segera melakukan pembayaran untuk menghindari denda keterlambatan.

Abaikan pesan ini jika sudah melakukan pembayaran.

Terima kasih.
*Bank BRI*`;
}

function getSkorKreditDescription(skor) {
    const descriptions = {
        1: 'Kredit Lancar - Tidak pernah menunggak',
        2: 'Kredit DPK - Menunggak 1-90 hari',
        3: 'Kredit Tidak Lancar - Menunggak 91-120 hari',
        4: 'Kredit Diragukan - Menunggak 121-180 hari',
        5: 'Kredit Macet - Menunggak lebih dari 180 hari'
    };
    return descriptions[skor] || 'Status kredit tidak diketahui';
}

// Get QR Code for WhatsApp Web
router.get('/qr', (req, res) => {
    try {
        // Check if a refresh is requested via query param
        const forceRefresh = req.query.refresh === 'true';
        const hardReset = req.query.hardReset === 'true';
        
        if (forceRefresh) {
            console.log('Forcing complete QR code refresh from API request...', 
                        hardReset ? '(WITH HARD RESET)' : '', 
                        new Date().toISOString());
            
            // Completely reinitialize the service
            if (hardReset) {                // For hard reset, force clean all session data first
                console.log('PERFORMING HARD RESET OF SESSION');
                
                // Use async/await pattern for session clearing and initialization
                (async () => {
                    try {
                        // Clear session first
                        await whatsappService.clearSession();
                        
                        // Give a moment for file system operations to complete
                        setTimeout(async () => {
                            try {
                                await whatsappService.initialize(true); // true = destructive reinit
                            } catch (err) {
                                console.error('Error during hard reset initialization:', err);
                            }
                        }, 1000);
                    } catch (err) {
                        console.error('Error during session clearing:', err);
                    }
                })();} else {
                // Handle normal initialize
                whatsappService.initialize().catch(err => {
                    console.error('Error during normal QR refresh initialization:', err);
                });
            }
            
            return res.json({
                success: true,
                message: 'QR code refresh initiated. Please wait while a new QR code is generated.',
                qr: null,
                refreshing: true,
                hardReset: hardReset,
                timestamp: new Date().toISOString()
            });
        }
          const qr = whatsappService.getQRCode();
        if (qr) {
            const requestId = Math.random().toString(36).substring(2, 10);
            console.log(`Sending QR code to client (request ${requestId})`, new Date().toISOString());
            
            // Send the QR code with cache-busting headers
            return res.set({
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Surrogate-Control': 'no-store'
            }).json({ 
                success: true, 
                qr: qr, // Return exactly as is - don't modify the data URL
                requestId,
                timestamp: new Date().toISOString()
            });
        } else {
            // If no QR code is available, force a reinitialize and inform the client
            if (!whatsappService.isClientReady() && !whatsappService.isInitializingClient()) {
                console.log('No QR code available, triggering initialize...', new Date().toISOString());
                whatsappService.initialize();
            }
            
            return res.json({ 
                success: false, 
                message: 'QR Code not available yet. Please try again in a few seconds.',
                qr: null,
                isInitializing: whatsappService.isInitializingClient(),
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Error getting QR code:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error fetching QR code', 
            error: error.message 
        });
    }
});

// Send a new message
router.post('/send', async (req, res) => {
    try {
        const {
            namaNasabah,
            nomorTelepon,
            noRekening,
            jumlahTunggakan,
            skorKredit
        } = req.body;

        // Validate input
        if (!namaNasabah || !nomorTelepon || !noRekening || !jumlahTunggakan || !skorKredit) {
            return res.status(400).json({ message: 'Semua field harus diisi' });
        }

        const messageData = {
            nama_nasabah: namaNasabah,
            nomor_telepon: nomorTelepon,
            no_rekening: noRekening,
            jumlah_tunggakan: jumlahTunggakan,
            skor_kredit: skorKredit
        };

        // Format the message
        const formattedMessage = formatMessage(messageData);

        // Send WhatsApp message
        const waMessage = await whatsappService.sendMessage(nomorTelepon, formattedMessage);

        // Save to database
        const [result] = await db.execute(
            `INSERT INTO messages (nama_nasabah, nomor_telepon, no_rekening, jumlah_tunggakan, skor_kredit, wa_message_id, status)
             VALUES (?, ?, ?, ?, ?, ?, 'sent')`,
            [namaNasabah, nomorTelepon, noRekening, jumlahTunggakan, skorKredit, waMessage.id.id]
        );

        // Get the inserted message
        const [message] = await db.execute(
            'SELECT * FROM messages WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            message: 'Pesan berhasil dikirim',
            data: message[0]
        });

    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengirim pesan',
            error: error.message
        });
    }
});

module.exports = router;
