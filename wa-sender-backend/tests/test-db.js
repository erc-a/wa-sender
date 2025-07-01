const { Pool } = require('pg');
require('dotenv').config();

async function testConnection() {
    // Parse connection string untuk logging yang aman (tanpa password)
    const url = new URL(process.env.DATABASE_URL);
    console.log('Connection details:', {
        host: url.hostname,
        port: url.port,
        user: url.username,
        database: url.pathname.replace('/', '')
    });

    const config = {
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    };

    console.log('Testing connection with URL:', process.env.DATABASE_URL);

    const pool = new Pool(config);

    try {
        const result = await pool.query('SELECT NOW()');
        console.log('Connection successful! Server time:', result.rows[0].now);
        await pool.end();
    } catch (error) {
        console.error('Connection error:', {
            message: error.message,
            code: error.code,
            detail: error.detail
        });
        if (error.message.includes('password authentication')) {
            console.log('Password authentication failed. Please check your database password.');
        }
    }
}

testConnection();
