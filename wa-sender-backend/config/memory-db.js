/**
 * Simple in-memory database for use when PostgreSQL is not available
 */

// In-memory data store
const data = {
    messages: []
};

// Counter for generating IDs
let idCounter = 1;

// Simulated database client
const memoryDb = {
    // Simulated query function
    query: async (queryText, params = []) => {
        console.log('Using in-memory database. Query:', queryText);
        
        // Handle different query patterns
        if (queryText.includes('SELECT 1')) {
            return { rows: [{ '?column?': 1 }] }; // Connection test
        }
        
        // Check if messages table exists
        if (queryText.includes('SELECT EXISTS')) {
            return { rows: [{ exists: true }] }; // Table always exists in memory
        }
        
        // SELECT with COUNT
        if (queryText.includes('COUNT(*)')) {
            if (queryText.includes('WHERE DATE(created_at) = CURRENT_DATE')) {
                const today = new Date().toDateString();
                const todayCount = data.messages.filter(m => 
                    new Date(m.created_at).toDateString() === today
                ).length;
                
                return { rows: [{ todayCount }] };
            }
            
            return { rows: [{ total: data.messages.length, totalCount: data.messages.length }] };
        }
        
        // Basic SELECT
        if (queryText.startsWith('SELECT * FROM messages')) {
            let result = [...data.messages];
            
            // Apply WHERE filters
            if (params.length > 0) {
                // This is a simplified filter - in a real app you'd parse the SQL conditions
                if (queryText.includes('status =')) {
                    const statusIndex = queryText.indexOf('status =');
                    const paramIndex = parseInt(queryText.substring(statusIndex + 9)) - 1;
                    if (paramIndex >= 0 && paramIndex < params.length) {
                        result = result.filter(m => m.status === params[paramIndex]);
                    }
                }
            }
            
            // Apply ORDER BY
            if (queryText.includes('ORDER BY created_at DESC')) {
                result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            }
            
            // Apply pagination
            if (queryText.includes('LIMIT') && params.length >= 2) {
                const limit = params[params.length - 2];
                const offset = params[params.length - 1];
                result = result.slice(offset, offset + limit);
            }
            
            return { rows: result };
        }
        
        // INSERT
        if (queryText.startsWith('INSERT INTO messages')) {
            const newMessage = {
                id: idCounter++,
                nama_nasabah: params[0] || 'Test User',
                nomor_telepon: params[1] || '123456789',
                no_rekening: params[2] || '123456789',
                jumlah_tunggakan: params[3] || 1000000,
                skor_kredit: params[4] || 3,
                status: params[5] || 'sent',
                wa_message_id: params[6],
                sent_at: params[7] || new Date(),
                created_at: new Date(),
                updated_at: new Date()
            };
            
            data.messages.push(newMessage);
            return { rows: [newMessage] };
        }
        
        // Default response
        return { rows: [] };
    },
    
    // Add some test data
    initTestData: () => {
        if (data.messages.length === 0) {
            // Add 5 sample messages
            for (let i = 1; i <= 5; i++) {
                data.messages.push({
                    id: i,
                    nama_nasabah: `Test User ${i}`,
                    nomor_telepon: `+62812345678${i}`,
                    no_rekening: `10000${i}`,
                    jumlah_tunggakan: i * 500000,
                    skor_kredit: Math.min(5, Math.ceil(i / 2)),
                    status: i % 2 === 0 ? 'replied' : 'sent',
                    wa_message_id: `msg_${i}`,
                    reply_message: i % 2 === 0 ? 'This is a test reply' : null,
                    sent_at: new Date(),
                    replied_at: i % 2 === 0 ? new Date() : null,
                    created_at: new Date(),
                    updated_at: new Date()
                });
            }
            console.log('Initialized in-memory database with sample data');
        }
    }
};

memoryDb.initTestData();

module.exports = memoryDb;
