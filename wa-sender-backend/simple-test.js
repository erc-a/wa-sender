const { Client } = require('pg');

const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 5432,
    user: 'postgres.ngnyrgbyplihatiudnyh',
    password: 'Arwido6204#',
    database: 'postgres',
    ssl: {
        rejectUnauthorized: false
    }
});

async function connect() {
    try {
        await client.connect();
        console.log('Connected to database!');
        const result = await client.query('SELECT NOW()');
        console.log('Database time:', result.rows[0].now);
        await client.end();
    } catch (err) {
        console.error('Connection error:', err.message);
    }
}

connect();
