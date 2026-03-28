"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Formatters = void 0;
class Formatters {
    // Format temperature with unit
    static formatTemperature(celsius) {
        return `${Math.round(celsius)}°C`;
    }
    // Format wind speed
    static formatWindSpeed(kmh) {
        return `${Math.round(kmh)} km/h`;
    }
    // Format precipitation
    static formatPrecipitation(mm) {
        if (mm === 0)
            return '0 mm';
        if (mm < 1)
            return '<1 mm';
        return `${mm.toFixed(1)} mm`;
    }
    // Format probability percentage
    static formatProbability(percent) {
        return `${Math.round(percent)}%`;
    }
    // Format date and time
    static formatDateTime(date, includeTime = true) {
        const options = {
            month: 'short',
            day: 'numeric',
            ...(includeTime && {
                hour: '2-digit',
                minute: '2-digit',
            }),
        };
        return date.toLocaleString('en-US', options);
    }
    // Format time ago
    static formatTimeAgo(date) {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffDays > 0)
            return `${diffDays}d ago`;
        if (diffHours > 0)
            return `${diffHours}h ago`;
        if (diffMins > 0)
            return `${diffMins}m ago`;
        return 'Just now';
    }
    // Format duration in minutes to human readable
    static formatDuration(minutes) {
        if (minutes < 60) {
            return `${minutes}m`;
        }
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        if (remainingMinutes === 0) {
            return `${hours}h`;
        }
        return `${hours}h ${remainingMinutes}m`;
    }
    // Format phone number for display (mask sensitive parts)
    static formatPhoneNumber(phoneNumber) {
        if (!phoneNumber)
            return 'Unknown';
        // Keep country code and last 4 digits
        const countryCode = phoneNumber.substring(0, phoneNumber.length - 10);
        const lastFour = phoneNumber.substring(phoneNumber.length - 4);
        return `${countryCode}••• •••${lastFour}`;
    }
    // Format location string
    static formatLocation(location) {
        return `${location.city}, ${location.country}`;
    }
    // Format confidence level with emoji
    static formatConfidence(level) {
        const emoji = {
            LOW: '🟡',
            MEDIUM: '🟠',
            HIGH: '🔴',
        }[level];
        return `${emoji} ${level}`;
    }
    // Format alert type with emoji
    static formatAlertType(type) {
        const emoji = {
            EARLY_WARNING: '🌧️',
            FINAL_ALERT: '⛈️',
            ALL_CLEAR: '🌈',
        }[type];
        return `${emoji} ${type.replace('_', ' ')}`;
    }
    // Generate a summary of forecast for display
    static formatForecastSummary(forecast) {
        const location = this.formatLocation(forecast.location);
        const peakRain = forecast.peakRainProbability;
        const confidence = forecast.confidenceLevel;
        const providers = forecast.providersUsed.length;
        return `Forecast for ${location}: Peak rain ${peakRain}% (${confidence} confidence) from ${providers} providers`;
    }
    // Format user subscription for display
    static formatUserSubscription(user) {
        const location = this.formatLocation(user.location);
        const phone = this.formatPhoneNumber(user.whatsappNumber);
        const status = user.active ? 'Active' : 'Inactive';
        return `${phone} in ${location} - Threshold: ${user.rainThresholdPct}% - ${status}`;
    }
    // Generate a short weather description from hourly forecast
    static getWeatherDescription(hourly) {
        if (hourly.length === 0)
            return 'No data';
        // Analyze next 6 hours
        const next6Hours = hourly.slice(0, 6);
        const maxRain = Math.max(...next6Hours.map(h => h.rainProbabilityPct));
        const avgTemp = next6Hours.reduce((sum, h) => sum + h.temperatureCelsius, 0) / next6Hours.length;
        if (maxRain > 70)
            return 'Heavy rain expected';
        if (maxRain > 40)
            return 'Rain likely';
        if (maxRain > 20)
            return 'Light rain possible';
        if (avgTemp > 30)
            return 'Hot and clear';
        if (avgTemp < 10)
            return 'Cold and clear';
        return 'Partly cloudy';
    }
    // Format cache statistics
    static formatCacheStats(stats) {
        const hitRate = stats.hits + stats.misses > 0
            ? Math.round((stats.hits / (stats.hits + stats.misses)) * 100)
            : 0;
        return `Hits: ${stats.hits} | Misses: ${stats.misses} | Hit Rate: ${hitRate}% | Keys: ${stats.keys}`;
    }
    // Format bytes to human readable size
    static formatBytes(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }
    // Generate a progress bar for percentages
    static generateProgressBar(percent, length = 10) {
        const filled = Math.round((percent / 100) * length);
        const empty = length - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }
}
exports.Formatters = Formatters;
//# sourceMappingURL=formatters.js.map