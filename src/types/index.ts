// Core weather types
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

// User and subscription types
export interface UserSubscription {
  id: string;
  whatsappNumber: string;  // E.164 format: +601XXXXXXXX
  location: GeoLocation;
  rainThresholdPct: number;       // default: 60
  earlyCooldownMinutes: number;   // default: 120
  finalCooldownMinutes: number;   // default: 60
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

// Provider interface
export interface WeatherProvider {
  name: string;
  weight: number;
  getForecast(location: GeoLocation, hours: 24 | 48 | 72): Promise<HourlyForecast[]>;
  isHealthy(): Promise<boolean>;
}

// Configuration types
export interface AppConfig {
  app: {
    port: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    timezone: string;
    schedulerIntervalMinutes: number;
  };
  apis: {
    openWeather: { apiKey: string; enabled: boolean };
    weatherApi: { apiKey: string; enabled: boolean };
    openMeteo: { enabled: boolean };
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

// Alert types
export type AlertType = 'EARLY_WARNING' | 'FINAL_ALERT' | 'ALL_CLEAR';

export interface AlertDecision {
  shouldAlert: boolean;
  type?: AlertType;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  rainProbability: number;
  expectedInHours: number;
}

// Cache types
export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  size: number;
}

// Dashboard stats
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