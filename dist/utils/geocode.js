"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Geocoder = void 0;
class Geocoder {
    nominatimUrl = 'https://nominatim.openstreetmap.org';
    cache = new Map();
    cacheTtlMs = 24 * 60 * 60 * 1000; // 24 hours
    async reverseGeocode(lat, lon) {
        const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
        const cached = this.cache.get(cacheKey);
        // Check if cache is still valid
        if (cached && Date.now() - cached.cachedAt < this.cacheTtlMs) {
            return cached.data;
        }
        try {
            const response = await fetch(`${this.nominatimUrl}/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`);
            if (!response.ok) {
                throw new Error(`Geocoding failed: ${response.status}`);
            }
            const data = await response.json();
            const result = {
                lat,
                lon,
                city: this.extractCity(data.address),
                country: data.address.country || 'Unknown',
                displayName: data.display_name || `${lat}, ${lon}`,
                state: data.address.state,
                timezone: data.timezone,
            };
            // Add to cache
            this.cache.set(cacheKey, {
                cachedAt: Date.now(),
                data: result
            });
            return result;
        }
        catch (error) {
            console.warn(`Reverse geocoding failed for ${lat}, ${lon}:`, error);
            // Return fallback result
            return {
                lat,
                lon,
                city: 'Unknown',
                country: 'Unknown',
                displayName: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
                cachedAt: Date.now(),
            };
        }
    }
    async forwardGeocode(query) {
        const cacheKey = `forward:${query}`;
        const cached = this.cache.get(cacheKey);
        if (cached && Array.isArray(cached.data)) {
            return cached.data;
        }
        try {
            const response = await fetch(`${this.nominatimUrl}/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`);
            if (!response.ok) {
                throw new Error(`Forward geocoding failed: ${response.status}`);
            }
            const data = await response.json();
            const results = data.map((item) => ({
                lat: parseFloat(item.lat),
                lon: parseFloat(item.lon),
                city: this.extractCity(item.address),
                country: item.address.country || 'Unknown',
                displayName: item.display_name,
                state: item.address.state,
            }));
            // Add to cache with timestamp
            this.cache.set(cacheKey, {
                cachedAt: Date.now(),
                data: results
            });
            return results;
        }
        catch (error) {
            console.warn(`Forward geocoding failed for "${query}":`, error);
            return [];
        }
    }
    async geocodeCity(cityName, countryCode) {
        const query = countryCode ? `${cityName}, ${countryCode}` : cityName;
        const results = await this.forwardGeocode(query);
        if (results.length === 0) {
            return null;
        }
        // Prefer results that match the city name
        const exactMatch = results.find(r => r.city?.toLowerCase() === cityName.toLowerCase() ||
            r.displayName.toLowerCase().includes(cityName.toLowerCase()));
        return exactMatch || results[0];
    }
    calculateDistance(loc1, loc2) {
        // Haversine formula
        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(loc2.lat - loc1.lat);
        const dLon = this.toRad(loc2.lon - loc1.lon);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(loc1.lat)) * Math.cos(this.toRad(loc2.lat)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    findNearestCity(location, cities) {
        if (cities.length === 0)
            return null;
        let nearest = cities[0];
        let minDistance = this.calculateDistance(location, nearest);
        for (let i = 1; i < cities.length; i++) {
            const distance = this.calculateDistance(location, cities[i]);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = cities[i];
            }
        }
        return nearest;
    }
    isValidCoordinate(lat, lon) {
        return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
    }
    formatCoordinate(lat, lon, format = 'decimal') {
        if (format === 'dms') {
            const latDir = lat >= 0 ? 'N' : 'S';
            const lonDir = lon >= 0 ? 'E' : 'W';
            const latAbs = Math.abs(lat);
            const lonAbs = Math.abs(lon);
            const latDeg = Math.floor(latAbs);
            const latMin = Math.floor((latAbs - latDeg) * 60);
            const latSec = ((latAbs - latDeg - latMin / 60) * 3600).toFixed(1);
            const lonDeg = Math.floor(lonAbs);
            const lonMin = Math.floor((lonAbs - lonDeg) * 60);
            const lonSec = ((lonAbs - lonDeg - lonMin / 60) * 3600).toFixed(1);
            return `${latDeg}°${latMin}'${latSec}"${latDir} ${lonDeg}°${lonMin}'${lonSec}"${lonDir}`;
        }
        // Decimal format
        return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }
    extractCity(address) {
        // Try different address fields in order of preference
        return address.city ||
            address.town ||
            address.village ||
            address.municipality ||
            address.county ||
            address.state ||
            'Unknown';
    }
    toRad(degrees) {
        return degrees * (Math.PI / 180);
    }
    // Clear cache
    clearCache() {
        this.cache.clear();
    }
    // Get cache statistics
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
        };
    }
    // Pre-populate cache with common cities
    preloadCommonCities() {
        const commonCities = [
            { lat: 40.7128, lon: -74.0060, city: 'New York', country: 'US' },
            { lat: 51.5074, lon: -0.1278, city: 'London', country: 'GB' },
            { lat: 35.6762, lon: 139.6503, city: 'Tokyo', country: 'JP' },
            { lat: 48.8566, lon: 2.3522, city: 'Paris', country: 'FR' },
            { lat: 3.1390, lon: 101.6869, city: 'Kuala Lumpur', country: 'MY' },
            { lat: 1.3521, lon: 103.8198, city: 'Singapore', country: 'SG' },
            { lat: -33.8688, lon: 151.2093, city: 'Sydney', country: 'AU' },
            { lat: 55.7558, lon: 37.6173, city: 'Moscow', country: 'RU' },
            { lat: 39.9042, lon: 116.4074, city: 'Beijing', country: 'CN' },
            { lat: 28.6139, lon: 77.2090, city: 'New Delhi', country: 'IN' },
        ];
        commonCities.forEach(city => {
            const cacheKey = `${city.lat.toFixed(4)},${city.lon.toFixed(4)}`;
            if (!this.cache.has(cacheKey)) {
                const result = {
                    ...city,
                    displayName: `${city.city}, ${city.country}`,
                    cachedAt: Date.now(),
                };
                this.cache.set(cacheKey, {
                    cachedAt: Date.now(),
                    data: result
                });
            }
        });
    }
}
exports.Geocoder = Geocoder;
//# sourceMappingURL=geocode.js.map