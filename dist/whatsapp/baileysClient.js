"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppClient = void 0;
const baileys_1 = require("@whiskeysockets/baileys");
const pino_1 = __importDefault(require("pino"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const events_1 = __importDefault(require("events"));
class WhatsAppClient extends events_1.default {
    config;
    socket = null;
    isConnected = false;
    isConnecting = false;
    requiresAuth = false;
    messageQueue = [];
    isProcessingQueue = false;
    connectionAttempts = 0;
    maxConnectionAttempts = 5;
    reconnectTimeouts = new Map();
    credsPath;
    lastError;
    currentQRCode;
    qrCodeTimestamp;
    constructor(config) {
        super();
        this.config = config;
        // Ensure session directory exists
        if (!fs_1.default.existsSync(config.sessionPath)) {
            fs_1.default.mkdirSync(config.sessionPath, { recursive: true });
            console.log(`📁 Created session directory: ${config.sessionPath}`);
        }
        this.credsPath = path_1.default.resolve(config.sessionPath, 'creds.json');
    }
    /**
     * Check if valid credentials exist
     */
    checkCredentials() {
        if (!fs_1.default.existsSync(this.credsPath)) {
            return { exists: false, valid: false };
        }
        try {
            const credsData = fs_1.default.readFileSync(this.credsPath, 'utf-8');
            const creds = JSON.parse(credsData);
            // Check for essential credential fields
            const hasAccount = !!creds.account;
            const hasMe = !!creds.me;
            const isRegistered = creds.registered === true;
            const valid = hasAccount && hasMe;
            return {
                exists: true,
                valid,
                registered: isRegistered,
            };
        }
        catch (err) {
            console.error('❌ Error reading credentials:', err.message);
            return { exists: true, valid: false };
        }
    }
    /**
     * Get detailed credential information for logging
     */
    getCredentialInfo() {
        const credCheck = this.checkCredentials();
        if (!credCheck.exists) {
            return 'No credentials found';
        }
        if (!credCheck.valid) {
            return 'Credentials file exists but is invalid/corrupted';
        }
        try {
            const credsData = fs_1.default.readFileSync(this.credsPath, 'utf-8');
            const creds = JSON.parse(credsData);
            const info = [];
            if (creds.me?.id) {
                info.push(`Phone: ${creds.me.id.split(':')[0]}`);
            }
            if (creds.registrationId) {
                info.push(`Reg ID: ${creds.registrationId}`);
            }
            if (creds.platform) {
                info.push(`Platform: ${creds.platform}`);
            }
            if (creds.registered !== undefined) {
                info.push(`Registered: ${creds.registered}`);
            }
            return info.join(' | ');
        }
        catch (err) {
            return 'Unable to read credential details';
        }
    }
    async connect() {
        if (this.isConnected && this.socket) {
            console.log('✅ WhatsApp client is already connected');
            return true;
        }
        if (this.isConnecting) {
            console.log('⏳ Connection already in progress...');
            return new Promise((resolve) => {
                this.once('connected', () => resolve(true));
                this.once('connection-failed', () => resolve(false));
            });
        }
        this.isConnecting = true;
        this.emit('connection-status-change', this.getConnectionStatus());
        // Check credentials
        const credCheck = this.checkCredentials();
        console.log('\n📋 WhatsApp Authentication Status:');
        console.log('───────────────────────────────────────');
        if (!credCheck.exists) {
            console.log('⚠️  Credentials: NOT FOUND');
            console.log('📱 QR code authentication will be required');
            this.requiresAuth = true;
        }
        else if (!credCheck.valid) {
            console.log('❌ Credentials: INVALID/CORRUPTED');
            console.log('📱 QR code authentication will be required');
            console.log('🗑️  Clearing invalid credentials...');
            try {
                fs_1.default.unlinkSync(this.credsPath);
                console.log('✅ Invalid credentials cleared');
            }
            catch (err) {
                console.log('⚠️  Could not clear credentials:', err.message);
            }
            this.requiresAuth = true;
        }
        else {
            console.log('✅ Credentials: FOUND');
            console.log(`ℹ️  ${this.getCredentialInfo()}`);
            if (credCheck.registered) {
                console.log('🟢 Session appears valid - attempting auto-login');
                this.requiresAuth = false;
            }
            else {
                console.log('🟡 Session not fully registered - QR code may be required');
                this.requiresAuth = true;
            }
        }
        console.log('───────────────────────────────────────\n');
        this.emit('connection-status-change', this.getConnectionStatus());
        try {
            const { state, saveCreds } = await (0, baileys_1.useMultiFileAuthState)(this.config.sessionPath);
            const { version, isLatest } = await (0, baileys_1.fetchLatestBaileysVersion)();
            console.log(`ℹ️  Using WA Web API version: ${version.join('.')} (${isLatest ? 'latest' : 'fallback'})`);
            this.socket = (0, baileys_1.makeWASocket)({
                auth: state,
                logger: (0, pino_1.default)({ level: 'silent' }),
                browser: baileys_1.Browsers.macOS('Desktop'),
                version,
                markOnlineOnConnect: false,
                printQRInTerminal: false, // We'll handle QR display ourselves
            });
            // Save credentials whenever they're updated
            this.socket.ev.on('creds.update', saveCreds);
            // Handle connection updates
            this.socket.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;
                // Handle QR code - store for web display
                if (qr) {
                    this.requiresAuth = true;
                    this.currentQRCode = qr;
                    this.qrCodeTimestamp = new Date();
                    this.emit('connection-status-change', this.getConnectionStatus());
                    console.log('\n📱 QR Code Received');
                    console.log('───────────────────────────────────────');
                    this.displayQRCode(qr);
                    this.emit('qr-code', qr);
                    this.emit('qr-updated', { qr, timestamp: this.qrCodeTimestamp });
                }
                // Handle connection close
                if (connection === 'close') {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    const shouldReconnect = statusCode !== baileys_1.DisconnectReason.loggedOut;
                    console.log(`\n🔌 Connection closed (code: ${statusCode})`);
                    this.isConnecting = false;
                    if (shouldReconnect) {
                        this.isConnected = false;
                        this.emit('connection-status-change', this.getConnectionStatus());
                        this.emit('disconnected', { reason: 'connection_closed', statusCode });
                        this.scheduleReconnect();
                    }
                    else {
                        console.log('🚫 Logged out - credentials cleared');
                        this.isConnected = false;
                        this.requiresAuth = true;
                        this.currentQRCode = undefined;
                        this.qrCodeTimestamp = undefined;
                        this.emit('connection-status-change', this.getConnectionStatus());
                        this.emit('disconnected', { reason: 'logged_out' });
                        this.emit('qr-cleared');
                        // Clear credentials to force fresh authentication
                        try {
                            if (fs_1.default.existsSync(this.credsPath)) {
                                fs_1.default.unlinkSync(this.credsPath);
                                console.log('✅ Cleared expired credentials');
                            }
                        }
                        catch (err) {
                            // Ignore if file doesn't exist
                        }
                    }
                }
                // Handle successful connection
                if (connection === 'open') {
                    console.log('\n✅ WhatsApp connected successfully!');
                    this.isConnected = true;
                    this.isConnecting = false;
                    this.connectionAttempts = 0;
                    this.requiresAuth = false;
                    this.currentQRCode = undefined;
                    this.qrCodeTimestamp = undefined;
                    this.emit('connection-status-change', this.getConnectionStatus());
                    this.emit('connected');
                    // Clear any pending reconnect timeouts
                    this.clearReconnectTimeouts();
                    // Start processing queue
                    this.processMessageQueue();
                }
                // Handle connecting state
                if (connection === 'connecting') {
                    console.log('🔄 Connecting to WhatsApp...');
                    this.emit('connection-status-change', this.getConnectionStatus());
                }
            });
            // Wait for connection with timeout
            // Note: We don't resolve here - QR code will be available via API even if this times out
            return await new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    console.log('⏱️  Connection timeout (30s) - QR code should be available via API');
                    this.isConnecting = false;
                    this.emit('connection-status-change', this.getConnectionStatus());
                    // Don't emit connection-failed here as QR may still be valid
                    resolve(this.isConnected);
                }, 30000);
                const checkConnection = (update) => {
                    if (update.connection === 'open') {
                        clearTimeout(timeout);
                        this.isConnecting = false;
                        resolve(true);
                    }
                    else if (update.qr) {
                        // QR code received - connection is in progress
                        console.log('📱 QR code ready for scanning');
                    }
                };
                this.socket.ev.on('connection.update', checkConnection);
            });
        }
        catch (error) {
            console.error('❌ Failed to connect to WhatsApp:', error.message);
            this.isConnecting = false;
            this.lastError = error.message;
            this.emit('connection-status-change', this.getConnectionStatus());
            this.emit('connection-failed', { reason: 'error', error });
            return false;
        }
    }
    async disconnect() {
        this.clearReconnectTimeouts();
        if (this.socket) {
            await this.socket.end(new Error('Disconnecting by user request'));
            this.socket = null;
        }
        this.isConnected = false;
        this.isConnecting = false;
        this.emit('connection-status-change', this.getConnectionStatus());
        console.log('📴 WhatsApp client disconnected');
    }
    /**
     * Clear message queue
     */
    clearQueue() {
        const clearedCount = this.messageQueue.length;
        this.messageQueue = [];
        console.log(`🗑️  Cleared ${clearedCount} messages from queue`);
        return clearedCount;
    }
    async sendMessage(phoneNumber, message) {
        // Validate recipient format (E.164 / plain digits / WhatsApp JID)
        if (!this.isValidRecipient(phoneNumber)) {
            console.error(`❌ Invalid recipient format: ${phoneNumber}`);
            return false;
        }
        // Add to queue
        const queuedMessage = {
            phoneNumber,
            message,
            timestamp: new Date(),
            attempts: 0,
        };
        this.messageQueue.push(queuedMessage);
        console.log(`📨 Message queued for ${phoneNumber}. Queue size: ${this.messageQueue.length}`);
        // Start processing if not already
        if (!this.isProcessingQueue) {
            this.processMessageQueue();
        }
        return true;
    }
    async sendMessageImmediate(phoneNumber, message) {
        if (!this.isConnected || !this.socket) {
            console.error('❌ WhatsApp client is not connected');
            return false;
        }
        if (!this.isValidRecipient(phoneNumber)) {
            console.error(`❌ Invalid recipient format: ${phoneNumber}`);
            return false;
        }
        try {
            const normalizedNumber = this.toWhatsAppJid(phoneNumber);
            console.log(`📤 Sending message to ${normalizedNumber}`);
            await this.socket.sendMessage(normalizedNumber, { text: message });
            console.log(`✅ Message sent to ${normalizedNumber}`);
            return true;
        }
        catch (error) {
            console.error(`❌ Failed to send message to ${phoneNumber}:`, error.message);
            return false;
        }
    }
    async processMessageQueue() {
        if (this.isProcessingQueue || this.messageQueue.length === 0) {
            return;
        }
        this.isProcessingQueue = true;
        while (this.messageQueue.length > 0) {
            // Don't attempt sends while offline; keep queued messages for later.
            if (!this.isConnected || !this.socket) {
                console.log('⚠️  WhatsApp disconnected. Pausing queue processing.');
                break;
            }
            const message = this.messageQueue[0];
            // Check if we need to wait for rate limiting
            if (message.attempts > 0) {
                const timeSinceLastAttempt = Date.now() - message.timestamp.getTime();
                const minDelay = this.config.messageRateLimitMs;
                if (timeSinceLastAttempt < minDelay) {
                    await this.delay(minDelay - timeSinceLastAttempt);
                }
            }
            // Try to send the message
            const success = await this.sendMessageImmediate(message.phoneNumber, message.message);
            if (success) {
                // Remove from queue
                this.messageQueue.shift();
                // Wait for rate limiting before next message
                await this.delay(this.config.messageRateLimitMs);
            }
            else {
                // Increment attempts and move to back of queue
                message.attempts++;
                message.timestamp = new Date();
                if (message.attempts >= 3) {
                    console.error(`❌ Failed to send message to ${message.phoneNumber} after 3 attempts. Removing from queue.`);
                    this.messageQueue.shift();
                }
                else {
                    // Move to end of queue for retry
                    this.messageQueue.shift();
                    this.messageQueue.push(message);
                    console.log(`⏳ Message to ${message.phoneNumber} failed. Will retry. Attempt ${message.attempts}/3`);
                }
                // Wait before retry
                await this.delay(5000);
            }
            // Check connection status after each send attempt
            if (!this.isConnected || !this.socket) {
                console.log('⚠️  WhatsApp disconnected. Pausing queue processing.');
                break;
            }
        }
        this.isProcessingQueue = false;
    }
    /**
     * Schedule automatic reconnection with exponential backoff
     */
    scheduleReconnect() {
        const authPending = this.requiresAuth;
        if (!authPending && this.connectionAttempts >= this.maxConnectionAttempts) {
            console.error(`❌ Max connection attempts (${this.maxConnectionAttempts}) reached. Giving up.`);
            this.emit('connection-failed', { reason: 'max_attempts_reached' });
            return;
        }
        if (!authPending) {
            this.connectionAttempts++;
        }
        else {
            // Keep retrying for QR/auth flow without exhausting max reconnect attempts
            this.connectionAttempts = 0;
        }
        // Auth pending: retry at stable interval. Otherwise use exponential backoff.
        const delay = authPending
            ? 30000
            : Math.min(1000 * Math.pow(2, this.connectionAttempts), 30000);
        if (authPending) {
            console.log(`\n🔄 Scheduling reconnect in ${delay}ms (awaiting QR scan/authentication)`);
        }
        else {
            console.log(`\n🔄 Scheduling reconnect in ${delay}ms (attempt ${this.connectionAttempts}/${this.maxConnectionAttempts})`);
        }
        const timeout = setTimeout(async () => {
            this.reconnectTimeouts.delete(delay);
            console.log(`🔄 Attempting reconnection...`);
            const connected = await this.connect();
            if (connected) {
                console.log('✅ Reconnected successfully');
            }
            else {
                if (this.requiresAuth) {
                    console.log('⏳ Reconnection pending: waiting for QR scan/authentication');
                }
                else {
                    console.log('❌ Reconnection failed');
                }
                this.scheduleReconnect(); // Try again
            }
        }, delay);
        this.reconnectTimeouts.set(delay, timeout);
    }
    /**
     * Clear all pending reconnect timeouts
     */
    clearReconnectTimeouts() {
        this.reconnectTimeouts.forEach((timeout) => clearTimeout(timeout));
        this.reconnectTimeouts.clear();
    }
    isValidRecipient(recipient) {
        // Already normalized JID format
        const jidRegex = /^[1-9]\d{5,19}@s\.whatsapp\.net$/;
        if (jidRegex.test(recipient)) {
            return true;
        }
        // E.164 or plain digits (allow spaces/dashes/parentheses)
        const digits = recipient.replace(/\D/g, '');
        const e164Like = recipient.trim().startsWith('+');
        if (digits.length < 8 || digits.length > 15) {
            return false;
        }
        if (e164Like && !/^\+[1-9]\d{7,14}$/.test(recipient.replace(/\s+/g, ''))) {
            return false;
        }
        return /^[1-9]\d{7,14}$/.test(digits);
    }
    toWhatsAppJid(recipient) {
        // If already a JID, use as-is
        if (recipient.endsWith('@s.whatsapp.net')) {
            return recipient;
        }
        const digits = recipient.replace(/\D/g, '');
        return `${digits}@s.whatsapp.net`;
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /**
     * Get comprehensive connection status
     */
    getConnectionStatus() {
        const credCheck = this.checkCredentials();
        return {
            isConnected: this.isConnected,
            isConnecting: this.isConnecting,
            requiresAuth: this.requiresAuth,
            hasCredentials: credCheck.exists,
            credentialsValid: credCheck.valid,
            connectionAttempts: this.connectionAttempts,
            queueSize: this.messageQueue.length,
            isProcessingQueue: this.isProcessingQueue,
            lastError: this.lastError,
        };
    }
    /**
     * Get detailed queue statistics
     */
    getQueueStats() {
        if (this.messageQueue.length === 0) {
            return {
                totalMessages: 0,
                pendingMessages: 0,
                failedMessages: 0,
                oldestMessage: null,
            };
        }
        const oldestTimestamp = Math.min(...this.messageQueue.map((m) => m.timestamp.getTime()));
        const failedMessages = this.messageQueue.filter((m) => m.attempts > 0).length;
        return {
            totalMessages: this.messageQueue.length,
            pendingMessages: this.messageQueue.filter((m) => m.attempts === 0).length,
            failedMessages,
            oldestMessage: new Date(oldestTimestamp),
        };
    }
    /**
     * Display QR code with instructions
     */
    displayQRCode(qr) {
        console.log('\n╔═══════════════════════════════════════════════════╗');
        console.log('║  📱 WhatsApp QR Code - Scan with your phone       ║');
        console.log('╚═══════════════════════════════════════════════════╝');
        console.log('');
        console.log(qr);
        console.log('');
        console.log('╔═══════════════════════════════════════════════════╗');
        console.log('║  Instructions:                                    ║');
        console.log('║  1. Open WhatsApp on your phone                   ║');
        console.log('║  2. Tap Menu (⋮) or Settings (⚙️) → Linked Devices  ║');
        console.log('║  3. Tap "Link a Device"                           ║');
        console.log('║  4. Point your camera at the QR code above        ║');
        console.log('╚═══════════════════════════════════════════════════╝');
        console.log('');
    }
    /**
     * Get QR code for web display
     */
    getQRCode() {
        if (!this.currentQRCode || !this.qrCodeTimestamp) {
            return {};
        }
        // QR codes expire after 60 seconds
        const expiresAt = new Date(this.qrCodeTimestamp.getTime() + 60000);
        return {
            qr: this.currentQRCode,
            timestamp: this.qrCodeTimestamp,
            expiresAt,
        };
    }
    /**
     * Get authentication status for web dashboard
     */
    getAuthStatus() {
        const credCheck = this.checkCredentials();
        let qrExpiresIn;
        if (this.qrCodeTimestamp) {
            const expiresAt = this.qrCodeTimestamp.getTime() + 60000;
            const now = Date.now();
            qrExpiresIn = Math.max(0, Math.floor((expiresAt - now) / 1000));
        }
        return {
            requiresAuth: this.requiresAuth,
            hasCredentials: credCheck.exists,
            credentialsValid: credCheck.valid,
            credentialInfo: credCheck.exists ? this.getCredentialInfo() : undefined,
            isConnected: this.isConnected,
            isConnecting: this.isConnecting,
            qrAvailable: !!this.currentQRCode,
            qrExpiresIn,
        };
    }
    /**
     * Clear credentials and force re-authentication
     */
    clearCredentials() {
        try {
            if (fs_1.default.existsSync(this.credsPath)) {
                fs_1.default.unlinkSync(this.credsPath);
                console.log('✅ Credentials cleared successfully');
                this.currentQRCode = undefined;
                this.qrCodeTimestamp = undefined;
                this.requiresAuth = true;
                this.emit('qr-cleared');
                this.emit('connection-status-change', this.getConnectionStatus());
                return true;
            }
            return false;
        }
        catch (err) {
            console.error('❌ Error clearing credentials:', err.message);
            return false;
        }
    }
    /**
     * Trigger reconnection (for web dashboard)
     */
    async triggerReconnect() {
        if (this.isConnecting) {
            return false;
        }
        this.connectionAttempts = 0;
        this.clearReconnectTimeouts();
        return await this.connect();
    }
}
exports.WhatsAppClient = WhatsAppClient;
//# sourceMappingURL=baileysClient.js.map