const API_BASE_URL = 'http://localhost:5000/api';

// Create a shared abort controller that can be reused
let currentController = null;

// Helper function to abort any pending requests
const abortPendingRequests = () => {
    if (currentController) {
        currentController.abort();
        currentController = null;
    }
};

export const sendMessage = async (messageData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/messages/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messageData)
        });
        return await response.json();
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
};

export const getQRCode = async (refresh = false, hardReset = false) => {
    try {
        console.log('Fetching WhatsApp QR code...', refresh ? '(with refresh)' : '', hardReset ? '(with hard reset)' : '');
        
        // Abort any pending requests before starting a new one
        abortPendingRequests();
        
        // Create a new controller for this request
        currentController = new AbortController();
        
        // Add cache-busting query parameter to API URL only
        const cacheBuster = Date.now();
        let url;
        
        if (hardReset) {
            url = `${API_BASE_URL}/messages/qr?refresh=true&hardReset=true&_=${cacheBuster}`;
        } else if (refresh) {
            url = `${API_BASE_URL}/messages/qr?refresh=true&_=${cacheBuster}`;
        } else {
            url = `${API_BASE_URL}/messages/qr?_=${cacheBuster}`;
        }
        
        const response = await fetch(url, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
                'Pragma': 'no-cache',
                'Expires': '-1'
            },
            cache: refresh ? 'reload' : 'no-cache',
            signal: currentController.signal
        });
        
        const data = await response.json();
        console.log('QR code response received:', data);
        
        return data;
    } catch (error) {
        // Don't log abort errors as they are expected
        if (error.name !== 'AbortError') {
            console.error('Error getting QR code:', error);
        }
        
        // Check if this is a connection error
        const isConnectionError = 
            error.name === 'TypeError' && 
            (error.message.includes('Failed to fetch') || 
             error.message.includes('NetworkError') ||
             error.message.includes('Network request failed') ||
             error.message.includes('Connection refused'));
        
        // Return a default response instead of throwing
        return {
            success: false,
            message: isConnectionError 
                ? 'Tidak dapat terhubung ke server. Pastikan server backend berjalan.' 
                : 'Could not get QR code',
            qr: null,
            isConnectionError: isConnectionError,
            error: error.message
        };
    }
};

export const getWhatsAppStatus = async () => {
    try {
        console.log('Checking WhatsApp status...');
        
        // Abort any pending requests before starting a new one
        abortPendingRequests();
        
        // Create a new controller for this request
        currentController = new AbortController();
        
        const response = await fetch(`${API_BASE_URL}/messages/status`, {
            signal: currentController.signal,
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
        
        const data = await response.json();
        console.log('WhatsApp status response:', data);
        return data;
    } catch (error) {
        console.error('Error getting WhatsApp status:', error);
        
        // Check if this is a connection error
        const isConnectionError = 
            error.name === 'TypeError' && 
            (error.message.includes('Failed to fetch') || 
             error.message.includes('NetworkError') ||
             error.message.includes('Network request failed') ||
             error.message.includes('Connection refused'));
        
        // Return a more specific response for connection errors
        return {
            success: false,
            message: isConnectionError 
                ? 'Tidak dapat terhubung ke server. Pastikan server backend berjalan.' 
                : 'Could not connect to WhatsApp service',
            connected: false,
            isConnectionError: isConnectionError,
            error: error.message
        };
    }
};

export const getMessageHistory = async (options = {}) => {
    try {
        const { page = 1, limit = 10, status = '', search = '' } = options;
        
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', limit.toString());
        if (status) params.append('status', status);
        if (search) params.append('search', search);
        
        console.log(`Fetching history with URL: ${API_BASE_URL}/history?${params}`);
        
        const response = await fetch(`${API_BASE_URL}/history?${params}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error('Server error response:', data);
            throw new Error(data.message || data.error || `Server error: ${response.status}`);
        }
        
        console.log('Successful history response:', data);
        return {
            success: true,
            data: data.data || [],
            pagination: data.pagination || { total: 0, page: 1, pages: 1 }
        };
    } catch (error) {
        console.error('Error getting message history:', error);
        throw new Error(`Error fetching history: ${error.message}`);
    }
};

export const getMessageById = async (id) => {
    try {
        const response = await fetch(`${API_BASE_URL}/history/${id}`);
        return await response.json();
    } catch (error) {
        console.error('Error getting message details:', error);
        throw error;
    }
};
