const { Pool } = require('pg');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function testConnection() {
    const config = {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: {
            ca: fs.readFileSync(path.join(__dirname, 'config', 'prod-ca-2021.crt')).toString(),
            rejectUnauthorized: true
        }
    };

    console.log('Testing connection with config:', {
        host: config.host,
        port: config.port,
        user: config.user,
        database: config.database,
        ssl: config.ssl ? 'enabled with certificate' : 'disabled'
    });

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
    }
}

testConnection();
