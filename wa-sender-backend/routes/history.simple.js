const express = require('express');
const router = express.Router();
const db = require('../config/database');

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
            // Test the connection directly
            await db.query('SELECT 1 as test');
            
            // Initialize query and params
            let query = 'SELECT * FROM messages WHERE 1=1';
            let countQuery = 'SELECT COUNT(*) as total FROM messages WHERE 1=1';
            const params = [];
            
            // Add status filter if provided
            if (status) {
                query += ' AND status = ?';
                countQuery += ' AND status = ?';
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
                            searchConditions.push(`(
                                nama_nasabah LIKE ? OR 
                                nomor_telepon LIKE ? OR 
                                no_rekening LIKE ? OR
                                CAST(jumlah_tunggakan AS CHAR) LIKE ? OR
                                CAST(skor_kredit AS CHAR) LIKE ?
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
            }
                  // Add date filter if provided
        if (dateFilter) {
            console.log('Filtering by date:', dateFilter);
            query += ' AND DATE(created_at) = ?';
            countQuery += ' AND DATE(created_at) = ?';
            params.push(dateFilter); // Should be in YYYY-MM-DD format
        }
            
            // Get total count with filters
            const [countResult] = await db.query(countQuery, params);
            const total = countResult[0].total;
            
            // Add pagination to main query
            query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
            const queryParams = [...params, limit, offset];
            
            // Get paginated results
            const [messages] = await db.query(query, queryParams);            // Fetch statistics independently of the current filter
            // Use separate queries to ensure they're not affected by the current filter parameters
            
            // Get count of today's messages - using CURDATE() for server's date
            const [todayResult] = await db.query(`
                SELECT COUNT(*) as todayCount 
                FROM messages 
                WHERE DATE(created_at) = CURDATE()
            `);
            const todayCount = parseInt(todayResult[0].todayCount || 0, 10);
            
            // Get total count of all messages
            const [totalResult] = await db.query('SELECT COUNT(*) as totalCount FROM messages');
            const totalCount = parseInt(totalResult[0].totalCount || 0, 10);
            
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
                    const [messages] = await db.query('SELECT * FROM messages ORDER BY created_at DESC LIMIT 10');                    // Get today's count for sample data - using CURDATE() for server's date
                    const [todayResult] = await db.query(`
                        SELECT COUNT(*) as todayCount 
                        FROM messages 
                        WHERE DATE(created_at) = CURDATE()
                    `);
                    const todayCount = parseInt(todayResult[0].todayCount || 0, 10);
                    
                    // Get total count of messages
                    const [totalResult] = await db.query('SELECT COUNT(*) as totalCount FROM messages');
                    const totalCount = parseInt(totalResult[0].totalCount || 0, 10);
                    
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
