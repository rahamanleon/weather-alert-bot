"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseWeatherProvider = void 0;
const axios_1 = __importDefault(require("axios"));
class BaseWeatherProvider {
    baseUrl;
    timeoutMs = 10000;
    maxRetries = 3;
    httpClient;
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.httpClient = axios_1.default.create({
            baseURL: baseUrl,
            timeout: this.timeoutMs,
            headers: {
                'User-Agent': 'WeatherAlertBot/1.0',
            },
        });
    }
    async fetchWithRetry(endpoint, config, retryCount = 0) {
        try {
            const response = await this.httpClient.get(endpoint, config);
            return response.data;
        }
        catch (error) {
            if (retryCount < this.maxRetries) {
                const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.fetchWithRetry(endpoint, config, retryCount + 1);
            }
            throw error;
        }
    }
    normalizeTimestamp(timestamp) {
        if (typeof timestamp === 'string') {
            return new Date(timestamp);
        }
        if (typeof timestamp === 'number') {
            // Assume seconds if timestamp > 1e10, otherwise milliseconds
            return timestamp > 1e10 ? new Date(timestamp * 1000) : new Date(timestamp);
        }
        return timestamp;
    }
}
exports.BaseWeatherProvider = BaseWeatherProvider;
//# sourceMappingURL=base.js.map