const { Client } = require('pg');

const config = {
    host: '172.64.149.246',
    port: 5432,
    user: 'postgres',
    password: 'Arwido6204#',
    database: 'postgres',
    ssl: {
        rejectUnauthorized: false
    },
    application_name: 'wa_sender_test'
};

console.log('Testing connection with config:', {
    host: config.host,
    port: config.port,
    user: config.user,
    database: config.database
});

const client = new Client(config);

async function testConnection() {
    try {
        await client.connect();
        console.log('Connected successfully!');
        
        const result = await client.query('SELECT NOW()');
        console.log('Server time:', result.rows[0].now);
        
        await client.end();
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
