import EventEmitter from 'events';
export interface WhatsAppClientConfig {
    sessionPath: string;
    messageRateLimitMs: number;
}
export interface QueuedMessage {
    phoneNumber: string;
    message: string;
    timestamp: Date;
    attempts: number;
}
export interface ConnectionStatus {
    isConnected: boolean;
    isConnecting: boolean;
    requiresAuth: boolean;
    hasCredentials: boolean;
    credentialsValid: boolean;
    connectionAttempts: number;
    queueSize: number;
    isProcessingQueue: boolean;
    lastError?: string;
}
export declare class WhatsAppClient extends EventEmitter {
    private config;
    private socket;
    private isConnected;
    private isConnecting;
    private requiresAuth;
    private messageQueue;
    private isProcessingQueue;
    private connectionAttempts;
    private maxConnectionAttempts;
    private reconnectTimeouts;
    private credsPath;
    private lastError?;
    private currentQRCode?;
    private qrCodeTimestamp?;
    constructor(config: WhatsAppClientConfig);
    /**
     * Check if valid credentials exist
     */
    private checkCredentials;
    /**
     * Get detailed credential information for logging
     */
    private getCredentialInfo;
    connect(): Promise<boolean>;
    disconnect(): Promise<void>;
    /**
     * Clear message queue
     */
    clearQueue(): number;
    sendMessage(phoneNumber: string, message: string): Promise<boolean>;
    sendMessageImmediate(phoneNumber: string, message: string): Promise<boolean>;
    private processMessageQueue;
    /**
     * Schedule automatic reconnection with exponential backoff
     */
    private scheduleReconnect;
    /**
     * Clear all pending reconnect timeouts
     */
    private clearReconnectTimeouts;
    private isValidRecipient;
    private toWhatsAppJid;
    private delay;
    /**
     * Get comprehensive connection status
     */
    getConnectionStatus(): ConnectionStatus;
    /**
     * Get detailed queue statistics
     */
    getQueueStats(): {
        totalMessages: number;
        pendingMessages: number;
        failedMessages: number;
        oldestMessage: Date | null;
    };
    /**
     * Display QR code with instructions
     */
    private displayQRCode;
    /**
     * Get QR code for web display
     */
    getQRCode(): {
        qr?: string;
        timestamp?: Date;
        expiresAt?: Date;
    };
    /**
     * Get authentication status for web dashboard
     */
    getAuthStatus(): {
        requiresAuth: boolean;
        hasCredentials: boolean;
        credentialsValid: boolean;
        credentialInfo?: string;
        isConnected: boolean;
        isConnecting: boolean;
        qrAvailable: boolean;
        qrExpiresIn?: number;
    };
    /**
     * Clear credentials and force re-authentication
     */
    clearCredentials(): boolean;
    /**
     * Trigger reconnection (for web dashboard)
     */
    triggerReconnect(): Promise<boolean>;
}
//# sourceMappingURL=baileysClient.d.ts.map