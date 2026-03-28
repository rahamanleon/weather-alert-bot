import { UserSubscription, AlertType } from '../types';
import { WeatherAggregator } from '../services/weatherAggregator';
import { ForecastCache } from '../cache/forecastCache';
import { WhatsAppClient } from '../whatsapp/baileysClient';
export interface AlertWorkerConfig {
    schedulerIntervalMinutes: number;
    defaultRainThresholdPct: number;
    defaultEarlyCooldownMinutes: number;
    defaultFinalCooldownMinutes: number;
}
export declare class AlertWorker {
    private weatherAggregator;
    private cache;
    private whatsappClient;
    private config;
    private isRunning;
    private cronJob;
    private userSubscriptions;
    private alertCooldowns;
    private alertLog;
    constructor(weatherAggregator: WeatherAggregator, cache: ForecastCache, whatsappClient: WhatsAppClient, config: AlertWorkerConfig);
    start(): Promise<void>;
    stop(): void;
    addSubscription(user: UserSubscription): void;
    removeSubscription(userId: string): boolean;
    getSubscription(userId: string): UserSubscription | undefined;
    getAllSubscriptions(): UserSubscription[];
    getAlertLog(limit?: number): Array<{
        userId: string;
        type: AlertType;
        rainProbability: number;
        sentAt: Date;
    }>;
    private processAllSubscriptions;
    private processUserSubscription;
    private makeAlertDecision;
    private isInCooldown;
    private updateCooldowns;
    private hasRecentRainAlert;
    private formatAlertMessage;
    getStats(): {
        totalUsers: number;
        activeUsers: number;
        alertsSentToday: number;
        isRunning: boolean;
    };
}
//# sourceMappingURL=alertWorker.d.ts.map