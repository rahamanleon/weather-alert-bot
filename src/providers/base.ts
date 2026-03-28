import { GeoLocation, HourlyForecast, WeatherProvider } from '../types';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export abstract class BaseWeatherProvider implements WeatherProvider {
  abstract name: string;
  abstract weight: number;
  
  protected readonly baseUrl: string;
  protected readonly timeoutMs: number = 10000;
  protected readonly maxRetries: number = 3;
  protected readonly httpClient: AxiosInstance;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.httpClient = axios.create({
      baseURL: baseUrl,
      timeout: this.timeoutMs,
      headers: {
        'User-Agent': 'WeatherAlertBot/1.0',
      },
    });
  }
  
  abstract getForecast(location: GeoLocation, hours: 24 | 48 | 72): Promise<HourlyForecast[]>;
  abstract isHealthy(): Promise<boolean>;
  
  protected async fetchWithRetry<T>(
    endpoint: string,
    config?: AxiosRequestConfig,
    retryCount = 0
  ): Promise<T> {
    try {
      const response = await this.httpClient.get<T>(endpoint, config);
      return response.data;
    } catch (error) {
      if (retryCount < this.maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry<T>(endpoint, config, retryCount + 1);
      }
      throw error;
    }
  }
  
  protected normalizeTimestamp(timestamp: string | number | Date): Date {
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