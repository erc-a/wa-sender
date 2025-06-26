const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsapp');

// Get WhatsApp connection status
router.get('/status', (req, res) => {
    try {
        const status = {
            isReady: whatsappService.isReady,
            isInitializing: whatsappService.isInitializing,
            lastError: whatsappService.lastError,
            qrCode: whatsappService.qrCode,
            connected: whatsappService.isReady && !whatsappService.isInitializing
        };
        res.json(status);
    } catch (error) {
        console.error('Error getting WhatsApp status:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get WhatsApp status' 
        });
    }
});

module.exports = router;
