const API_BASE_URL = 'http://localhost:5000';

// Function to abort previous requests
let abortController = null;

const abortPendingRequests = () => {
  if (abortController) {
    abortController.abort();
  }
  abortController = new AbortController();
  return abortController.signal;
};

export const sendMessage = async (formData) => {
  try {
    const requestData = { formData };
    console.log('API: Sending message with request data:', JSON.stringify(requestData, null, 2));
    
    const response = await fetch(`${API_BASE_URL}/api/messages/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    console.log('API: Response status:', response.status);
    
    // Always try to parse response body
    const responseText = await response.text();
    console.log('API: Raw response:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('API: Failed to parse response as JSON:', e);
      throw new Error(`Invalid response format: ${responseText}`);
    }
    
    if (!response.ok) {
      throw new Error(data.error || `Server error: ${response.status}`);
    }

    console.log('API: Send message response:', data);
    return data;
  } catch (error) {
    console.error('API: Error sending message:', error);
    throw error;
  }
};

export const getQRCode = async (forceRefresh = false, hardReset = false) => {
  try {
    const signal = abortPendingRequests();
    console.log('Fetching WhatsApp QR code...', forceRefresh ? 'with force refresh' : '');
    
    const params = new URLSearchParams();
    if (forceRefresh) params.append('refresh', 'true');
    if (hardReset) params.append('hard_reset', 'true');
    
    const response = await fetch(`${API_BASE_URL}/api/whatsapp/qr${params.toString() ? '?' + params.toString() : ''}`, {
      signal,
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('QR code request was aborted');
      throw error;
    }
    console.error('Error fetching QR code:', error);
    return {
      isConnectionError: true,
      message: 'Could not connect to WhatsApp service'
    };
  }
};

export const getWhatsAppStatus = async () => {
  try {
    const signal = abortPendingRequests();
    console.log('Checking WhatsApp status...');
    
    const response = await fetch(`${API_BASE_URL}/api/whatsapp/status`, {
      signal,
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('WhatsApp status response:', data);
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Status request was aborted');
      throw error;
    }
    console.error('Error getting WhatsApp status:', error);
    return {
      isConnectionError: true,
      message: 'Could not connect to WhatsApp service',
      connected: false
    };
  }
};

export const getMessageHistory = async (options = {}) => {
    try {
        const { page = 1, limit = 10, status = '', search = '', date = '' } = options;
        
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', limit.toString());
        if (status) params.append('status', status);
        if (search) params.append('search', search);
        if (date) params.append('date', date); // Add date filter parameter
        
        console.log('Fetching history with URL:', `${API_BASE_URL}/api/history?${params}`);
        
        const response = await fetch(`${API_BASE_URL}/api/history?${params}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            const text = await response.text();
            let errorMessage;
            try {
                const errorData = JSON.parse(text);
                errorMessage = errorData.message || errorData.error || `Server error: ${response.status}`;
            } catch (e) {
                errorMessage = `Server error: ${response.status}`;
            }
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        console.log('Successful history response:', data);
        
        // Always ensure stats are present with default values if missing
        const stats = data.stats || { todayCount: 0, totalCount: 0 };
        
        // Make sure stats have proper number values
        stats.todayCount = parseInt(stats.todayCount || 0, 10);
        stats.totalCount = parseInt(stats.totalCount || 0, 10);
        
        return {
            success: true,
            data: data.data || [],
            pagination: data.pagination || { total: 0, page: 1, pages: 1 },
            stats: stats
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
