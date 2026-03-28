import { GeoLocation, HourlyForecast } from '../types';
import { BaseWeatherProvider } from './base';

export interface OpenWeatherResponse {
  list: Array<{
    dt: number;
    main: {
      temp: number;
      feels_like: number;
      pressure: number;
      humidity: number;
    };
    weather: Array<{
      id: number;
      main: string;
      description: string;
      icon: string;
    }>;
    clouds: {
      all: number;
    };
    wind: {
      speed: number;
      deg: number;
    };
    pop: number; // Probability of precipitation
    rain?: {
      '3h': number;
    };
  }>;
  city: {
    name: string;
    coord: {
      lat: number;
      lon: number;
    };
    country: string;
  };
}

export class OpenWeatherProvider extends BaseWeatherProvider {
  name = 'openweather';
  weight = 0.9; // Slightly less reliable due to rate limits
  
  private apiKey: string;
  
  constructor(apiKey: string) {
    super('https://api.openweathermap.org/data/2.5');
    this.apiKey = apiKey;
  }
  
  async getForecast(location: GeoLocation, hours: 24 | 48 | 72): Promise<HourlyForecast[]> {
    try {
      const data = await this.fetchWithRetry<OpenWeatherResponse>('/forecast', {
        params: {
          lat: location.lat,
          lon: location.lon,
          appid: this.apiKey,
          units: 'metric',
          cnt: Math.ceil(hours / 3), // OpenWeather provides 3-hour intervals
        },
      });
      
      return this.transformResponse(data, hours);
    } catch (error) {
      console.error(`OpenWeather provider failed: ${error}`);
      return []; // Return empty array on failure as per spec
    }
  }
  
  async isHealthy(): Promise<boolean> {
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
    } catch {
      return false;
    }
  }
  
  private transformResponse(data: OpenWeatherResponse, hours: number): HourlyForecast[] {
    const forecasts: HourlyForecast[] = [];
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