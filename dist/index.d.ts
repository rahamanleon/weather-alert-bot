import { AppConfig } from './types';
import { WeatherAggregator } from './services/weatherAggregator';
import { ForecastCache } from './cache/forecastCache';
import { WhatsAppClient } from './whatsapp/baileysClient';
import { AlertWorker } from './scheduler/alertWorker';
declare class WeatherAlertBot {
    private config;
    private logger;
    private weatherAggregator;
    private cache;
    private whatsappClient;
    private alertWorker;
    private dashboardServer;
    constructor();
    private loadConfig;
    private initWeatherAggregator;
    private initCache;
    private initWhatsAppClient;
    private initAlertWorker;
    private initDashboardServer;
    private setupGracefulShutdown;
    start(): Promise<void>;
    getAlertWorker(): AlertWorker;
    getWeatherAggregator(): WeatherAggregator;
    getCache(): ForecastCache;
    getWhatsAppClient(): WhatsAppClient;
    getConfig(): AppConfig;
}
export { WeatherAlertBot };
//# sourceMappingURL=index.d.ts.map