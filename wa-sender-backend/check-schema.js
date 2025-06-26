const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Supabase URL or Key not provided in environment variables');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

(async () => {
    try {
        // First, try to remove any default value
        const { data, error } = await supabase
            .from('messages')
            .update({ status: 'sent' })
            .is('status', null);

        if (error) {
            console.error('Error updating null statuses:', error);
        } else {
            console.log('Updated null statuses:', data);
        }

        // Try to fetch a record to see its structure
        const { data: sampleData, error: sampleError } = await supabase
            .from('messages')
            .select('*')
            .limit(1)
            .single();

        if (sampleError) {
            console.error('Error fetching sample:', sampleError);
        } else {
            console.log('Sample record:', sampleData);
        }

    } catch (err) {
        console.error('Error:', err);
    }
})();
