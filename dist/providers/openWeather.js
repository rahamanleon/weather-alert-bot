"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenWeatherProvider = void 0;
const base_1 = require("./base");
class OpenWeatherProvider extends base_1.BaseWeatherProvider {
    name = 'openweather';
    weight = 0.9; // Slightly less reliable due to rate limits
    apiKey;
    constructor(apiKey) {
        super('https://api.openweathermap.org/data/2.5');
        this.apiKey = apiKey;
    }
    async getForecast(location, hours) {
        try {
            const data = await this.fetchWithRetry('/forecast', {
                params: {
                    lat: location.lat,
                    lon: location.lon,
                    appid: this.apiKey,
                    units: 'metric',
                    cnt: Math.ceil(hours / 3), // OpenWeather provides 3-hour intervals
                },
            });
            return this.transformResponse(data, hours);
        }
        catch (error) {
            console.error(`OpenWeather provider failed: ${error}`);
            return []; // Return empty array on failure as per spec
        }
    }
    async isHealthy() {
        try {
            // Check if API key is valid by making a simple request
            await this.fetchWithRetry('/weather', {
                params: {
                    q: 'London,UK',
                    appid: this.apiKey,
                    units: 'metric',
                },
                timeout: 5000,
            });
            return true;
        }
        catch {
            return false;
        }
    }
    transformResponse(data, hours) {
        const forecasts = [];
        const limit = Math.min(data.list.length, Math.ceil(hours / 3));
        for (let i = 0; i < limit; i++) {
            const item = data.list[i];
            const weather = item.weather[0];
            // Convert probability of precipitation (pop) from 0-1 to percentage
            const rainProbability = Math.round(item.pop * 100);
            // Calculate precipitation in mm (rainfall in last 3 hours)
            const precipitation = item.rain?.['3h'] || 0;
            forecasts.push({
                timestamp: this.normalizeTimestamp(item.dt * 1000), // Convert seconds to milliseconds
                rainProbabilityPct: rainProbability,
                precipitationMm: precipitation,
                temperatureCelsius: item.main.temp,
                windSpeedKmh: item.wind.speed * 3.6, // Convert m/s to km/h
                description: weather.description,
                source: 'openweather',
            });
        }
        return forecasts;
    }
}
exports.OpenWeatherProvider = OpenWeatherProvider;
//# sourceMappingURL=openWeather.js.map