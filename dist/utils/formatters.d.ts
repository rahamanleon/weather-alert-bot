import { HourlyForecast, AggregatedForecast, UserSubscription } from '../types';
export declare class Formatters {
    static formatTemperature(celsius: number): string;
    static formatWindSpeed(kmh: number): string;
    static formatPrecipitation(mm: number): string;
    static formatProbability(percent: number): string;
    static formatDateTime(date: Date, includeTime?: boolean): string;
    static formatTimeAgo(date: Date): string;
    static formatDuration(minutes: number): string;
    static formatPhoneNumber(phoneNumber: string): string;
    static formatLocation(location: {
        city: string;
        country: string;
    }): string;
    static formatConfidence(level: 'LOW' | 'MEDIUM' | 'HIGH'): string;
    static formatAlertType(type: 'EARLY_WARNING' | 'FINAL_ALERT' | 'ALL_CLEAR'): string;
    static formatForecastSummary(forecast: AggregatedForecast): string;
    static formatUserSubscription(user: UserSubscription): string;
    static getWeatherDescription(hourly: HourlyForecast[]): string;
    static formatCacheStats(stats: {
        hits: number;
        misses: number;
        keys: number;
    }): string;
    static formatBytes(bytes: number): string;
    static generateProgressBar(percent: number, length?: number): string;
}
//# sourceMappingURL=formatters.d.ts.map