require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    try {
        console.log('Reading migration SQL...');
        const migrationSQL = await fs.readFile(
            path.join(__dirname, 'migrations', '003_update_messages_schema.sql'),
            'utf8'
        );

        console.log('Running migration...');
        const { error } = await supabase.rpc('run_sql_migration', {
            sql_query: migrationSQL
        });

        if (error) {
            console.error('Migration failed:', error);
            process.exit(1);
        }

        console.log('Migration successful!');
        
        // Verify the schema changes
        const { data, error: verifyError } = await supabase
            .from('messages')
            .select()
            .limit(1);

        if (verifyError) {
            console.error('Error verifying schema:', verifyError);
            process.exit(1);
        }

        console.log('Schema verified. Sample record:', data);
        console.log('All done!');
    } catch (err) {
        console.error('Script error:', err);
        process.exit(1);
    }
}

runMigration();
