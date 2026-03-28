import { GeoLocation, HourlyForecast } from '../types';
import { BaseWeatherProvider } from './base';
export interface WeatherApiResponse {
    location: {
        name: string;
        region: string;
        country: string;
        lat: number;
        lon: number;
        tz_id: string;
        localtime_epoch: number;
        localtime: string;
    };
    forecast: {
        forecastday: Array<{
            date: string;
            date_epoch: number;
            day: {
                maxtemp_c: number;
                mintemp_c: number;
                avgtemp_c: number;
                maxwind_kph: number;
                totalprecip_mm: number;
                avgvis_km: number;
                avghumidity: number;
                daily_will_it_rain: number;
                daily_chance_of_rain: number;
                daily_will_it_snow: number;
                daily_chance_of_snow: number;
                condition: {
                    text: string;
                    icon: string;
                    code: number;
                };
                uv: number;
            };
            hour: Array<{
                time_epoch: number;
                time: string;
                temp_c: number;
                condition: {
                    text: string;
                    icon: string;
                    code: number;
                };
                wind_kph: number;
                wind_degree: number;
                wind_dir: string;
                pressure_mb: number;
                precip_mm: number;
                humidity: number;
                cloud: number;
                feelslike_c: number;
                windchill_c: number;
                heatindex_c: number;
                dewpoint_c: number;
                will_it_rain: number;
                chance_of_rain: number;
                will_it_snow: number;
                chance_of_snow: number;
                vis_km: number;
                gust_kph: number;
                uv: number;
            }>;
        }>;
    };
}
export declare class WeatherApiProvider extends BaseWeatherProvider {
    name: string;
    weight: number;
    private apiKey;
    constructor(apiKey: string);
    getForecast(location: GeoLocation, hours: 24 | 48 | 72): Promise<HourlyForecast[]>;
    isHealthy(): Promise<boolean>;
    private transformResponse;
}
//# sourceMappingURL=weatherApi.d.ts.map