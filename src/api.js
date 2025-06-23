const API_BASE_URL = 'http://localhost:5000';

export async function getMessageHistory(params) {
    try {
        // Convert params object to URLSearchParams
        const queryParams = new URLSearchParams();
        Object.entries(params || {}).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                queryParams.append(key, value.toString());
            }
        });
        
        const queryString = queryParams.toString();
        console.log(`Fetching from: ${API_BASE_URL}/api/history?${queryString}`);
        
        // Set a timeout for the fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/history?${queryString}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId); // Clear the timeout
            
            // Handle non-JSON responses
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.error('Non-JSON response received:', await response.text());
                return {
                    success: false,
                    message: 'Invalid response from server',
                    data: []
                };
            }
            
            const data = await response.json();
            
            if (!response.ok) {
                console.error('Server error response:', data);
                return {
                    success: false,
                    message: data.message || `Server error: ${response.status}`,
                    data: []
                };
            }
            
            console.log('Successful history response:', data);
            return data;
        } catch (fetchError) {
            clearTimeout(timeoutId);
            throw fetchError; // Re-throw for the outer catch
        }
    } catch (error) {
        console.error('Error getting message history:', error);
        // Return error object instead of throwing
        return {
            success: false,
            message: `Could not fetch history data: ${error.message}`,
            data: [],
            error: error.message
        };
    }
}
