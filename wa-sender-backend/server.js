const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection test
const db = require('./config/database');

const testDatabaseConnection = async () => {
    try {
        await db.query('SELECT 1');
        console.log('Connected to MySQL database');
        
        // Test if wa_sender database exists
        await db.query('USE wa_sender');
        console.log('wa_sender database exists');
        
        // Test if messages table exists
        const [tables] = await db.query('SHOW TABLES LIKE "messages"');
        if (tables.length === 0) {
            console.error('messages table does not exist, creating...');
            // Read and execute database.sql
            const fs = require('fs');
            const path = require('path');
            const sql = fs.readFileSync(path.join(__dirname, 'database.sql'), 'utf8');
            await db.query(sql);
            console.log('Database schema created successfully');
        } else {
            console.log('messages table exists');
        }
    } catch (err) {
        console.error('Database initialization error:', err);
        process.exit(1); // Exit if database connection fails
    }
};

testDatabaseConnection();

// Routes
const messageRoutes = require('./routes/messages');
// Use the simplest possible implementation of history routes
const historyRoutes = require('./routes/history.simple');

// Require WhatsApp service globally
const whatsappService = require('./services/whatsapp');

// Set up route handlers
app.use('/api/messages', messageRoutes);

// Handle both /api/history and /history with the same router
app.use('/api/history', historyRoutes);
app.use('/history', historyRoutes);

// Add a debug endpoint to check if server is running
app.get('/api/debug', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running correctly',
        timestamp: new Date().toISOString()
    });
});

// Add WhatsApp specific routes
app.get('/api/whatsapp/status', (req, res) => {
    try {
        // Directly use the whatsapp service
        const whatsappService = require('./services/whatsapp');
        
        console.log('WhatsApp Status Check - Service Object:', {
            isReady: whatsappService.isReady,
            isInitializing: whatsappService.isInitializing,
            hasError: whatsappService.lastError !== null
        });
        
        const status = {
            isReady: whatsappService.isReady,
            isInitializing: whatsappService.isInitializing,
            lastError: whatsappService.lastError,
            qrCode: whatsappService.qrCode,
            connected: whatsappService.isReady
        };
        res.json(status);
    } catch (error) {
        console.error('Error getting WhatsApp status:', error);
        res.status(500).json({ error: 'Failed to get WhatsApp status' });
    }
});

app.get('/api/whatsapp/qr', async (req, res) => {
    try {
        // Use the already imported whatsappService
        console.log('WhatsApp QR Code Request - Query:', req.query);
        
        const forceRefresh = req.query.refresh === 'true';
        const hardReset = req.query.hard_reset === 'true';
        
        console.log('WhatsApp QR Code - Service State:', {
            isReady: whatsappService.isReady,
            isInitializing: whatsappService.isInitializing,
            hasQR: whatsappService.qrCode !== null,
            forceRefresh,
            hardReset
        });
        
        if (forceRefresh || hardReset) {
            await whatsappService.initialize(hardReset);
        }
        
        const qrCodeData = whatsappService.qrCode;
        
        if (whatsappService.isReady) {
            return res.json({ 
                success: true, 
                connected: true,
                message: 'WhatsApp is connected'
            });
        } else if (qrCodeData) {
            return res.json({ 
                success: true, 
                qrCode: qrCodeData,
                connected: false,
                message: 'QR Code ready for scanning'
            });
        } else if (whatsappService.isInitializing) {
            return res.json({ 
                success: true, 
                connected: false,
                initializing: true,
                message: 'WhatsApp is initializing...'
            });
        } else {
            return res.status(500).json({ 
                success: false, 
                connected: false,
                error: whatsappService.lastError || 'Unable to generate QR code'
            });
        }
    } catch (error) {
        console.error('Error getting WhatsApp QR code:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to get WhatsApp QR code',
            connected: false
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    console.error('Stack:', err.stack);
    
    // Database connection error
    if (err.code === 'ECONNREFUSED') {
        return res.status(500).json({
            success: false,
            message: 'Database connection failed',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }

    // WhatsApp connection error
    if (err.message && err.message.includes('WhatsApp')) {
        return res.status(500).json({
            success: false,
            message: err.message,
            error: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }

    // Default error
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
