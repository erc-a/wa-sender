const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const DB_URL = process.env.DATABASE_URL;

if (!DB_URL) {
    console.error('Database URL not provided');
    process.exit(1);
}

const pool = new Pool({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        const client = await pool.connect();
        try {
            // Start transaction
            await client.query('BEGIN');

            // Drop the existing constraint
            await client.query(`
                ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_status_check;
            `);

            // Add the new constraint
            await client.query(`
                ALTER TABLE messages ADD CONSTRAINT messages_status_check 
                CHECK (status IN ('pending', 'sent', 'replied', 'failed'));
            `);

            // Update any existing 'pending' records to 'sent' for safety
            await client.query(`
                UPDATE messages SET status = 'sent' WHERE status NOT IN ('sent', 'replied');
            `);

            // Change default
            await client.query(`
                ALTER TABLE messages ALTER COLUMN status SET DEFAULT 'pending';
            `);

            // Commit transaction
            await client.query('COMMIT');
            
            console.log('Successfully updated database schema');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Error updating schema:', err);
    } finally {
        await pool.end();
    }
})();
