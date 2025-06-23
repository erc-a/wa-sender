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

app.use('/api/messages', messageRoutes);
app.use('/api/history', historyRoutes);

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
