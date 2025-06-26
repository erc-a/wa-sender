const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Import database interface
const db = require('./config/database');

// Middleware
app.use(cors());
app.use(express.json());

// Add request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// Routes
const messagesRouter = require('./routes/messages');
const historyRouter = require('./routes/history');
const whatsappRouter = require('./routes/whatsapp');

// Basic health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        database: db ? 'connected' : 'not connected'
    });
});

// API routes
app.use('/api/messages', messagesRouter);
app.use('/api/history', historyRouter);
app.use('/api/whatsapp', whatsappRouter);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Database URL:', process.env.SUPABASE_URL ? 'configured' : 'missing');
});
