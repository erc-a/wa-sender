const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import memory database fallback
const memoryDb = require('./memory-db');

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Initialize Supabase client
let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('Supabase client initialized');
}

// Function to initialize and test Supabase connection
const initializeSupabase = async () => {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error('Supabase URL or Key not provided in environment variables');
        return false;
    }

    try {
        const { data, error } = await supabase
            .from('messages')
            .select('id')
            .limit(1);

        if (error) throw error;

        console.log('Supabase connection successful!');
        return true;
    } catch (err) {
        console.error('Supabase connection error:', err.message);
        return false;
    }
};

// Validate message status
const isValidStatus = (status) => {
    return ['pending', 'sent', 'replied', 'failed'].includes(status);
};

// Database interface
const db = {
    getMessages: async () => {
        if (!supabase) return memoryDb.getMessages();

        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Error fetching messages:', err);
            throw err;
        }
    },

    addMessage: async (message) => {
        if (!supabase) return memoryDb.addMessage(message);

        try {            // Prepare message data
            const messageData = {
                nama_nasabah: message.nama_nasabah,
                nomor_telepon: message.nomor_telepon,
                no_rekening: message.no_rekening,
                jumlah_tunggakan: message.jumlah_tunggakan,
                macet: message.macet,
                daftar_hitam: message.daftar_hitam,
                status: 'sent', // Start with 'sent' status since we can't use 'pending'
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                sent_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('messages')
                .insert([messageData])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Error adding message:', err);
            throw err;
        }
    },

    updateMessageStatus: async (id, status, wa_message_id = null) => {
        if (!supabase) return memoryDb.updateMessageStatus(id, status, wa_message_id);

        try {
            if (!isValidStatus(status)) {
                throw new Error(`Invalid status: ${status}`);
            }

            const updateData = {
                status,
                updated_at: new Date().toISOString()
            };

            if (wa_message_id) {
                updateData.wa_message_id = wa_message_id;
            }

            if (status === 'sent') {
                updateData.sent_at = new Date().toISOString();
            }

            const { data, error } = await supabase
                .from('messages')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Error updating message status:', err);
            throw err;
        }
    },

    updateMessageReply: async (id, reply_message) => {
        if (!supabase) return memoryDb.updateMessageReply(id, reply_message);

        try {
            const { data, error } = await supabase
                .from('messages')
                .update({
                    reply_message,
                    status: 'replied',
                    replied_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Error updating message reply:', err);
            throw err;
        }
    },

    getMessageById: async (id) => {
        if (!supabase) return memoryDb.getMessageById(id);

        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Error fetching message:', err);
            throw err;
        }
    },

    getPendingMessages: async () => {
        if (!supabase) return memoryDb.getPendingMessages();

        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: true });
            
            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Error fetching pending messages:', err);
            throw err;
        }
    }
};

// Initialize database connection
(async () => {
    if (await initializeSupabase()) {
        console.log('Using Supabase for database operations');
    } else {
        console.log('Supabase connection failed, using in-memory database');
    }
})();

module.exports = db;
