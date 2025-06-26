const { Pool } = require('pg');

const config = {
    host: 'db.ngnyrgbyplihatiudnyh.supabase.co',
    port: 5432,
    user: 'postgres',
    password: 'Arwido6204#',
    database: 'postgres',
    ssl: {
        rejectUnauthorized: false
    }
};

async function testConnection() {
    console.log('Testing connection with config:', {
        host: config.host,
        port: config.port,
        user: config.user,
        database: config.database
    });

    const pool = new Pool(config);

    try {
        const client = await pool.connect();
        console.log('Connected successfully!');
        
        const result = await client.query('SELECT NOW()');
        console.log('Server time:', result.rows[0].now);

        // Test table access
        const tableTest = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public'
                AND table_name = 'messages'
            )
        `);
        console.log('Messages table exists:', tableTest.rows[0].exists);
        
        client.release();
        await pool.end();
        console.log('Connection closed');
    } catch (err) {
        console.error('Connection error:', {
            message: err.message,
            code: err.code,
            detail: err.detail
        });
    }
}

testConnection();
