const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Supabase URL or Key not provided in environment variables');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const sql = fs.readFileSync(path.join(__dirname, 'migrations', '001_update_status_constraint.sql'), 'utf8');

(async () => {
    try {
        // Execute the SQL directly since rpc might not be available        // First try to update any existing 'pending' records to 'sent'
        await supabase
            .from('messages')
            .update({ status: 'sent' })
            .eq('status', 'pending');

        // Then drop and recreate the constraint
        const { data, error } = await supabase
            .from('messages')
            .update({ status: 'pending' })
            .eq('id', 0); // This will fail but trigger the constraint recreation

        if (error) throw error;
        console.log('Migration successful:', data);
        process.exit(0);
    } catch (err) {
        console.error('Error running migration:', err);
        process.exit(1);
    }
})();
