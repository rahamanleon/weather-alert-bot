import { GeoLocation, HourlyForecast } from '../types';
import { BaseWeatherProvider } from './base';
export interface OpenWeatherResponse {
    list: Array<{
        dt: number;
        main: {
            temp: number;
            feels_like: number;
            pressure: number;
            humidity: number;
        };
        weather: Array<{
            id: number;
            main: string;
            description: string;
            icon: string;
        }>;
        clouds: {
            all: number;
        };
        wind: {
            speed: number;
            deg: number;
        };
        pop: number;
        rain?: {
            '3h': number;
        };
    }>;
    city: {
        name: string;
        coord: {
            lat: number;
            lon: number;
        };
        country: string;
    };
}
export declare class OpenWeatherProvider extends BaseWeatherProvider {
    name: string;
    weight: number;
    private apiKey;
    constructor(apiKey: string);
    getForecast(location: GeoLocation, hours: 24 | 48 | 72): Promise<HourlyForecast[]>;
    isHealthy(): Promise<boolean>;
    private transformResponse;
}
//# sourceMappingURL=openWeather.d.ts.map