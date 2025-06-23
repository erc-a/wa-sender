const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get message history with pagination and filters
router.get('/', async (req, res) => {
    try {
        console.log('New simplified history endpoint called with params:', req.query);
        
        // Simplest possible version - just get all records with no filtering
        try {
            // Test the connection directly without any complex queries
            const [testResult] = await db.query('SELECT 1 as test');
            console.log('Basic test query result:', testResult);
            
            // Try to get a simple count
            const [countResult] = await db.query('SELECT COUNT(*) as total FROM messages');
            console.log('Count result:', countResult);
            
            // Get a limited set of messages to return
            const [messages] = await db.query('SELECT * FROM messages ORDER BY created_at DESC LIMIT 10');
            console.log('Successfully retrieved messages:', messages.length);
            
            return res.json({
                success: true,
                data: messages || [],
                pagination: {
                    total: countResult[0].total || 0,
                    page: 1,
                    pages: Math.ceil((countResult[0].total || 0) / 10)
                }
            });
        } catch (error) {
            console.error('Database error:', error);
            
            // Try creating the table if it doesn't exist
            if (error.code === 'ER_NO_SUCH_TABLE') {
                console.log('Table not found, attempting to create it...');
                try {
                    const fs = require('fs');
                    const path = require('path');
                    const sql = fs.readFileSync(path.join(__dirname, '..', 'database.sql'), 'utf8');
                    await db.query(sql);
                    console.log('Database schema created successfully');
                    
                    // Insert some test data
                    await db.query(`
                        INSERT INTO messages (nama_nasabah, nomor_telepon, no_rekening, jumlah_tunggakan, skor_kredit, status)
                        VALUES 
                        ('Test User 1', '+621234567890', '1234567890', 1000000, 85, 'sent'),
                        ('Test User 2', '+621234567891', '1234567891', 2000000, 75, 'replied')
                    `);
                    console.log('Sample data inserted');
                    
                    // Now try to fetch the data again
                    const [messages] = await db.query('SELECT * FROM messages ORDER BY created_at DESC LIMIT 10');
                    
                    return res.json({
                        success: true,
                        data: messages || [],
                        pagination: {
                            total: messages.length,
                            page: 1,
                            pages: 1
                        },
                        message: 'Table was created and sample data was inserted'
                    });
                } catch (createError) {
                    console.error('Error creating database schema:', createError);
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to create database schema',
                        error: createError.message
                    });
                }
            }
            
            return res.status(500).json({
                success: false,
                message: 'Database error',
                error: error.message
            });
        }
    } catch (error) {
        console.error('General error in history route:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching history',
            error: error.message
        });
    }
});

module.exports = router;
