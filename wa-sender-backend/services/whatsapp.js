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
        
        // Initialize on next tick to avoid blocking server startup
        setTimeout(() => {
            this.initialize().catch(err => {
                console.error('Error during initial initialization:', err);
                this.lastError = err.message;
            });
        }, 2000);
    }

    async initialize(destructiveReset = false) {
        try {
            this.qrCode = null;
            console.log(`WhatsApp initialize called at ${new Date().toISOString()}`, 
                        destructiveReset ? 'WITH DESTRUCTIVE RESET' : '');
            
            if (this.isInitializing) {
                console.log('Already initializing, cleaning up first...');
                await this.cleanup();
            }

            this.isInitializing = true;

            // Configure WhatsApp client with minimal browser settings
            this.client = new Client({
                authStrategy: new LocalAuth({
                    clientId: `wa-sender-client-${Date.now()}`,
                    dataPath: path.join(__dirname, '..', 'wa-session')
                }),
                puppeteer: {
                    headless: true,
                    executablePath: process.env.CHROME_PATH || undefined, // Use system Chrome if available
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-gpu',
                        '--disable-dev-shm-usage'
                    ],
                    browserWSEndpoint: undefined // Force new browser instance
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
                this.emit('ready');
            });

            this.client.on('auth_failure', (err) => {
                console.error('WhatsApp authentication failed:', err);
                this.lastError = 'Authentication failed';
                this.isReady = false;
                this.emit('auth_failure', err);
            });

            this.client.on('disconnected', (reason) => {
                console.log('WhatsApp client disconnected:', reason);
                this.isReady = false;
                this.lastError = `Disconnected: ${reason}`;
                this.emit('disconnected', reason);
                
                // Attempt to reinitialize after disconnect
                setTimeout(() => {
                    if (!this.isInitializing && !this.isReady) {
                        this.initialize(true).catch(console.error);
                    }
                }, 5000);
            });

            console.log('Initializing WhatsApp client...');
            await this.client.initialize();
            
            return true;
        } catch (err) {
            console.error('Error in WhatsApp initialization:', err);
            this.lastError = err.message;
            this.isInitializing = false;
            throw err;
        }
    }

    async cleanup() {
        if (this.client) {
            try {
                console.log('Cleaning up previous WhatsApp client...');
                await this.client.destroy();
                this.client = null;
            } catch (err) {
                console.error('Error during cleanup:', err);
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
            const msg = await this.client.sendMessage(to + '@c.us', message);
            return msg;
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }    getQRCode() {
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
    }    async clearSession() {
        try {
            console.log('Clearing WhatsApp session data completely...', new Date().toISOString());
            
            // Make sure any existing client is destroyed first
            if (this.client) {
                try {
                    // Try to close the browser first if it exists
                    if (this.client.pupBrowser) {
                        console.log('Closing browser before destroying client...');
                        await this.client.pupBrowser.close().catch(e => 
                            console.log('Error closing browser:', e));
                    }
                    
                    // Then destroy the client
                    await this.client.destroy().catch(e => 
                        console.log('Error destroying client:', e));
                } catch (err) {
                    console.log('Error while destroying client:', err);
                }
                this.client = null;
            }
            
            // Force cleanup of the session directory
            try {
                const fs = require('fs');
                const path = require('path');
                const sessionDir = path.join(__dirname, '..', 'wa-session');
                
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
                    
                    // Recreate empty directory
                    fs.mkdirSync(sessionDir, { recursive: true });
                    console.log('Session directory recreated empty');
                    
                    // Additional: kill any chrome processes that might be related
                    try {
                        if (process.platform === 'win32') {
                            // On Windows, try to kill Chrome processes
                            require('child_process').exec('taskkill /f /im chrome.exe', () => {});
                        }
                    } catch (e) {
                        console.log('Error killing chrome processes:', e);
                    }
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
