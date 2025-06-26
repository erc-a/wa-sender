const { Client } = require('pg');
require('dotenv').config();

async function testSupabaseConnection() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        application_name: 'wa_sender_test',
        ssl: {
            rejectUnauthorized: false
        }
    });

    console.log('Testing connection to:', process.env.DB_HOST);

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const { data, error } = await supabase.from('messages').select('*', { count: 'exact' });
        if (error) throw error;
        console.log('Supabase connection successful! Row count:', data);
    } catch (error) {
        console.error('Supabase connection error:', {
            message: error.message,
            details: error.details,
            hint: error.hint
        });
    }
}

testSupabaseConnection();
