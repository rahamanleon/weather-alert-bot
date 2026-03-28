import { GeoLocation, HourlyForecast } from '../types';
import { BaseWeatherProvider } from './base';

export interface OpenMeteoResponse {
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation: number[];
    rain: number[];
    showers: number[];
    weathercode: number[];
    windspeed_10m: number[];
  };
}

export class OpenMeteoProvider extends BaseWeatherProvider {
  name = 'open-meteo';
  weight = 1.0; // Most reliable free provider
  
  constructor() {
    super('https://api.open-meteo.com/v1');
  }
  
  async getForecast(location: GeoLocation, hours: 24 | 48 | 72): Promise<HourlyForecast[]> {
    try {
      const data = await this.fetchWithRetry<OpenMeteoResponse>('/forecast', {
        params: {
          latitude: location.lat,
          longitude: location.lon,
          hourly: 'temperature_2m,precipitation,rain,showers,weathercode,windspeed_10m',
          forecast_days: Math.ceil(hours / 24),
          timezone: 'auto',
        },
      });
      
      return this.transformResponse(data, hours);
    } catch (error) {
      console.error(`OpenMeteo provider failed: ${error}`);
      return []; // Return empty array on failure as per spec
    }
  }
  
  async isHealthy(): Promise<boolean> {
    try {
      // Simple health check - try to fetch a known location
      await this.fetchWithRetry('/forecast', {
        params: {
          latitude: 51.5074,
          longitude: -0.1278,
          hourly: 'temperature_2m',
          forecast_days: 1,
        },
        timeout: 5000,
      });
      return true;
    } catch {
      return false;
    }
  }
  
  private transformResponse(data: OpenMeteoResponse, hours: number): HourlyForecast[] {
    const forecasts: HourlyForecast[] = [];
    const limit = Math.min(data.hourly.time.length, hours);
    
    for (let i = 0; i < limit; i++) {
      const time = data.hourly.time[i];
      const temp = data.hourly.temperature_2m[i];
      const precip = data.hourly.precipitation[i];
      const rain = data.hourly.rain[i];
      const showers = data.hourly.showers[i];
      const weatherCode = data.hourly.weathercode[i];
      const windSpeed = data.hourly.windspeed_10m[i];
      
      // Calculate rain probability from weather code
      const rainProbability = this.calculateRainProbability(weatherCode, rain, showers);
      
      forecasts.push({
        timestamp: this.normalizeTimestamp(time),
        rainProbabilityPct: rainProbability,
        precipitationMm: precip,
        temperatureCelsius: temp,
        windSpeedKmh: windSpeed * 3.6, // Convert m/s to km/h
        description: this.weatherCodeToDescription(weatherCode),
        source: 'open-meteo',
      });
    }
    
    return forecasts;
  }
  
  private calculateRainProbability(weatherCode: number, rain: number, showers: number): number {
    // Weather codes from WMO
    const rainCodes = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82];
    const snowCodes = [71, 73, 75, 77, 85, 86];
    
    if (rainCodes.includes(weatherCode)) {
      return Math.min(100, 30 + rain * 10 + showers * 15);
    }
    if (snowCodes.includes(weatherCode)) {
      return 20; // Snow counts as precipitation but not rain
    }
    if (weatherCode >= 95 && weatherCode <= 99) {
      return 80; // Thunderstorm
    }
    
    // Base probability from actual precipitation
    if (rain > 0 || showers > 0) {
      return Math.min(100, (rain + showers) * 50);
    }
    
    return 0;
  }
  
  private weatherCodeToDescription(code: number): string {
    const descriptions: Record<number, string> = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      56: 'Light freezing drizzle',
      57: 'Dense freezing drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      66: 'Light freezing rain',
      67: 'Heavy freezing rain',
      71: 'Slight snow fall',
      73: 'Moderate snow fall',
      75: 'Heavy snow fall',
      77: 'Snow grains',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      85: 'Slight snow showers',
      86: 'Heavy snow showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with slight hail',
      99: 'Thunderstorm with heavy hail',
    };
    
    return descriptions[code] || 'Unknown';
  }
}