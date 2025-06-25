const express = require('express');
const router = express.Router();
const { pool, supabase } = require('../config/database');
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
        console.log('Received send message request:', req.body); // Debug log
        
        const { to, message, formData } = req.body;
        
        if (!to || !message) {
            console.log('Missing required fields:', { to: !!to, message: !!message }); // Debug log
            return res.status(400).json({
                success: false,
                message: 'Phone number and message are required'
            });
        }
        
        // Log form data if available
        if (formData) {
            console.log('Form data received:', formData);
        }

        console.log(`Attempting to send message to: ${to}`); // Debug log
        console.log(`Message length: ${message.length} characters`); // Debug log
        
        const result = await whatsappService.sendMessage(to, message);
        
        console.log('Send message result:', result); // Debug log
          // Log to database if available
        if (db) {
            try {
                // Parse message to extract customer info (using more precise regex patterns)
                let nama_nasabah = 'Unknown';
                let no_rekening = 'Unknown';
                let jumlah_tunggakan = 0;
                let skor_kredit = 0;
                
                // Extract information from the message using more precise patterns
                try {
                    // Extract customer name (looking for the pattern right after "Halo" at the beginning)
                    const nameMatch = message.match(/Halo ([^,\n]+)/);
                    if (nameMatch && nameMatch[1]) {
                        nama_nasabah = nameMatch[1].trim();
                    }
                    
                    // Extract account number (looking specifically for the format with label)
                    const rekeningMatch = message.match(/No\. Rekening: ([^\n]+)/);
                    if (rekeningMatch && rekeningMatch[1]) {
                        no_rekening = rekeningMatch[1].trim();
                    }
                    
                    // Extract debt amount with more precise pattern
                    const tunggakanMatch = message.match(/tunggakan kredit sebesar ([^\n.]+)/);
                    if (tunggakanMatch && tunggakanMatch[1]) {
                        // Convert to number, handling IDR format
                        const amountStr = tunggakanMatch[1].replace(/[^\d]/g, '');
                        jumlah_tunggakan = parseInt(amountStr);
                    }
                    
                    // Extract credit score from status line
                    const skorMatch = message.match(/Status Kredit: ([^\n]+)/);
                    if (skorMatch && skorMatch[1]) {
                        // Try to determine score from status text
                        const statusText = skorMatch[1].toLowerCase();
                        if (statusText.includes('lancar')) {
                            skor_kredit = 1;
                        } else if (statusText.includes('dpk') || statusText.includes('1-90')) {
                            skor_kredit = 2;
                        } else if (statusText.includes('tidak lancar') || statusText.includes('91-120')) {
                            skor_kredit = 3;
                        } else if (statusText.includes('diragukan') || statusText.includes('121-180')) {
                            skor_kredit = 4;
                        } else if (statusText.includes('macet') || statusText.includes('180')) {
                            skor_kredit = 5;
                        } else {
                            skor_kredit = 650;
                        }
                    } else {
                        skor_kredit = 650; // Default
                    }
                } catch (parseError) {
                    console.warn('Failed to parse message data:', parseError);
                }
                  // Use form data if available, otherwise use parsed data
                if (req.body.formData) {
                    nama_nasabah = req.body.formData.nama_nasabah || nama_nasabah;
                    no_rekening = req.body.formData.no_rekening || no_rekening;
                    jumlah_tunggakan = req.body.formData.jumlah_tunggakan || jumlah_tunggakan;
                    skor_kredit = req.body.formData.skor_kredit || skor_kredit;
                }
                
                console.log('Inserting message with final data:', {
                    nama_nasabah,
                    nomor_telepon: result.to,
                    no_rekening,
                    jumlah_tunggakan,
                    skor_kredit
                });
                  await pool.query(
                    'INSERT INTO messages (nama_nasabah, nomor_telepon, no_rekening, jumlah_tunggakan, skor_kredit, status, wa_message_id, sent_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                    [nama_nasabah, result.to, no_rekening, jumlah_tunggakan, skor_kredit, 'sent', result.messageId || null, new Date()]
                );
                console.log('Message logged to database'); // Debug log
            } catch (dbError) {
                console.error('Failed to log message to database:', dbError);
            }
        }
        
        res.json(result);
    } catch (error) {
        console.error('Error in send message route:', error);
        console.error('Error stack:', error.stack); // Debug log
        
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to send message'
        });
    }
});

module.exports = router;
