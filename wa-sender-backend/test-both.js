require('dotenv').config();
const db = require('./config/database');

async function testDatabase() {
    console.log('Starting Supabase database tests...');
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
        // Test adding a message
        const testMessage = {
            nama_nasabah: 'Test User',
            nomor_telepon: '1234567890',
            no_rekening: 'TEST123',
            jumlah_tunggakan: 1000000,
            skor_kredit: 700
        };
        
        console.log('\n1. Adding test message...');
        const addedMessage = await db.addMessage(testMessage);
        console.log('Message added:', addedMessage);
        
        if (addedMessage && addedMessage.id) {
            console.log('\n2. Fetching message by ID...');
            const fetchedMessage = await db.getMessageById(addedMessage.id);
            console.log('Fetched message:', fetchedMessage);

            console.log('\n3. Updating message status to sent...');
            const sentMessage = await db.updateMessageStatus(
                addedMessage.id,
                'sent',
                'test_wa_id_123'
            );
            console.log('Message marked as sent:', sentMessage);

            console.log('\n4. Adding reply to message...');
            const repliedMessage = await db.updateMessageReply(
                addedMessage.id,
                'This is a test reply'
            );
            console.log('Message updated with reply:', repliedMessage);
        }
        
        console.log('\n5. Fetching all messages...');
        const allMessages = await db.getMessages();
        console.log('Total messages:', allMessages.length);
        
        console.log('\n6. Checking pending messages...');
        const pendingMessages = await db.getPendingMessages();
        console.log('Pending messages:', pendingMessages.length);
        
    } catch (err) {
        console.error('Test failed:', err);
    }
}

testDatabase();
