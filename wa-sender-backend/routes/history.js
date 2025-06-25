const express = require('express');
const router = express.Router();
const { pool, supabase } = require('../config/database');

// Get all messages with pagination and filters
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
        }        // Initialize base queries and params array
        let query = 'SELECT * FROM messages WHERE 1=1';
        let countQuery = 'SELECT COUNT(*) as total FROM messages WHERE 1=1';
        const params = [];

        // Add status filter if provided and valid
        if (status) {
            console.log(`Adding status filter: ${status}`);
            query += ' AND status = ?';
            countQuery += ' AND status = ?';
            params.push(String(status)); // Ensure status is string
        }        // Add search filter if provided
        if (search) {
            const searchPattern = `%${search.trim()}%`; // Trim whitespace
            query += ' AND (nama_nasabah ILIKE $' + (params.length + 1) + ' OR nomor_telepon ILIKE $' + (params.length + 2) + ' OR no_rekening ILIKE $' + (params.length + 3) + ')';
            countQuery += ' AND (nama_nasabah ILIKE $' + (params.length + 1) + ' OR nomor_telepon ILIKE $' + (params.length + 2) + ' OR no_rekening ILIKE $' + (params.length + 3) + ')';
            params.push(searchPattern, searchPattern, searchPattern);
        }
        
        // Get total count before adding pagination
        console.log('Executing count query:', countQuery, 'with params:', JSON.stringify(params));
        const countResult = await pool.query(countQuery, [...params]); // Clone params to avoid reference issues
        const total = parseInt(countResult.rows[0].total);
        
        // Add sorting and pagination to the main query
        query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
        // Ensure parameters are sent as correct type for PostgreSQL
        params.push(parseInt(limit), parseInt(offset));

        // Log queries for debugging
        console.log('Building queries with parameters:');
        console.log('Page:', page, 'Limit:', limit, 'Offset:', offset);
        console.log('Status:', status, 'Search:', search);
        console.log('Final Query:', query);
        console.log('Params length:', params.length);
        console.log('Final Parameters:', JSON.stringify(params));        try {            // Get paginated results - use new params array to avoid any reference issues
            const queryParams = [...params];
            console.log('Executing main query with params:', JSON.stringify(queryParams));
            const result = await pool.query(query, queryParams);
            const messages = result.rows;
            console.log(`Found ${messages.length} messages out of ${total} total`);
        } catch (queryError) {
            console.error('Error executing main query:', queryError);
            throw queryError;
        }

        res.json({
            success: true,
            data: messages,
            pagination: {
                total: total,
                page: page,
                pages: Math.ceil(total / limit)
            }
        });    } catch (error) {
        console.error('History fetch error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        
        // Handle specific database errors
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(500).json({
                success: false,
                message: 'Database table not found. Please ensure the database is properly initialized.',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
        
        if (error.code === 'ER_BAD_FIELD_ERROR') {
            return res.status(500).json({
                success: false,
                message: 'Database schema error. Column referenced in query does not exist.',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
        
        if (error.code === 'PROTOCOL_CONNECTION_LOST') {
            return res.status(500).json({
                success: false,
                message: 'Database connection was lost. Please try again.',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error fetching history',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get a single message by ID
router.get('/:id', async (req, res) => {
    try {        const result = await pool.query(
            'SELECT * FROM messages WHERE id = $1',
            [req.params.id]
        );
        
        const messages = result.rows;

        if (messages.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        res.json({
            success: true,
            data: messages[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching message',
            error: error.message
        });
    }
});

// Update message status when reply received
router.put('/:id/reply', async (req, res) => {
    try {
        const { replyMessage } = req.body;
          const updateResult = await pool.query(
            `UPDATE messages 
             SET status = 'replied', 
                 reply_message = $1,
                 replied_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING *`,
            [replyMessage, req.params.id]
        );

        if (updateResult.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }        // Get updated message
        const result = await pool.query(
            'SELECT * FROM messages WHERE id = $1',
            [req.params.id]
        );

        res.json({
            success: true,
            data: messages[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating message',
            error: error.message
        });
    }
});

module.exports = router;
