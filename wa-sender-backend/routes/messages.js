const express = require('express');
const router = express.Router();
const db = require('../config/database');
const whatsappService = require('../services/whatsapp');

// Validation helper
const validateFormData = (formData) => {
    const errors = [];
    
    if (!formData) {
        return ['Form data is required'];
    }

    // Log the received data for debugging
    console.log('Validating form data:', JSON.stringify(formData, null, 2));    // Check required fields
    const requiredFields = [
        { field: 'nama_nasabah', name: 'Nama Nasabah' },
        { field: 'nomor_telepon', name: 'Nomor Telepon' },
        { field: 'no_rekening', name: 'Nomor Rekening' },
        { field: 'jumlah_tunggakan', name: 'Jumlah Tunggakan' },
        { field: 'macet', name: 'Status Macet' },
        { field: 'daftar_hitam', name: 'Status Daftar Hitam' }
    ];

    for (const { field, name } of requiredFields) {
        if (!formData[field]) {
            errors.push(`${name} is required`);
        }
    }

    // Validate phone number format
    if (formData.nomor_telepon) {
        const phoneNumber = formData.nomor_telepon.replace(/\s+/g, '');
        if (!phoneNumber.match(/^\+?[\d-]+$/)) {
            errors.push('Invalid phone number format');
        }
    }

    // Validate numeric fields
    if (formData.jumlah_tunggakan) {
        const amount = parseFloat(formData.jumlah_tunggakan);
        if (isNaN(amount) || amount <= 0) {
            errors.push('Jumlah Tunggakan must be a positive number');
        }
    }

    // Ensure boolean fields are properly typed
    if (formData.macet !== undefined && typeof formData.macet !== 'boolean') {
        formData.macet = formData.macet === 'true' || formData.macet === true;
    }
    if (formData.daftar_hitam !== undefined && typeof formData.daftar_hitam !== 'boolean') {
        formData.daftar_hitam = formData.daftar_hitam === 'true' || formData.daftar_hitam === true;
    }

    return errors;
};

// Format pesan WhatsApp
function formatMessage(data) {
    // Ensure macet and daftar_hitam are handled as booleans
    const isMacet = data.macet === true;
    const isDaftarHitam = data.daftar_hitam === true;
    
    // Get current month and year
    const currentDate = new Date();
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const currentMonth = monthNames[currentDate.getMonth()];
    const currentYear = currentDate.getFullYear();

    // Format the amount with proper Indonesian formatting
    const formattedAmount = Number(data.jumlah_tunggakan).toLocaleString('id-ID', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    // Build status text
    const statusText = isMacet ? 'Kredit Macet' : '';
    const additionalStatus = isDaftarHitam ? '(Daftar Hitam)' : '';

    return `Nasabah Kartu Kredit BRI Yth,

Dinformasikan bahwa Kartu Kredit BRI Bapak/Ibu telah masuk kolektibilitas ${statusText} pada SLIK OJK dengan keterangan sebagai berikut:

Nama Nasabah : ${data.nama_nasabah}
No Kartu : ${data.no_rekening}
Jumlah Tagihan : Rp ${formattedAmount} ${additionalStatus}

Dapatkan segera program keringanan khusus di bulan ${currentMonth} ${currentYear}:

1. Lunas diskon*
      *Surat lunas di terbitkan 1 hari
      *Cleansing slik OJK segera
      *Kartu di tutup permanent
      *Jika ingin melakukan pinjaman
       atau kredit KPR sudah bisa di
       realisasikan

*Syarat dan ketentuan berlaku
Ajukan program keringanan melalui
hubungi 085609553363
Tagihan akan diserahkan kepihak Debcollector bila tidak ada kejelasan

Terima kasih, selamat beraktifitas dan selalu jaga kesehatan
Info lebih lanjut, hubungi Contact BRI 150017`;
}

// Send message endpoint
router.post('/send', async (req, res) => {
    console.log('Received request:', {
        url: req.url,
        method: req.method,
        headers: req.headers,
        body: JSON.stringify(req.body, null, 2)
    });
    
    try {
        // Accept formData either nested or direct
        const formData = req.body.formData || req.body;
        
        // Log received form data
        console.log('Received form data:', JSON.stringify(formData, null, 2));

        // Validate form data
        const validationErrors = validateFormData(formData);
        if (validationErrors.length > 0) {
            console.log('Validation errors:', validationErrors);
            return res.status(400).json({
                success: false,
                error: validationErrors.join(', ')
            });
        }        // Process and clean form data
        const processedData = {
            nama_nasabah: formData.nama_nasabah.trim(),
            nomor_telepon: formData.nomor_telepon.replace(/\s+/g, ''),
            no_rekening: formData.no_rekening.trim(),
            jumlah_tunggakan: parseFloat(formData.jumlah_tunggakan),
            macet: formData.macet === true,
            daftar_hitam: formData.daftar_hitam === true
        };

        // Ensure phone number starts with +
        if (!processedData.nomor_telepon.startsWith('+')) {
            processedData.nomor_telepon = '+' + processedData.nomor_telepon;
        }

        // Log processed data
        console.log('Processed data:', JSON.stringify(processedData, null, 2));

        // Save message to database
        console.log('Saving message to database...');
        const savedMessage = await db.addMessage(processedData);
        
        if (!savedMessage) {
            throw new Error('Failed to save message to database');
        }
        console.log('Message saved successfully:', savedMessage);

        // Format and send WhatsApp message
        const messageText = formatMessage(processedData);
        console.log('Sending WhatsApp message to:', processedData.nomor_telepon);
        console.log('Message text:', messageText);

        const result = await whatsappService.sendMessage(
            processedData.nomor_telepon, 
            messageText
        );
        console.log('WhatsApp send result:', result);
        
        if (result.success) {
            await db.updateMessageStatus(savedMessage.id, 'sent', result.messageId);
            res.json({ 
                success: true, 
                message: 'Message sent successfully',
                messageId: result.messageId,
                data: savedMessage
            });
        } else {
            await db.updateMessageStatus(savedMessage.id, 'failed');
            throw new Error(result.error || 'Failed to send message');
        }

    } catch (error) {
        console.error('Error in /send endpoint:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to send message'
        });
    }
});

// Get all messages
router.get('/', async (req, res) => {
    try {
        const messages = await db.getMessages();
        res.json({
            success: true,
            data: messages
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch messages' 
        });
    }
});

// Get pending messages
router.get('/pending', async (req, res) => {
    try {
        const messages = await db.getPendingMessages();
        res.json({
            success: true,
            data: messages
        });
    } catch (error) {
        console.error('Error fetching pending messages:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch pending messages' 
        });
    }
});

module.exports = router;
