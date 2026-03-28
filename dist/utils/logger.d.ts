import pino from 'pino';
import { AppConfig } from '../types';
export declare class Logger {
    private logger;
    constructor(config: Pick<AppConfig, 'app'>);
    debug(message: string, data?: any): void;
    info(message: string, data?: any): void;
    warn(message: string, data?: any): void;
    error(message: string, error?: any, data?: any): void;
    fatal(message: string, error?: any, data?: any): void;
    request(requestId: string, method: string, url: string, statusCode: number, duration: number): void;
    cache(hit: boolean, key: string, operation: string, duration?: number): void;
    provider(providerName: string, operation: string, success: boolean, duration?: number, error?: any): void;
    alert(userId: string, alertType: string, rainProbability: number, sent: boolean): void;
    whatsapp(operation: string, phoneNumber: string, success: boolean, details?: any): void;
    system(event: string, data?: any): void;
    child(context: Record<string, any>): pino.Logger;
    private maskPhoneNumber;
    getPinoLogger(): pino.Logger;
}
export declare function getLogger(config?: Pick<AppConfig, 'app'>): Logger;
export declare function initLogger(config: Pick<AppConfig, 'app'>): Logger;
//# sourceMappingURL=logger.d.ts.map