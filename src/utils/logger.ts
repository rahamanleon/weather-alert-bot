import pino from 'pino';
import { AppConfig } from '../types';

export class Logger {
  private logger: pino.Logger;
  
  constructor(config: Pick<AppConfig, 'app'>) {
    const level = config.app.logLevel || 'info';
    
    this.logger = pino({
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
        err: pino.stdSerializers.err,
      },
      base: {
        pid: process.pid,
        hostname: process.env.HOSTNAME || 'localhost',
      },
      timestamp: () => `,"time":"${new Date().toISOString()}"`,
    });
  }
  
  // Standard log methods
  debug(message: string, data?: any): void {
    this.logger.debug(data, message);
  }
  
  info(message: string, data?: any): void {
    this.logger.info(data, message);
  }
  
  warn(message: string, data?: any): void {
    this.logger.warn(data, message);
  }
  
  error(message: string, error?: any, data?: any): void {
    this.logger.error({ err: error, ...data }, message);
  }
  
  fatal(message: string, error?: any, data?: any): void {
    this.logger.fatal({ err: error, ...data }, message);
  }
  
  // Structured logging for specific contexts
  request(requestId: string, method: string, url: string, statusCode: number, duration: number): void {
    this.logger.info({
      requestId,
      method,
      url,
      statusCode,
      duration,
      type: 'request',
    }, `HTTP ${method} ${url} - ${statusCode} (${duration}ms)`);
  }
  
  cache(hit: boolean, key: string, operation: string, duration?: number): void {
    this.logger.debug({
      hit,
      key,
      operation,
      duration,
      type: 'cache',
    }, `Cache ${operation} ${hit ? 'HIT' : 'MISS'} for key: ${key}`);
  }
  
  provider(providerName: string, operation: string, success: boolean, duration?: number, error?: any): void {
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
  
  alert(userId: string, alertType: string, rainProbability: number, sent: boolean): void {
    this.logger.info({
      userId,
      alertType,
      rainProbability,
      sent,
      type: 'alert',
    }, `Alert ${alertType} ${sent ? 'sent' : 'failed'} to user ${userId} (${rainProbability}% rain)`);
  }
  
  whatsapp(operation: string, phoneNumber: string, success: boolean, details?: any): void {
    const level = success ? 'info' : 'error';
    this.logger[level]({
      operation,
      phoneNumber: this.maskPhoneNumber(phoneNumber),
      success,
      ...details,
      type: 'whatsapp',
    }, `WhatsApp ${operation} ${success ? 'succeeded' : 'failed'} for ${this.maskPhoneNumber(phoneNumber)}`);
  }
  
  system(event: string, data?: any): void {
    this.logger.info({
      event,
      ...data,
      type: 'system',
    }, `System event: ${event}`);
  }
  
  // Create a child logger with additional context
  child(context: Record<string, any>): pino.Logger {
    return this.logger.child(context);
  }
  
  private maskPhoneNumber(phoneNumber: string): string {
    if (!phoneNumber || phoneNumber.length < 4) return '***';
    return `${phoneNumber.substring(0, phoneNumber.length - 4)}****`;
  }
  
  // Get the underlying pino logger
  getPinoLogger(): pino.Logger {
    return this.logger;
  }
}

// Singleton instance (optional)
let globalLogger: Logger | null = null;

export function getLogger(config?: Pick<AppConfig, 'app'>): Logger {
  if (!globalLogger && config) {
    globalLogger = new Logger(config);
  }
  
  if (!globalLogger) {
    throw new Error('Logger not initialized. Call getLogger with config first.');
  }
  
  return globalLogger;
}

export function initLogger(config: Pick<AppConfig, 'app'>): Logger {
  globalLogger = new Logger(config);
  return globalLogger;
}