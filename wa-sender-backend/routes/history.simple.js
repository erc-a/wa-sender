const express = require('express');
const router = express.Router();
const { pool, supabase } = require('../config/database');

// Get message history with pagination and filters
router.get('/', async (req, res) => {
    try {
        console.log('New simplified history endpoint called with params:', req.query);
        
        // Parse pagination parameters
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
        const offset = (page - 1) * limit;
        
        // Parse filter parameters
        const status = req.query.status && ['sent', 'replied'].includes(req.query.status) ? req.query.status : '';
        const search = (req.query.search || '').trim();
        const dateFilter = (req.query.date || '').trim(); // New date filter parameter
          try {
            // Check if database pool is properly initialized
            if (!pool || !pool.query) {
                return res.status(503).json({
                    success: false,
                    message: 'Database service unavailable',
                    error: 'Database connection not established'
                });
            }
            
            // Test the connection directly
            await pool.query('SELECT 1 as test');
            
            // Initialize query and params
            let query = 'SELECT * FROM messages WHERE 1=1';
            let countQuery = 'SELECT COUNT(*) as total FROM messages WHERE 1=1';
            const params = [];
              // Add status filter if provided
            if (status) {
                const paramIndex = params.length + 1;
                query += ` AND status = $${paramIndex}`;
                countQuery += ` AND status = $${paramIndex}`;
                params.push(status);
            }
              // Add search filter if provided - with improved search capabilities
            if (search) {
                // Split search terms by spaces to allow multi-term search
                const searchTerms = search.split(' ').filter(term => term.trim() !== '');
                
                if (searchTerms.length > 0) {
                    const searchConditions = [];
                    const searchParams = [];
                    
                    // Build search conditions for each term
                    searchTerms.forEach(term => {
                        const trimmedTerm = term.trim();
                        if (trimmedTerm) {
                            const searchPattern = `%${trimmedTerm}%`;
                              // Add condition for each field we want to search
                            const paramStart = params.length + searchParams.length + 1;
                            searchConditions.push(`(
                                nama_nasabah ILIKE $${paramStart} OR 
                                nomor_telepon ILIKE $${paramStart+1} OR 
                                no_rekening ILIKE $${paramStart+2} OR
                                CAST(jumlah_tunggakan AS TEXT) ILIKE $${paramStart+3} OR
                                CAST(skor_kredit AS TEXT) ILIKE $${paramStart+4}
                            )`);
                            
                            // Add parameters for each field in the condition
                            searchParams.push(
                                searchPattern, 
                                searchPattern, 
                                searchPattern, 
                                searchPattern,
                                searchPattern
                            );
                        }
                    });
                    
                    if (searchConditions.length > 0) {
                        // Combine all search conditions with AND between different terms
                        query += ' AND (' + searchConditions.join(' AND ') + ')';
                        countQuery += ' AND (' + searchConditions.join(' AND ') + ')';
                        
                        // Add all search parameters
                        params.push(...searchParams);
                        
                        console.log('Search conditions:', searchConditions);
                        console.log('Search params count:', searchParams.length);
                    }
                }
            }            // Add date filter if provided
        if (dateFilter) {
            console.log('Filtering by date:', dateFilter);
            const paramIndex = params.length + 1;
            query += ` AND DATE(created_at) = $${paramIndex}`;
            countQuery += ` AND DATE(created_at) = $${paramIndex}`;
            params.push(dateFilter); // Should be in YYYY-MM-DD format
        }
              // Get total count with filters
            const countResult = await pool.query(countQuery, params);
            const total = parseInt(countResult.rows[0].total);
            
            // Add pagination to main query
            const limitParamIndex = params.length + 1;
            const offsetParamIndex = params.length + 2;
            query += ` ORDER BY created_at DESC LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}`;
            const queryParams = [...params, limit, offset];
            
            // Get paginated results
            const result = await pool.query(query, queryParams);
            const messages = result.rows;// Fetch statistics independently of the current filter
            // Use separate queries to ensure they're not affected by the current filter parameters
              // Get count of today's messages - using CURRENT_DATE for server's date
            const todayResult = await pool.query(`
                SELECT COUNT(*) as "todayCount" 
                FROM messages 
                WHERE DATE(created_at) = CURRENT_DATE
            `);
            const todayCount = parseInt(todayResult.rows[0].todayCount || 0, 10);
            
            // Get total count of all messages
            const totalResult = await pool.query('SELECT COUNT(*) as "totalCount" FROM messages');
            const totalCount = parseInt(totalResult.rows[0].totalCount || 0, 10);
            
            console.log('Stats calculated:', { todayCount, totalCount });
            
            return res.json({
                success: true,
                data: messages || [],
                pagination: {
                    total: total,
                    page: page,
                    pages: Math.ceil(total / limit)
                },
                stats: {
                    todayCount: todayCount,
                    totalCount: totalCount
                }
            });
        } catch (error) {
            console.error('Database error:', error);
            
            // Try creating the table if it doesn't exist
            if (error.code === 'ER_NO_SUCH_TABLE') {
                console.log('Table not found, attempting to create it...');
                try {                    const fs = require('fs');
                    const path = require('path');
                    const sql = fs.readFileSync(path.join(__dirname, '..', 'database.sql'), 'utf8');
                    
                    // Execute SQL script for PostgreSQL
                    const queries = sql.split(';').filter(q => q.trim().length > 0);
                    for(const query of queries) {
                        await pool.query(query);
                    }
                    console.log('Database schema created successfully');
                    
                    // Insert some test data
                    await pool.query(`
                        INSERT INTO messages (nama_nasabah, nomor_telepon, no_rekening, jumlah_tunggakan, skor_kredit, status)
                        VALUES 
                        ('Test User 1', '+621234567890', '1234567890', 1000000, 85, 'sent'),
                        ('Test User 2', '+621234567891', '1234567891', 2000000, 75, 'replied')
                    `);
                    console.log('Sample data inserted');
                    
                    // Now try to fetch the data again
                    const messagesResult = await pool.query('SELECT * FROM messages ORDER BY created_at DESC LIMIT 10');
                    const messages = messagesResult.rows;
                    
                    // Get today's count for sample data - using CURRENT_DATE for server's date
                    const todayResult = await pool.query(`
                        SELECT COUNT(*) as "todayCount" 
                        FROM messages 
                        WHERE DATE(created_at) = CURRENT_DATE
                    `);
                    const todayCount = parseInt(todayResult.rows[0].todayCount || 0, 10);
                    
                    // Get total count of messages
                    const totalResult = await pool.query('SELECT COUNT(*) as "totalCount" FROM messages');
                    const totalCount = parseInt(totalResult.rows[0].totalCount || 0, 10);
                    
                    console.log('Sample data stats:', { todayCount, totalCount });
                    
                    return res.json({
                        success: true,
                        data: messages || [],
                        pagination: {
                            total: messages.length,
                            page: 1,
                            pages: 1
                        },
                        stats: {
                            todayCount: todayCount,
                            totalCount: totalCount
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
        }    } catch (error) {
        console.error('General error in history route:', error);
        
        // Check for database connection errors
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                success: false,
                message: 'Database error',
                error: error.message
            });
        }
        
        return res.status(500).json({
            success: false,
            message: 'Error fetching history',
            error: error.message
        });
    }
});

module.exports = router;
