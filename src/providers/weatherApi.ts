import { GeoLocation, HourlyForecast } from '../types';
import { BaseWeatherProvider } from './base';

export interface WeatherApiResponse {
  location: {
    name: string;
    region: string;
    country: string;
    lat: number;
    lon: number;
    tz_id: string;
    localtime_epoch: number;
    localtime: string;
  };
  forecast: {
    forecastday: Array<{
      date: string;
      date_epoch: number;
      day: {
        maxtemp_c: number;
        mintemp_c: number;
        avgtemp_c: number;
        maxwind_kph: number;
        totalprecip_mm: number;
        avgvis_km: number;
        avghumidity: number;
        daily_will_it_rain: number;
        daily_chance_of_rain: number;
        daily_will_it_snow: number;
        daily_chance_of_snow: number;
        condition: {
          text: string;
          icon: string;
          code: number;
        };
        uv: number;
      };
      hour: Array<{
        time_epoch: number;
        time: string;
        temp_c: number;
        condition: {
          text: string;
          icon: string;
          code: number;
        };
        wind_kph: number;
        wind_degree: number;
        wind_dir: string;
        pressure_mb: number;
        precip_mm: number;
        humidity: number;
        cloud: number;
        feelslike_c: number;
        windchill_c: number;
        heatindex_c: number;
        dewpoint_c: number;
        will_it_rain: number;
        chance_of_rain: number;
        will_it_snow: number;
        chance_of_snow: number;
        vis_km: number;
        gust_kph: number;
        uv: number;
      }>;
    }>;
  };
}

export class WeatherApiProvider extends BaseWeatherProvider {
  name = 'weatherapi';
  weight = 0.8; // Least reliable due to stricter free tier limits
  
  private apiKey: string;
  
  constructor(apiKey: string) {
    super('https://api.weatherapi.com/v1');
    this.apiKey = apiKey;
  }
  
  async getForecast(location: GeoLocation, hours: 24 | 48 | 72): Promise<HourlyForecast[]> {
    try {
      const days = Math.ceil(hours / 24);
      const data = await this.fetchWithRetry<WeatherApiResponse>('/forecast.json', {
        params: {
          key: this.apiKey,
          q: `${location.lat},${location.lon}`,
          days,
          aqi: 'no',
          alerts: 'no',
        },
      });
      
      return this.transformResponse(data, hours);
    } catch (error) {
      console.error(`WeatherAPI provider failed: ${error}`);
      return []; // Return empty array on failure as per spec
    }
  }
  
  async isHealthy(): Promise<boolean> {
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
    } catch {
      return false;
    }
  }
  
  private transformResponse(data: WeatherApiResponse, hours: number): HourlyForecast[] {
    const forecasts: HourlyForecast[] = [];
    let hoursProcessed = 0;
    
    for (const forecastDay of data.forecast.forecastday) {
      for (const hour of forecastDay.hour) {
        if (hoursProcessed >= hours) break;
        
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
      
      if (hoursProcessed >= hours) break;
    }
    
    return forecasts;
  }
}