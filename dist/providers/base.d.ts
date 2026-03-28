import { GeoLocation, HourlyForecast, WeatherProvider } from '../types';
import { AxiosInstance, AxiosRequestConfig } from 'axios';
export declare abstract class BaseWeatherProvider implements WeatherProvider {
    abstract name: string;
    abstract weight: number;
    protected readonly baseUrl: string;
    protected readonly timeoutMs: number;
    protected readonly maxRetries: number;
    protected readonly httpClient: AxiosInstance;
    constructor(baseUrl: string);
    abstract getForecast(location: GeoLocation, hours: 24 | 48 | 72): Promise<HourlyForecast[]>;
    abstract isHealthy(): Promise<boolean>;
    protected fetchWithRetry<T>(endpoint: string, config?: AxiosRequestConfig, retryCount?: number): Promise<T>;
    protected normalizeTimestamp(timestamp: string | number | Date): Date;
}
//# sourceMappingURL=base.d.ts.map