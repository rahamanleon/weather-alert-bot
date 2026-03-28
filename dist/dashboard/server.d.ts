import { AlertWorker } from '../scheduler/alertWorker';
import { ForecastCache } from '../cache/forecastCache';
import { WeatherAggregator } from '../services/weatherAggregator';
import { WhatsAppClient } from '../whatsapp/baileysClient';
export interface DashboardServerConfig {
    port: number;
    logLevel: string;
}
export declare class DashboardServer {
    private alertWorker;
    private cache;
    private weatherAggregator;
    private whatsappClient;
    private config;
    private app;
    private server;
    constructor(alertWorker: AlertWorker, cache: ForecastCache, weatherAggregator: WeatherAggregator, whatsappClient: WhatsAppClient, config: DashboardServerConfig);
    private setupMiddleware;
    private setupRoutes;
    start(): Promise<void>;
    stop(): Promise<void>;
}
//# sourceMappingURL=server.d.ts.map