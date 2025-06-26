const axios = require('axios');

const testWhatsAppStatus = async () => {
    try {
        console.log('Testing WhatsApp status endpoint...');
        const response = await axios.get('http://localhost:5000/api/whatsapp/status');
        console.log('Status response:', JSON.stringify(response.data, null, 2));
        return response.data;
    } catch (error) {
        console.error('Error testing WhatsApp status:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
        }
        throw error;
    }
};

// Run the test
testWhatsAppStatus()
    .then(() => console.log('Test completed successfully'))
    .catch(err => console.error('Test failed:', err.message));
