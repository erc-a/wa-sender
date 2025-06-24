const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

class WhatsAppService extends EventEmitter {
    constructor() {
        super();
        this.client = null;
        this.isReady = false;
        this.qrCode = null;
        this.isInitializing = false;
        this.lastError = null;
        this.qrTimeout = null;
        this.qrRetryCount = 0;
        this.initializationPromise = null;
        
        // Initialize on next tick to avoid blocking server startup
        setTimeout(() => {
            this.initialize().catch(err => {
                console.error('Error during initial initialization:', err);
                this.lastError = err.message;
            });
        }, 2000);
    }

    async initialize(destructiveReset = false) {
        // Prevent multiple simultaneous initializations
        if (this.initializationPromise) {
            console.log('Already initializing, waiting for current initialization...');
            return this.initializationPromise;
        }

        this.initializationPromise = this._doInitialize(destructiveReset);
        try {
            const result = await this.initializationPromise;
            return result;
        } finally {
            this.initializationPromise = null;
        }
    }

    async _doInitialize(destructiveReset = false) {
        try {
            this.qrCode = null;
            console.log(`WhatsApp initialize called at ${new Date().toISOString()}`, 
                        destructiveReset ? 'WITH DESTRUCTIVE RESET' : '');
            
            // Always cleanup first
            await this.cleanup();

            this.isInitializing = true;
            this.lastError = null;

            // If destructive reset, clear session
            if (destructiveReset) {
                await this.clearSession();
                // Wait a bit after clearing session
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // Configure WhatsApp client with robust settings
            this.client = new Client({
                authStrategy: new LocalAuth({
                    clientId: "whatsapp-sender",
                    dataPath: "./whatsapp-session"
                }),
                puppeteer: {
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--disable-gpu',
                        '--disable-background-timer-throttling',
                        '--disable-backgrounding-occluded-windows',
                        '--disable-renderer-backgrounding',
                        '--disable-features=TranslateUI',
                        '--disable-ipc-flooding-protection'
                    ],
                    timeout: 120000, // Increase timeout to 2 minutes
                    handleSIGINT: false,
                    handleSIGTERM: false,
                    handleSIGHUP: false
                }
            });

            // Set up event handlers
            this.client.on('qr', async (qr) => {
                try {
                    console.log('New QR code received:', new Date().toISOString());
                    this.qrCode = await qrcode.toDataURL(qr);
                    console.log('QR code converted to data URL');
                    this.emit('qr', this.qrCode);
                } catch (err) {
                    console.error('Error converting QR code:', err);
                    this.lastError = 'Error converting QR code';
                }
            });

            this.client.on('ready', () => {
                console.log('WhatsApp client is ready!');
                this.isReady = true;
                this.isInitializing = false;
                this.qrCode = null;
                this.lastError = null;
                this.qrRetryCount = 0;
                this.emit('ready');
            });

            this.client.on('auth_failure', (err) => {
                console.error('WhatsApp authentication failed:', err);
                this.lastError = 'Authentication failed';
                this.isReady = false;
                this.isInitializing = false;
                this.emit('auth_failure', err);
            });

            this.client.on('disconnected', (reason) => {
                console.log('WhatsApp client disconnected:', reason);
                this.isReady = false;
                this.isInitializing = false;
                this.lastError = `Disconnected: ${reason}`;
                this.emit('disconnected', reason);
                
                // Attempt to reinitialize after disconnect with delay
                setTimeout(() => {
                    if (!this.isInitializing && !this.isReady) {
                        console.log('Attempting to reinitialize after disconnect...');
                        this.initialize(true).catch(err => {
                            console.error('Failed to reinitialize after disconnect:', err);
                        });
                    }
                }, 10000); // Wait 10 seconds before retry
            });

            // Add error handlers
            this.client.on('change_state', (state) => {
                console.log('WhatsApp state changed:', state);
            });

            console.log('Initializing WhatsApp client...');
            await this.client.initialize();
            
            return true;
        } catch (err) {
            console.error('Error in WhatsApp initialization:', err);
            this.lastError = err.message;
            this.isInitializing = false;
            this.isReady = false;
            
            // If initialization fails, try to cleanup
            await this.cleanup().catch(console.error);
            
            throw err;
        }
    }

    async cleanup() {
        if (this.client) {
            try {
                console.log('Cleaning up previous WhatsApp client...');
                
                // Try to properly close browser first
                if (this.client.pupBrowser && !this.client.pupBrowser.isClosed()) {
                    try {
                        await Promise.race([
                            this.client.pupBrowser.close(),
                            new Promise((_, reject) => setTimeout(() => reject(new Error('Browser close timeout')), 5000))
                        ]);
                        console.log('Browser closed successfully');
                    } catch (err) {
                        console.log('Error closing browser:', err.message);
                    }
                }

                // Then destroy the client
                await Promise.race([
                    this.client.destroy(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Client destroy timeout')), 5000))
                ]);
                
                console.log('Client destroyed successfully');
            } catch (err) {
                console.error('Error during cleanup:', err.message);
            } finally {
                this.client = null;
            }
        }
        
        this.isReady = false;
        this.isInitializing = false;
    }

    async sendMessage(to, message) {
        if (!this.isReady) {
            throw new Error('WhatsApp client is not ready');
        }

        try {
            // Clean and format the phone number
            let phoneNumber = to.toString().trim();
            console.log('Original phone number:', phoneNumber); // Debug log
            
            // Remove all non-digit characters except + at the beginning
            phoneNumber = phoneNumber.replace(/[^\d+]/g, '');
            console.log('After cleaning:', phoneNumber); // Debug log
            
            // Remove + if present
            if (phoneNumber.startsWith('+')) {
                phoneNumber = phoneNumber.substring(1);
            }
            
            // Ensure Indonesian country code
            if (phoneNumber.startsWith('0')) {
                // Replace leading 0 with 62 (Indonesian country code)
                phoneNumber = '62' + phoneNumber.substring(1);
                console.log('After adding country code (from 0):', phoneNumber); // Debug log
            } else if (!phoneNumber.startsWith('62')) {
                // Add Indonesian country code if not present
                phoneNumber = '62' + phoneNumber;
                console.log('After adding country code (no 62):', phoneNumber); // Debug log
            }
            
            // Validate phone number length (Indonesian mobile numbers)
            if (phoneNumber.length < 10 || phoneNumber.length > 15) {
                throw new Error('Invalid phone number length. Please use format: 08xxxxxxxxx or +628xxxxxxxxx');
            }
            
            console.log(`Final phone number: ${phoneNumber} (original: ${to})`);
            
            // Try to get the chat first to validate the number
            let chatId = phoneNumber + '@c.us';
            console.log('Chat ID:', chatId); // Debug log
            
            try {
                // Check if the contact exists and the number is valid
                console.log('Checking contact validity...'); // Debug log
                const contact = await this.client.getContactById(chatId);
                console.log('Contact found:', contact.id._serialized); // Debug log
                
                if (!contact.isWAContact) {
                    console.log('Contact is not a WhatsApp user'); // Debug log
                    throw new Error('This number is not registered on WhatsApp');
                }
                console.log('Contact is valid WhatsApp user'); // Debug log
            } catch (contactError) {
                console.log('Contact validation error:', contactError.message);
                // For some cases, we might still be able to send even if contact check fails
                console.log('Will attempt to send anyway...'); // Debug log
            }
            
            // Send the message
            console.log('Attempting to send message...'); // Debug log
            const msg = await this.client.sendMessage(chatId, message);
            
            console.log(`Message sent successfully to ${phoneNumber}`);
            console.log('Message ID:', msg.id._serialized); // Debug log
            
            return {
                success: true,
                messageId: msg.id._serialized,
                to: phoneNumber,
                message: message,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('Error sending message:', error);
            console.error('Error stack:', error.stack); // Debug log
            
            // Provide more specific error messages
            let errorMessage = error.message;
            if (error.message.includes('wid error: invalid wid')) {
                errorMessage = 'Invalid phone number format. Please use format: 08xxxxxxxxx or +628xxxxxxxxx';
            } else if (error.message.includes('Phone number is not registered')) {
                errorMessage = 'This phone number is not registered on WhatsApp';
            } else if (error.message.includes('not a WhatsApp user')) {
                errorMessage = 'This number is not a WhatsApp user';
            }
            
            throw new Error(errorMessage);
        }
    }

    getQRCode() {
        return this.qrCode;
    }

    isClientReady() {
        return this.isReady;
    }
    
    getLastError() {
        return this.lastError;
    }
    
    isInitializingClient() {
        return this.isInitializing;
    }

    async clearSession() {
        try {
            console.log('Clearing WhatsApp session data completely...', new Date().toISOString());
            
            // Make sure any existing client is destroyed first
            await this.cleanup();
            
            // Force cleanup of the session directory
            try {
                const sessionDir = path.join(__dirname, '..', 'whatsapp-session');
                
                if (fs.existsSync(sessionDir)) {
                    console.log('Removing session directory completely');
                    
                    // Try to remove any lock files first
                    const lockFiles = ['SingletonLock', 'LOCK'];
                    lockFiles.forEach(file => {
                        try {
                            const lockFile = path.join(sessionDir, file);
                            if (fs.existsSync(lockFile)) {
                                fs.unlinkSync(lockFile);
                            }
                        } catch (e) {
                            // Ignore errors on individual files
                        }
                    });
                    
                    // Try to fully remove directory
                    fs.rmSync(sessionDir, { recursive: true, force: true });
                    
                    // Wait a bit
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // Recreate empty directory
                    fs.mkdirSync(sessionDir, { recursive: true });
                    console.log('Session directory recreated empty');
                }
            } catch (e) {
                console.error('Error during session cleanup:', e);
            }
            
            // Reset all state
            this.isReady = false;
            this.qrCode = null;
            this.isInitializing = false;
            this.lastError = null;
            this.qrRetryCount = 0;
            
            if (this.qrTimeout) {
                clearTimeout(this.qrTimeout);
                this.qrTimeout = null;
            }
            
            console.log('WhatsApp session cleared completely');
            return true;
        } catch (error) {
            console.error('Error in clearSession:', error);
            return false;
        }
    }
}

const whatsappService = new WhatsAppService();
module.exports = whatsappService;
