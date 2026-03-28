"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeatherAggregator = void 0;
const openMeteo_1 = require("../providers/openMeteo");
const openWeather_1 = require("../providers/openWeather");
const weatherApi_1 = require("../providers/weatherApi");
class WeatherAggregator {
    providers = [];
    constructor(openWeatherApiKey, weatherApiKey, enableOpenMeteo = true, enableOpenWeather = true, enableWeatherApi = true) {
        if (enableOpenMeteo) {
            this.providers.push(new openMeteo_1.OpenMeteoProvider());
        }
        if (enableOpenWeather && openWeatherApiKey) {
            this.providers.push(new openWeather_1.OpenWeatherProvider(openWeatherApiKey));
        }
        if (enableWeatherApi && weatherApiKey) {
            this.providers.push(new weatherApi_1.WeatherApiProvider(weatherApiKey));
        }
    }
    async getAggregatedForecast(location, hours = 24) {
        const providerPromises = this.providers.map(async (provider) => {
            try {
                const forecasts = await provider.getForecast(location, hours);
                return { provider, forecasts, success: true };
            }
            catch (error) {
                console.error(`Provider ${provider.name} failed:`, error);
                return { provider, forecasts: [], success: false };
            }
        });
        const results = await Promise.all(providerPromises);
        const successfulResults = results.filter(r => r.success && r.forecasts.length > 0);
        if (successfulResults.length === 0) {
            return this.createEmptyForecast(location);
        }
        // Align timestamps across providers
        const alignedForecasts = this.alignForecasts(successfulResults);
        // Calculate weighted averages
        const aggregatedHourly = this.calculateWeightedAverages(alignedForecasts, successfulResults);
        // Determine confidence level
        const confidenceLevel = this.calculateConfidenceLevel(successfulResults, aggregatedHourly);
        // Find peak rain probability
        const peakRainProbability = Math.max(...aggregatedHourly.map(h => h.rainProbabilityPct));
        return {
            location,
            generatedAt: new Date(),
            hourly: aggregatedHourly,
            peakRainProbability,
            confidenceLevel,
            providersUsed: successfulResults.map(r => r.provider.name),
            providersFailedCount: results.length - successfulResults.length,
        };
    }
    async getProviderHealth() {
        const healthChecks = await Promise.all(this.providers.map(async (provider) => ({
            name: provider.name,
            healthy: await provider.isHealthy(),
            weight: provider.weight,
        })));
        return healthChecks;
    }
    createEmptyForecast(location) {
        return {
            location,
            generatedAt: new Date(),
            hourly: [],
            peakRainProbability: 0,
            confidenceLevel: 'LOW',
            providersUsed: [],
            providersFailedCount: this.providers.length,
        };
    }
    alignForecasts(results) {
        // Group forecasts by hour (rounded to nearest hour)
        const aligned = new Map();
        for (const result of results) {
            const { provider, forecasts } = result;
            for (const forecast of forecasts) {
                const hourKey = this.getHourKey(forecast.timestamp);
                if (!aligned.has(hourKey)) {
                    aligned.set(hourKey, []);
                }
                aligned.get(hourKey).push({
                    forecast,
                    weight: provider.weight,
                });
            }
        }
        return aligned;
    }
    calculateWeightedAverages(alignedForecasts, _results) {
        const aggregated = [];
        // Sort hour keys chronologically
        const sortedHourKeys = Array.from(alignedForecasts.keys()).sort((a, b) => a - b);
        for (const hourKey of sortedHourKeys) {
            const forecastsAtHour = alignedForecasts.get(hourKey);
            if (forecastsAtHour.length === 0)
                continue;
            // Calculate weighted averages
            let totalWeight = 0;
            let weightedRainProb = 0;
            let weightedPrecip = 0;
            let weightedTemp = 0;
            let weightedWind = 0;
            const descriptions = [];
            const sources = new Set();
            for (const { forecast, weight } of forecastsAtHour) {
                totalWeight += weight;
                weightedRainProb += forecast.rainProbabilityPct * weight;
                weightedPrecip += forecast.precipitationMm * weight;
                weightedTemp += forecast.temperatureCelsius * weight;
                weightedWind += forecast.windSpeedKmh * weight;
                descriptions.push(forecast.description);
                sources.add(forecast.source);
            }
            // Use the most common description
            const description = this.getMostCommonDescription(descriptions);
            aggregated.push({
                timestamp: new Date(hourKey),
                rainProbabilityPct: Math.round(weightedRainProb / totalWeight),
                precipitationMm: parseFloat((weightedPrecip / totalWeight).toFixed(1)),
                temperatureCelsius: parseFloat((weightedTemp / totalWeight).toFixed(1)),
                windSpeedKmh: parseFloat((weightedWind / totalWeight).toFixed(1)),
                description,
                source: Array.from(sources).sort().join('|'),
            });
        }
        return aggregated;
    }
    calculateConfidenceLevel(successfulResults, aggregatedHourly) {
        const providerCount = successfulResults.length;
        if (providerCount === 0)
            return 'LOW';
        if (providerCount === 1)
            return 'LOW';
        if (providerCount === 2)
            return 'MEDIUM';
        // For 3 providers, check consensus on rain predictions
        if (providerCount >= 3) {
            if (aggregatedHourly.length === 0)
                return 'MEDIUM';
            // Check if at least 2/3 providers agree on significant rain (>30%)
            const consensusHours = aggregatedHourly.filter(hour => {
                // This would require checking individual provider data
                // For simplicity, we'll use the aggregated value
                return hour.rainProbabilityPct > 30;
            }).length;
            const consensusRatio = consensusHours / aggregatedHourly.length;
            return consensusRatio > 0.7 ? 'HIGH' : 'MEDIUM';
        }
        return 'MEDIUM';
    }
    getHourKey(timestamp) {
        // Round to nearest hour
        const date = new Date(timestamp);
        date.setMinutes(0, 0, 0);
        return date.getTime();
    }
    getMostCommonDescription(descriptions) {
        const frequency = {};
        for (const desc of descriptions) {
            frequency[desc] = (frequency[desc] || 0) + 1;
        }
        let mostCommon = '';
        let maxCount = 0;
        for (const [desc, count] of Object.entries(frequency)) {
            if (count > maxCount) {
                mostCommon = desc;
                maxCount = count;
            }
        }
        return mostCommon || 'Partly cloudy';
    }
}
exports.WeatherAggregator = WeatherAggregator;
//# sourceMappingURL=weatherAggregator.js.map