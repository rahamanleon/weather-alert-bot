import { GeoLocation, AggregatedForecast } from '../types';
export declare class WeatherAggregator {
    private providers;
    constructor(openWeatherApiKey?: string, weatherApiKey?: string, enableOpenMeteo?: boolean, enableOpenWeather?: boolean, enableWeatherApi?: boolean);
    getAggregatedForecast(location: GeoLocation, hours?: 24 | 48 | 72): Promise<AggregatedForecast>;
    getProviderHealth(): Promise<Array<{
        name: string;
        healthy: boolean;
        weight: number;
    }>>;
    private createEmptyForecast;
    private alignForecasts;
    private calculateWeightedAverages;
    private calculateConfidenceLevel;
    private getHourKey;
    private getMostCommonDescription;
}
//# sourceMappingURL=weatherAggregator.d.ts.map