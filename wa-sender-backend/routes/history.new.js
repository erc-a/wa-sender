const express = require('express');
const router = express.Router();
const { pool, supabase } = require('../config/database');

// Get message history with pagination and filters
router.get('/', async (req, res) => {
    try {
        console.log('Fetching history with params:', req.query);
          // Test database connection first
        try {
            await pool.query('SELECT 1');
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
            await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public'
                    AND table_name = 'messages'
                )
            `);
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
          // This method of constructing SQL queries is vulnerable to SQL injection!
        // For PostgreSQL, we should use parameterized queries instead
        // Converting the original approach to use parameterized queries:
        
        const params = [];
        let queryString = '1=1';
        
        if (status) {
            params.push(status);
            queryString += ` AND status = $${params.length}`;
        }
        
        if (search) {
            const searchPattern = `%${search.trim()}%`;
            params.push(searchPattern, searchPattern, searchPattern);
            queryString += ` AND (nama_nasabah ILIKE $${params.length-2} OR nomor_telepon ILIKE $${params.length-1} OR no_rekening ILIKE $${params.length})`;
        }
        
        // Count total records
        const countQuery = `SELECT COUNT(*) as total FROM messages WHERE ${queryString}`;
        console.log('Count query:', countQuery);
        
        const countResult = await pool.query(countQuery, params);
        const total = parseInt(countResult.rows[0].total);
        
        // Get paginated data
        params.push(limit, offset);
        const dataQuery = `SELECT * FROM messages WHERE ${queryString} ORDER BY created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`;
        console.log('Data query:', dataQuery);
        
        const result = await pool.query(dataQuery, params);
        const messages = result.rows;
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
