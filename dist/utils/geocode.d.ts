import { GeoLocation } from '../types';
export interface GeocodeResult extends GeoLocation {
    displayName: string;
    state?: string;
    timezone?: string;
    cachedAt?: number;
}
export declare class Geocoder {
    private readonly nominatimUrl;
    private readonly cache;
    private readonly cacheTtlMs;
    reverseGeocode(lat: number, lon: number): Promise<GeocodeResult>;
    forwardGeocode(query: string): Promise<GeocodeResult[]>;
    geocodeCity(cityName: string, countryCode?: string): Promise<GeocodeResult | null>;
    calculateDistance(loc1: GeoLocation, loc2: GeoLocation): number;
    findNearestCity(location: GeoLocation, cities: GeoLocation[]): GeoLocation | null;
    isValidCoordinate(lat: number, lon: number): boolean;
    formatCoordinate(lat: number, lon: number, format?: 'decimal' | 'dms'): string;
    private extractCity;
    private toRad;
    clearCache(): void;
    getCacheStats(): {
        size: number;
        keys: string[];
    };
    preloadCommonCities(): void;
}
//# sourceMappingURL=geocode.d.ts.map