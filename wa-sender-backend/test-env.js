require('dotenv').config();
const { Pool } = require('pg');

const config = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: false
    } : false
};

async function testConnection() {
    console.log('Testing connection with config:', {
        host: config.host,
        port: config.port,
        user: config.user,
        database: config.database,
        ssl: config.ssl ? 'enabled' : 'disabled'
    });

    const pool = new Pool(config);

    try {
        console.log('Attempting to connect...');
        const client = await pool.connect();
        console.log('Connected successfully!');
        
        console.log('Testing query...');
        const result = await client.query('SELECT NOW()');
        console.log('Server time:', result.rows[0].now);

        console.log('Testing table access...');
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
        console.log('Connection closed successfully');
    } catch (err) {
        console.error('Connection error:', {
            message: err.message,
            code: err.code,
            detail: err.detail,
            hint: err.hint
        });
    }
}

testConnection();
