const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all messages with pagination and filters
router.get('/', async (req, res) => {
    try {
        console.log('Fetching history with params:', req.query);
        
        // Get all messages
        const messages = await db.getMessages();
        
        // Calculate today's total
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTotal = messages.filter(m => {
            const messageDate = new Date(m.created_at);
            return messageDate >= today;
        }).length;
        
        // Calculate total (all time)
        const allTimeTotal = messages.length;
        
        // Apply filters
        let filteredMessages = messages;
        
        // Status filter
        if (req.query.status && ['sent', 'replied'].includes(req.query.status)) {
            filteredMessages = filteredMessages.filter(m => m.status === req.query.status);
        }
        
        // Search filter
        if (req.query.search) {
            const search = req.query.search.toLowerCase();
            filteredMessages = filteredMessages.filter(m => 
                m.nama_nasabah.toLowerCase().includes(search) ||
                m.nomor_telepon.includes(search) ||
                m.no_rekening.includes(search)
            );
        }
        
        // Pagination
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
        const total = filteredMessages.length;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;
        
        // Apply pagination
        const paginatedMessages = filteredMessages.slice(offset, offset + limit);
        
        res.json({
            success: true,
            data: paginatedMessages,
            pagination: {
                page,
                limit,
                total,
                totalPages
            },
            stats: {
                todayCount: todayTotal,
                totalCount: allTimeTotal
            }
        });
        
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch history',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
