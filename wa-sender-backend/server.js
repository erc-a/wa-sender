const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Add a middleware to handle database errors for database routes
app.use((req, res, next) => {
    // Skip this middleware for whatsapp endpoints which don't need database
    if (req.path.startsWith('/api/whatsapp')) {
        return next();
    }
    
    // Check if database pool is initialized
    if (!pool || !pool.query) {
        return res.status(503).json({
            success: false,
            message: 'Database service unavailable',
            error: process.env.NODE_ENV === 'development' ? 'Database connection not established' : undefined
        });
    }
      next();
});

// Database connection 
const { pool, supabase } = require('./config/database');

const testDatabaseConnection = async () => {
    try {
        await pool.query('SELECT 1');
        console.log('Connected to PostgreSQL database');
        
        try {
            // Test if messages table exists
            const { rows } = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public'
                    AND table_name = 'messages'
                )
            `);
            
            if (!rows[0].exists) {
                console.error('messages table does not exist, creating...');
                // Read and execute database.sql
                const fs = require('fs');
                const path = require('path');
                const sql = fs.readFileSync(path.join(__dirname, 'database.sql'), 'utf8');
                
                // Execute SQL script for PostgreSQL
                const queries = sql.split(';').filter(q => q.trim().length > 0);
                for(const query of queries) {
                    await pool.query(query);
                }
                console.log('Database schema created successfully');
            } else {
                console.log('messages table exists');
            }
        } catch (tableError) {
            console.error('Error checking for messages table:', tableError);
        }
    } catch (err) {
        console.error('Database initialization error:', err);
        // Continue running the server even if database connection fails
        // This allows the WhatsApp functionality to work independently
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
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        return res.status(503).json({
            success: false,
            message: 'Database service unavailable',
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
    console.log(`- API URL: http://localhost:${PORT}/api`);
    console.log(`- WhatsApp status: http://localhost:${PORT}/api/whatsapp/status`);
    console.log(`- History endpoint: http://localhost:${PORT}/history`);
});
