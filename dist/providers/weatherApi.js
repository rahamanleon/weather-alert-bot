"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeatherApiProvider = void 0;
const base_1 = require("./base");
class WeatherApiProvider extends base_1.BaseWeatherProvider {
    name = 'weatherapi';
    weight = 0.8; // Least reliable due to stricter free tier limits
    apiKey;
    constructor(apiKey) {
        super('https://api.weatherapi.com/v1');
        this.apiKey = apiKey;
    }
    async getForecast(location, hours) {
        try {
            const days = Math.ceil(hours / 24);
            const data = await this.fetchWithRetry('/forecast.json', {
                params: {
                    key: this.apiKey,
                    q: `${location.lat},${location.lon}`,
                    days,
                    aqi: 'no',
                    alerts: 'no',
                },
            });
            return this.transformResponse(data, hours);
        }
        catch (error) {
            console.error(`WeatherAPI provider failed: ${error}`);
            return []; // Return empty array on failure as per spec
        }
    }
    async isHealthy() {
        try {
            // Simple health check
            await this.fetchWithRetry('/current.json', {
                params: {
                    key: this.apiKey,
                    q: 'London',
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
        let hoursProcessed = 0;
        for (const forecastDay of data.forecast.forecastday) {
            for (const hour of forecastDay.hour) {
                if (hoursProcessed >= hours)
                    break;
                forecasts.push({
                    timestamp: this.normalizeTimestamp(hour.time_epoch * 1000),
                    rainProbabilityPct: hour.chance_of_rain,
                    precipitationMm: hour.precip_mm,
                    temperatureCelsius: hour.temp_c,
                    windSpeedKmh: hour.wind_kph,
                    description: hour.condition.text,
                    source: 'weatherapi',
                });
                hoursProcessed++;
            }
            if (hoursProcessed >= hours)
                break;
        }
        return forecasts;
    }
}
exports.WeatherApiProvider = WeatherApiProvider;
//# sourceMappingURL=weatherApi.js.map