"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
exports.getLogger = getLogger;
exports.initLogger = initLogger;
const pino_1 = __importDefault(require("pino"));
class Logger {
    logger;
    constructor(config) {
        const level = config.app.logLevel || 'info';
        this.logger = (0, pino_1.default)({
            level,
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname',
                },
            },
            serializers: {
                err: pino_1.default.stdSerializers.err,
            },
            base: {
                pid: process.pid,
                hostname: process.env.HOSTNAME || 'localhost',
            },
            timestamp: () => `,"time":"${new Date().toISOString()}"`,
        });
    }
    // Standard log methods
    debug(message, data) {
        this.logger.debug(data, message);
    }
    info(message, data) {
        this.logger.info(data, message);
    }
    warn(message, data) {
        this.logger.warn(data, message);
    }
    error(message, error, data) {
        this.logger.error({ err: error, ...data }, message);
    }
    fatal(message, error, data) {
        this.logger.fatal({ err: error, ...data }, message);
    }
    // Structured logging for specific contexts
    request(requestId, method, url, statusCode, duration) {
        this.logger.info({
            requestId,
            method,
            url,
            statusCode,
            duration,
            type: 'request',
        }, `HTTP ${method} ${url} - ${statusCode} (${duration}ms)`);
    }
    cache(hit, key, operation, duration) {
        this.logger.debug({
            hit,
            key,
            operation,
            duration,
            type: 'cache',
        }, `Cache ${operation} ${hit ? 'HIT' : 'MISS'} for key: ${key}`);
    }
    provider(providerName, operation, success, duration, error) {
        const level = success ? 'info' : 'error';
        this.logger[level]({
            provider: providerName,
            operation,
            success,
            duration,
            error: error?.message,
            type: 'provider',
        }, `Provider ${providerName} ${operation} ${success ? 'succeeded' : 'failed'} in ${duration}ms`);
    }
    alert(userId, alertType, rainProbability, sent) {
        this.logger.info({
            userId,
            alertType,
            rainProbability,
            sent,
            type: 'alert',
        }, `Alert ${alertType} ${sent ? 'sent' : 'failed'} to user ${userId} (${rainProbability}% rain)`);
    }
    whatsapp(operation, phoneNumber, success, details) {
        const level = success ? 'info' : 'error';
        this.logger[level]({
            operation,
            phoneNumber: this.maskPhoneNumber(phoneNumber),
            success,
            ...details,
            type: 'whatsapp',
        }, `WhatsApp ${operation} ${success ? 'succeeded' : 'failed'} for ${this.maskPhoneNumber(phoneNumber)}`);
    }
    system(event, data) {
        this.logger.info({
            event,
            ...data,
            type: 'system',
        }, `System event: ${event}`);
    }
    // Create a child logger with additional context
    child(context) {
        return this.logger.child(context);
    }
    maskPhoneNumber(phoneNumber) {
        if (!phoneNumber || phoneNumber.length < 4)
            return '***';
        return `${phoneNumber.substring(0, phoneNumber.length - 4)}****`;
    }
    // Get the underlying pino logger
    getPinoLogger() {
        return this.logger;
    }
}
exports.Logger = Logger;
// Singleton instance (optional)
let globalLogger = null;
function getLogger(config) {
    if (!globalLogger && config) {
        globalLogger = new Logger(config);
    }
    if (!globalLogger) {
        throw new Error('Logger not initialized. Call getLogger with config first.');
    }
    return globalLogger;
}
function initLogger(config) {
    globalLogger = new Logger(config);
    return globalLogger;
}
//# sourceMappingURL=logger.js.map