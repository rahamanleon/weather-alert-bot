export interface GeoLocation {
    lat: number;
    lon: number;
    city: string;
    country: string;
}
export interface HourlyForecast {
    timestamp: Date;
    rainProbabilityPct: number;
    precipitationMm: number;
    temperatureCelsius: number;
    windSpeedKmh: number;
    description: string;
    source: 'open-meteo' | 'openweather' | 'weatherapi';
}
export interface AggregatedForecast {
    location: GeoLocation;
    generatedAt: Date;
    hourly: HourlyForecast[];
    peakRainProbability: number;
    confidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    providersUsed: string[];
    providersFailedCount: number;
}
export interface UserSubscription {
    id: string;
    whatsappNumber: string;
    location: GeoLocation;
    rainThresholdPct: number;
    earlyCooldownMinutes: number;
    finalCooldownMinutes: number;
    active: boolean;
    createdAt: Date;
    lastAlertSentAt?: Date;
    lastAlertType?: 'EARLY_WARNING' | 'FINAL_ALERT' | 'ALL_CLEAR';
}
export interface AlertLogEntry {
    id: string;
    userId: string;
    type: 'EARLY_WARNING' | 'FINAL_ALERT' | 'ALL_CLEAR';
    location: string;
    rainProbabilityPct: number;
    confidenceLevel: string;
    sentAt: Date;
    delivered: boolean;
    messagePreview: string;
}
export interface WeatherProvider {
    name: string;
    weight: number;
    getForecast(location: GeoLocation, hours: 24 | 48 | 72): Promise<HourlyForecast[]>;
    isHealthy(): Promise<boolean>;
}
export interface AppConfig {
    app: {
        port: number;
        logLevel: 'debug' | 'info' | 'warn' | 'error';
        timezone: string;
        schedulerIntervalMinutes: number;
    };
    apis: {
        openWeather: {
            apiKey: string;
            enabled: boolean;
        };
        weatherApi: {
            apiKey: string;
            enabled: boolean;
        };
        openMeteo: {
            enabled: boolean;
        };
    };
    whatsapp: {
        sessionPath: string;
        messageRateLimitMs: number;
    };
    alerts: {
        defaultRainThresholdPct: number;
        defaultEarlyCooldownMinutes: number;
        defaultFinalCooldownMinutes: number;
    };
    cache: {
        forecastTtlMinutes: number;
        maxEntries: number;
    };
    database: {
        mongoUri: string;
        useInMemoryFallback: boolean;
    };
    users: UserSubscription[];
}
export type AlertType = 'EARLY_WARNING' | 'FINAL_ALERT' | 'ALL_CLEAR';
export interface AlertDecision {
    shouldAlert: boolean;
    type?: AlertType;
    confidence: 'LOW' | 'MEDIUM' | 'HIGH';
    rainProbability: number;
    expectedInHours: number;
}
export interface CacheStats {
    hits: number;
    misses: number;
    keys: number;
    size: number;
}
export interface SystemStats {
    uptime: number;
    totalUsers: number;
    activeUsers: number;
    alertsSentToday: number;
    apiCallsRemaining: number;
    cacheHitRate: number;
    providerHealth: {
        name: string;
        healthy: boolean;
        latency: number;
        lastSuccess: Date;
        errorRate: number;
    }[];
}
//# sourceMappingURL=index.d.ts.map