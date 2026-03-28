"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForecastCache = void 0;
const node_cache_1 = __importDefault(require("node-cache"));
class ForecastCache {
    cache;
    hits = 0;
    misses = 0;
    constructor(ttlMinutes = 15, maxEntries = 100) {
        this.cache = new node_cache_1.default({
            stdTTL: ttlMinutes * 60, // Convert minutes to seconds
            checkperiod: 60, // Check for expired keys every 60 seconds
            maxKeys: maxEntries,
            useClones: false, // Better performance for objects
        });
        // Register stats event listeners
        this.cache.on('set', () => this.log('Cache set'));
        this.cache.on('del', () => this.log('Cache deleted'));
        this.cache.on('expired', () => this.log('Cache expired'));
        this.cache.on('flush', () => this.log('Cache flushed'));
    }
    get(locationKey) {
        const forecast = this.cache.get(locationKey);
        if (forecast) {
            this.hits++;
            this.log(`Cache hit for key: ${locationKey}`);
            return forecast;
        }
        else {
            this.misses++;
            this.log(`Cache miss for key: ${locationKey}`);
            return null;
        }
    }
    set(locationKey, forecast) {
        const success = this.cache.set(locationKey, forecast);
        if (success) {
            this.log(`Cache set for key: ${locationKey}`);
        }
        else {
            this.log(`Cache set failed for key: ${locationKey}`);
        }
        return success;
    }
    invalidate(locationKey) {
        const deleted = this.cache.del(locationKey);
        if (deleted > 0) {
            this.log(`Cache invalidated for key: ${locationKey}`);
        }
        return deleted;
    }
    invalidateAll() {
        this.cache.flushAll();
        this.log('Cache flushed entirely');
    }
    stats() {
        const keys = this.cache.keys();
        const stats = this.cache.getStats();
        return {
            hits: this.hits,
            misses: this.misses,
            keys: keys.length,
            size: stats.vsize, // Virtual size in bytes
        };
    }
    generateLocationKey(lat, lon, hours) {
        // Round coordinates to 4 decimal places (~11 meter precision)
        const roundedLat = Math.round(lat * 10000) / 10000;
        const roundedLon = Math.round(lon * 10000) / 10000;
        return `forecast:${roundedLat}:${roundedLon}:${hours}`;
    }
    getHitRate() {
        const total = this.hits + this.misses;
        return total > 0 ? Math.round((this.hits / total) * 100) : 0;
    }
    log(message) {
        // In production, this would use a proper logger
        const timestamp = new Date().toISOString();
        console.log(`[Cache ${timestamp}] ${message}`);
    }
    // Utility method to check if a cached forecast is still fresh
    isFresh(forecast, maxAgeMinutes = 15) {
        const ageMs = Date.now() - forecast.generatedAt.getTime();
        const maxAgeMs = maxAgeMinutes * 60 * 1000;
        return ageMs < maxAgeMs;
    }
    // Get all cached keys with their TTL
    getAllKeys() {
        const keys = this.cache.keys();
        return keys.map(key => ({
            key,
            ttl: this.cache.getTtl(key) || 0,
        }));
    }
    // Clean up expired entries manually
    cleanup() {
        this.cache.keys().forEach(key => {
            const ttl = this.cache.getTtl(key);
            if (ttl && ttl < Date.now()) {
                this.cache.del(key);
            }
        });
    }
}
exports.ForecastCache = ForecastCache;
//# sourceMappingURL=forecastCache.js.map