import NodeCache from 'node-cache';
import { AggregatedForecast, CacheStats } from '../types';

export class ForecastCache {
  private cache: NodeCache;
  private hits = 0;
  private misses = 0;
  
  constructor(ttlMinutes: number = 15, maxEntries: number = 100) {
    this.cache = new NodeCache({
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
  
  get(locationKey: string): AggregatedForecast | null {
    const forecast = this.cache.get<AggregatedForecast>(locationKey);
    
    if (forecast) {
      this.hits++;
      this.log(`Cache hit for key: ${locationKey}`);
      return forecast;
    } else {
      this.misses++;
      this.log(`Cache miss for key: ${locationKey}`);
      return null;
    }
  }
  
  set(locationKey: string, forecast: AggregatedForecast): boolean {
    const success = this.cache.set(locationKey, forecast);
    if (success) {
      this.log(`Cache set for key: ${locationKey}`);
    } else {
      this.log(`Cache set failed for key: ${locationKey}`);
    }
    return success;
  }
  
  invalidate(locationKey: string): number {
    const deleted = this.cache.del(locationKey);
    if (deleted > 0) {
      this.log(`Cache invalidated for key: ${locationKey}`);
    }
    return deleted;
  }
  
  invalidateAll(): void {
    this.cache.flushAll();
    this.log('Cache flushed entirely');
  }
  
  stats(): CacheStats {
    const keys = this.cache.keys();
    const stats = this.cache.getStats();
    
    return {
      hits: this.hits,
      misses: this.misses,
      keys: keys.length,
      size: stats.vsize, // Virtual size in bytes
    };
  }
  
  generateLocationKey(lat: number, lon: number, hours: number): string {
    // Round coordinates to 4 decimal places (~11 meter precision)
    const roundedLat = Math.round(lat * 10000) / 10000;
    const roundedLon = Math.round(lon * 10000) / 10000;
    return `forecast:${roundedLat}:${roundedLon}:${hours}`;
  }
  
  getHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? Math.round((this.hits / total) * 100) : 0;
  }
  
  private log(message: string): void {
    // In production, this would use a proper logger
    const timestamp = new Date().toISOString();
    console.log(`[Cache ${timestamp}] ${message}`);
  }
  
  // Utility method to check if a cached forecast is still fresh
  isFresh(forecast: AggregatedForecast, maxAgeMinutes: number = 15): boolean {
    const ageMs = Date.now() - forecast.generatedAt.getTime();
    const maxAgeMs = maxAgeMinutes * 60 * 1000;
    return ageMs < maxAgeMs;
  }
  
  // Get all cached keys with their TTL
  getAllKeys(): Array<{ key: string; ttl: number }> {
    const keys = this.cache.keys();
    return keys.map(key => ({
      key,
      ttl: this.cache.getTtl(key) || 0,
    }));
  }
  
  // Clean up expired entries manually
  cleanup(): void {
    this.cache.keys().forEach(key => {
      const ttl = this.cache.getTtl(key);
      if (ttl && ttl < Date.now()) {
        this.cache.del(key);
      }
    });
  }
}