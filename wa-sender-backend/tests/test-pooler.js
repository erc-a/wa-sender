require('dotenv').config();
const { Pool } = require('pg');

// Configuration object
const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 6543,
    database: process.env.DB_NAME,
    // More specific SSL configuration
    ssl: {
        rejectUnauthorized: false,
        sslmode: 'require'
    },
    // Session configuration
    application_name: 'wa_sender_test',
    connectionTimeoutMillis: 60000,
    statement_timeout: 60000,
    query_timeout: 60000,
    idle_in_transaction_session_timeout: 60000,
    keepalive: 1000,
    keepaliveInitialDelayMillis: 1000,
    max: 1,
    min: 0
};

async function testConnection() {
    console.log('Testing connection with config:', {
        host: config.host,
        port: config.port,
        user: config.user,
        database: config.database,
        ssl: config.ssl
    });

    // Create connection pool
    const pool = new Pool(config);

    // Add error handler
    pool.on('error', (err) => {
        console.error('Unexpected error on idle client', err);
    });

    try {
        console.log('Creating connection from pool...');
        // Enable session-level logging
        await pool.query("SET log_statement = 'all'");
        await pool.query("SET log_connections = 'on'");
        await pool.query("SET log_disconnections = 'on'");
        
        const client = await pool.connect();
        console.log('Connected successfully!');
        
        console.log('Testing basic query...');
        const timeResult = await client.query('SELECT NOW()');
        console.log('Server time:', timeResult.rows[0].now);

        console.log('Testing table existence...');
        const tableResult = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public'
                AND table_name = 'messages'
            );
        `);
        console.log('Messages table exists:', tableResult.rows[0].exists);

        if (!tableResult.rows[0].exists) {
            console.log('Creating messages table...');
            await client.query(`
                CREATE TABLE IF NOT EXISTS messages (
                    id SERIAL PRIMARY KEY,
                    nama_nasabah VARCHAR(255) NOT NULL,
                    nomor_telepon VARCHAR(20) NOT NULL,
                    no_rekening VARCHAR(50) NOT NULL,
                    jumlah_tunggakan DECIMAL(15,2) NOT NULL,
                    skor_kredit INT NOT NULL,
                    status VARCHAR(10) NOT NULL DEFAULT 'sent',
                    wa_message_id VARCHAR(100),
                    reply_message TEXT,
                    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    replied_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);
            console.log('Messages table created successfully!');
        }
        
        client.release();
        await pool.end();
        console.log('Connection closed successfully');
        process.exit(0);
    } catch (err) {
        console.error('Connection error:', {
            message: err.message,
            code: err.code,
            detail: err.detail,
            hint: err.hint,
            stack: err.stack
        });
        
        if (err.code === 'ETIMEDOUT' || err.message === 'timeout expired') {
            console.log('Connection timed out. Please check:');
            console.log('1. Network connectivity');
            console.log('2. Firewall settings');
            console.log('3. VPN status (if using)');
            console.log('4. Supabase connection pooler status');
        }
        
        if (err.code === 'ENOTFOUND') {
            console.log('Host not found. Please check:');
            console.log('1. DNS settings');
            console.log('2. Host name spelling');
            console.log('3. Internet connectivity');
        }
        
        if (err.code === '28P01') {
            console.log('Invalid credentials. Please check:');
            console.log('1. Username format (should be postgres.<project-ref>)');
            console.log('2. Password (should be the database password, not API key)');
            console.log('3. Database permissions');
        }

        await pool.end().catch(() => {});
        process.exit(1);
    }
}

testConnection();
