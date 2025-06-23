const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get message history with pagination and filters
router.get('/', async (req, res) => {
    try {
        console.log('Fetching history with params:', req.query);
        
        // Test database connection first
        try {
            await db.query('SELECT 1');
            console.log('Database connection is working');
        } catch (dbError) {
            console.error('Database connection test failed:', dbError);
            return res.status(500).json({
                success: false,
                message: 'Database connection failed',
                error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
            });
        }
        
        // Validate and sanitize input parameters
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
        const offset = (page - 1) * limit;
        const status = req.query.status && ['sent', 'replied'].includes(req.query.status) 
            ? req.query.status 
            : '';
        const search = (req.query.search || '').trim();
        
        // Verify messages table exists
        try {
            await db.query('DESCRIBE messages');
            console.log('Messages table exists');
        } catch (tableError) {
            console.error('Messages table check failed:', tableError);
            return res.status(500).json({
                success: false,
                message: 'Database table not found',
                error: process.env.NODE_ENV === 'development' ? 'Table messages does not exist' : undefined
            });
        }
        
        // SIMPLER APPROACH: Use direct SQL with concatenated conditions
        let whereClause = '1=1';
        
        if (status) {
            whereClause += ` AND status = '${status}'`;
        }
        
        if (search) {
            const searchPattern = `%${search.trim()}%`;
            whereClause += ` AND (nama_nasabah LIKE '${searchPattern}' OR nomor_telepon LIKE '${searchPattern}' OR no_rekening LIKE '${searchPattern}')`;
        }
        
        // Count total records
        const countQuery = `SELECT COUNT(*) as total FROM messages WHERE ${whereClause}`;
        console.log('Count query:', countQuery);
        
        const [countResult] = await db.query(countQuery);
        const total = countResult[0].total;
        
        // Get paginated data
        const dataQuery = `SELECT * FROM messages WHERE ${whereClause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
        console.log('Data query:', dataQuery);
        
        const [messages] = await db.query(dataQuery);
        console.log(`Found ${messages.length} messages out of ${total} total`);
        
        res.json({
            success: true,
            data: messages,
            pagination: {
                total: total,
                page: page,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('History fetch error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        
        return res.status(500).json({
            success: false,
            message: 'Error fetching history',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
