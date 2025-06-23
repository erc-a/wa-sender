const mysql = require('mysql2');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// For development, use hardcoded credentials if needed
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wa_sender';

// Log database config (excluding password)
console.log('Database Configuration:', {
    host: DB_HOST,
    user: DB_USER,
    database: DB_NAME
});

// Try to create a pool with promise support
const pool = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Disable debug in production
    debug: false
}).promise();

// Test connection using promise-based API
const testConnection = async () => {
    try {
        await pool.execute('SELECT 1');
        console.log('Successfully connected to MySQL database');
    } catch (err) {
        console.error('Database Connection Error:', err);
        if (err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('Access denied. Check your username and password.');
        } else if (err.code === 'ECONNREFUSED') {
            console.error('Database connection refused. Is MySQL running?');
        } else if (err.code === 'ER_BAD_DB_ERROR') {
            console.error('Database does not exist:', DB_NAME);
        }
        // Don't exit process here, let the application handle the error
    }
};

// Run the test but don't block startup
testConnection();

module.exports = pool;
