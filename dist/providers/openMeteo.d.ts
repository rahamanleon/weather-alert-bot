import { GeoLocation, HourlyForecast } from '../types';
import { BaseWeatherProvider } from './base';
export interface OpenMeteoResponse {
    hourly: {
        time: string[];
        temperature_2m: number[];
        precipitation: number[];
        rain: number[];
        showers: number[];
        weathercode: number[];
        windspeed_10m: number[];
    };
}
export declare class OpenMeteoProvider extends BaseWeatherProvider {
    name: string;
    weight: number;
    constructor();
    getForecast(location: GeoLocation, hours: 24 | 48 | 72): Promise<HourlyForecast[]>;
    isHealthy(): Promise<boolean>;
    private transformResponse;
    private calculateRainProbability;
    private weatherCodeToDescription;
}
//# sourceMappingURL=openMeteo.d.ts.map