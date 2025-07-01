require('dotenv').config();
const db = require('./config/database');
const axios = require('axios');

async function testConnections() {
    console.log('Testing all connections...');

    // 1. Test database connection
    console.log('\n1. Testing Supabase connection...');
    try {
        const messages = await db.getMessages();
        console.log('✓ Database connection successful');
        console.log(`Found ${messages.length} messages in database`);
    } catch (error) {
        console.error('✗ Database connection failed:', error.message);
    }

    // 2. Test backend API endpoints
    console.log('\n2. Testing backend API endpoints...');
    const baseUrl = 'http://localhost:5000';
    const endpoints = [
        { path: '/health', method: 'get' },
        { path: '/api/messages', method: 'get' },
        { path: '/api/history', method: 'get' }
    ];

    for (const endpoint of endpoints) {
        try {
            const response = await axios[endpoint.method](`${baseUrl}${endpoint.path}`);
            console.log(`✓ ${endpoint.path} endpoint working`);
            console.log('  Response:', JSON.stringify(response.data, null, 2));
        } catch (error) {
            console.error(`✗ ${endpoint.path} endpoint failed:`, error.message);
            if (error.response) {
                console.error('  Response:', error.response.data);
            }
        }
    }

    // 3. Test message creation
    console.log('\n3. Testing message creation...');
    try {
        const testMessage = {
            nama_nasabah: 'Test Connection User',
            nomor_telepon: '1234567890',
            no_rekening: 'TEST789',
            jumlah_tunggakan: 1500000,
            skor_kredit: 700
        };

        const savedMessage = await db.addMessage(testMessage);
        console.log('✓ Message creation successful');
        console.log('Created message:', savedMessage);

        // Test message update
        const updatedMessage = await db.updateMessageStatus(savedMessage.id, 'sent', 'test_wa_id_789');
        console.log('✓ Message update successful');
        console.log('Updated message:', updatedMessage);
    } catch (error) {
        console.error('✗ Message operations failed:', error.message);
    }
}

testConnections().catch(console.error);
