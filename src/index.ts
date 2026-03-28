import fs from 'fs';
import path from 'path';
import { AppConfig } from './types';
import { Logger, initLogger } from './utils/logger';
import { WeatherAggregator } from './services/weatherAggregator';
import { ForecastCache } from './cache/forecastCache';
import { WhatsAppClient } from './whatsapp/baileysClient';
import { AlertWorker } from './scheduler/alertWorker';
import { DashboardServer } from './dashboard/server';

class WeatherAlertBot {
  private config: AppConfig;
  private logger: Logger;
  private weatherAggregator: WeatherAggregator;
  private cache: ForecastCache;
  private whatsappClient: WhatsAppClient;
  private alertWorker: AlertWorker;
  private dashboardServer: DashboardServer | null = null;
  
  constructor() {
    // Load configuration first (without logger)
    this.config = this.loadConfig();
    
    // Initialize logger
    this.logger = initLogger(this.config);
    this.logger.info('Weather Alert Bot starting...');
    
    // Initialize components
    this.weatherAggregator = this.initWeatherAggregator();
    this.cache = this.initCache();
    this.whatsappClient = this.initWhatsAppClient();
    this.alertWorker = this.initAlertWorker();
    
    // Setup graceful shutdown
    this.setupGracefulShutdown();
  }
  
  private loadConfig(): AppConfig {
    try {
      const configPath = path.join(__dirname, '..', 'config.json');
      
      if (!fs.existsSync(configPath)) {
        throw new Error(`Config file not found at ${configPath}. Please copy config.example.json to config.json and fill in your API keys.`);
      }
      
      const configData = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configData) as AppConfig;
      
      // Override with environment variables if present
      if (process.env.OPENWEATHER_API_KEY) {
        config.apis.openWeather.apiKey = process.env.OPENWEATHER_API_KEY;
      }
      
      if (process.env.WEATHERAPI_API_KEY) {
        config.apis.weatherApi.apiKey = process.env.WEATHERAPI_API_KEY;
      }
      
      if (process.env.PORT) {
        config.app.port = parseInt(process.env.PORT, 10);
      }
      
      // Can't log here because logger not initialized yet
      console.log('Configuration loaded successfully');
      return config;
    } catch (error) {
      console.error('Failed to load configuration', error);
      throw error;
    }
  }
  
  private initWeatherAggregator(): WeatherAggregator {
    this.logger.info('Initializing weather aggregator...');
    
    const openWeatherApiKey = this.config.apis.openWeather.enabled 
      ? this.config.apis.openWeather.apiKey 
      : undefined;
    
    const weatherApiKey = this.config.apis.weatherApi.enabled
      ? this.config.apis.weatherApi.apiKey
      : undefined;
    
    return new WeatherAggregator(
      openWeatherApiKey,
      weatherApiKey,
      this.config.apis.openMeteo.enabled,
      this.config.apis.openWeather.enabled,
      this.config.apis.weatherApi.enabled
    );
  }
  
  private initCache(): ForecastCache {
    this.logger.info('Initializing forecast cache...');
    
    return new ForecastCache(
      this.config.cache.forecastTtlMinutes,
      this.config.cache.maxEntries
    );
  }
  
  private initWhatsAppClient(): WhatsAppClient {
    this.logger.info('Initializing WhatsApp client...');
    
    return new WhatsAppClient({
      sessionPath: this.config.whatsapp.sessionPath,
      messageRateLimitMs: this.config.whatsapp.messageRateLimitMs,
    });
  }
  
  private initAlertWorker(): AlertWorker {
    this.logger.info('Initializing alert worker...');
    
    const worker = new AlertWorker(
      this.weatherAggregator,
      this.cache,
      this.whatsappClient,
      {
        schedulerIntervalMinutes: this.config.app.schedulerIntervalMinutes,
        defaultRainThresholdPct: this.config.alerts.defaultRainThresholdPct,
        defaultEarlyCooldownMinutes: this.config.alerts.defaultEarlyCooldownMinutes,
        defaultFinalCooldownMinutes: this.config.alerts.defaultFinalCooldownMinutes,
      }
    );
    
    // Add users from config
    this.config.users.forEach(user => {
      worker.addSubscription(user);
    });
    
    return worker;
  }
  
  private async initDashboardServer(): Promise<void> {
    this.logger.info('Initializing dashboard server...');
    
    this.dashboardServer = new DashboardServer(
      this.alertWorker,
      this.cache,
      this.weatherAggregator,
      this.whatsappClient,
      {
        port: this.config.app.port,
        logLevel: this.config.app.logLevel,
      }
    );
    
    await this.dashboardServer.start();
  }
  
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      this.logger.info(`Received ${signal}. Shutting down gracefully...`);
      
      try {
        // Stop alert worker
        this.alertWorker.stop();
        
        // Stop dashboard server if running
        if (this.dashboardServer) {
          await this.dashboardServer.stop();
        }
        
        // Disconnect WhatsApp
        await this.whatsappClient.disconnect();
        
        this.logger.info('Shutdown complete');
        process.exit(0);
      } catch (error) {
        this.logger.error('Error during shutdown', error);
        process.exit(1);
      }
    };
    
    // Register signal handlers
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception', error);
    });
    
    process.on('unhandledRejection', (reason, _promise) => {
      this.logger.error('Unhandled promise rejection', reason);
    });
  }
  
  async start(): Promise<void> {
    try {
      this.logger.info('Starting Weather Alert Bot...');
      
      // Connect to WhatsApp
      const whatsappConnected = await this.whatsappClient.connect();
      
      if (!whatsappConnected) {
        this.logger.warn('WhatsApp connection failed. Alerts will be queued but not sent until connection is established.');
      }
      
      // Start alert worker
      await this.alertWorker.start();
      
      // Start dashboard server
      await this.initDashboardServer();
      
      // Log startup completion
      this.logger.info('Weather Alert Bot started successfully!');
      this.logger.info(`Dashboard available at http://localhost:${this.config.app.port}`);
      this.logger.info(`Alert worker running every ${this.config.app.schedulerIntervalMinutes} minutes`);
      this.logger.info(`Monitoring ${this.config.users.length} users`);
      
      // Log provider health
      const providerHealth = await this.weatherAggregator.getProviderHealth();
      providerHealth.forEach(provider => {
        this.logger.info(`Provider ${provider.name}: ${provider.healthy ? 'HEALTHY' : 'UNHEALTHY'} (weight: ${provider.weight})`);
      });
      
    } catch (error) {
      this.logger.error('Failed to start Weather Alert Bot', error);
      process.exit(1);
    }
  }
  
  // Public API for programmatic control
  getAlertWorker(): AlertWorker {
    return this.alertWorker;
  }
  
  getWeatherAggregator(): WeatherAggregator {
    return this.weatherAggregator;
  }
  
  getCache(): ForecastCache {
    return this.cache;
  }
  
  getWhatsAppClient(): WhatsAppClient {
    return this.whatsappClient;
  }
  
  getConfig(): AppConfig {
    return this.config;
  }
}

// Export for programmatic use
export { WeatherAlertBot };

// Start the bot if this file is run directly
if (require.main === module) {
  const bot = new WeatherAlertBot();
  bot.start().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}