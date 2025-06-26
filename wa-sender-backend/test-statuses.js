const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Supabase URL or Key not provided in environment variables');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const testStatuses = ['pending', 'sent', 'replied', 'failed'];

(async () => {
    for (const status of testStatuses) {
        try {
            console.log(`\nTesting status: ${status}`);
            const { data, error } = await supabase
                .from('messages')
                .insert([{
                    nama_nasabah: 'Test User',
                    nomor_telepon: '+1234567890',
                    no_rekening: '123456789',
                    jumlah_tunggakan: 1000000,
                    skor_kredit: 3,
                    status: status
                }])
                .select();

            if (error) {
                console.error(`Error with status ${status}:`, error);
            } else {
                console.log(`Success with status ${status}:`, data);
            }
        } catch (err) {
            console.error(`Error testing status ${status}:`, err);
        }
    }
})();
