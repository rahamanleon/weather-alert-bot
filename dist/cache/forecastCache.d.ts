import { AggregatedForecast, CacheStats } from '../types';
export declare class ForecastCache {
    private cache;
    private hits;
    private misses;
    constructor(ttlMinutes?: number, maxEntries?: number);
    get(locationKey: string): AggregatedForecast | null;
    set(locationKey: string, forecast: AggregatedForecast): boolean;
    invalidate(locationKey: string): number;
    invalidateAll(): void;
    stats(): CacheStats;
    generateLocationKey(lat: number, lon: number, hours: number): string;
    getHitRate(): number;
    private log;
    isFresh(forecast: AggregatedForecast, maxAgeMinutes?: number): boolean;
    getAllKeys(): Array<{
        key: string;
        ttl: number;
    }>;
    cleanup(): void;
}
//# sourceMappingURL=forecastCache.d.ts.map