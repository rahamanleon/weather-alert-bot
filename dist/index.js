"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeatherAlertBot = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("./utils/logger");
const weatherAggregator_1 = require("./services/weatherAggregator");
const forecastCache_1 = require("./cache/forecastCache");
const baileysClient_1 = require("./whatsapp/baileysClient");
const alertWorker_1 = require("./scheduler/alertWorker");
const server_1 = require("./dashboard/server");
class WeatherAlertBot {
    config;
    logger;
    weatherAggregator;
    cache;
    whatsappClient;
    alertWorker;
    dashboardServer = null;
    constructor() {
        // Load configuration first (without logger)
        this.config = this.loadConfig();
        // Initialize logger
        this.logger = (0, logger_1.initLogger)(this.config);
        this.logger.info('Weather Alert Bot starting...');
        // Initialize components
        this.weatherAggregator = this.initWeatherAggregator();
        this.cache = this.initCache();
        this.whatsappClient = this.initWhatsAppClient();
        this.alertWorker = this.initAlertWorker();
        // Setup graceful shutdown
        this.setupGracefulShutdown();
    }
    loadConfig() {
        try {
            const configPath = path_1.default.join(__dirname, '..', 'config.json');
            if (!fs_1.default.existsSync(configPath)) {
                throw new Error(`Config file not found at ${configPath}. Please copy config.example.json to config.json and fill in your API keys.`);
            }
            const configData = fs_1.default.readFileSync(configPath, 'utf-8');
            const config = JSON.parse(configData);
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
        }
        catch (error) {
            console.error('Failed to load configuration', error);
            throw error;
        }
    }
    initWeatherAggregator() {
        this.logger.info('Initializing weather aggregator...');
        const openWeatherApiKey = this.config.apis.openWeather.enabled
            ? this.config.apis.openWeather.apiKey
            : undefined;
        const weatherApiKey = this.config.apis.weatherApi.enabled
            ? this.config.apis.weatherApi.apiKey
            : undefined;
        return new weatherAggregator_1.WeatherAggregator(openWeatherApiKey, weatherApiKey, this.config.apis.openMeteo.enabled, this.config.apis.openWeather.enabled, this.config.apis.weatherApi.enabled);
    }
    initCache() {
        this.logger.info('Initializing forecast cache...');
        return new forecastCache_1.ForecastCache(this.config.cache.forecastTtlMinutes, this.config.cache.maxEntries);
    }
    initWhatsAppClient() {
        this.logger.info('Initializing WhatsApp client...');
        return new baileysClient_1.WhatsAppClient({
            sessionPath: this.config.whatsapp.sessionPath,
            messageRateLimitMs: this.config.whatsapp.messageRateLimitMs,
        });
    }
    initAlertWorker() {
        this.logger.info('Initializing alert worker...');
        const worker = new alertWorker_1.AlertWorker(this.weatherAggregator, this.cache, this.whatsappClient, {
            schedulerIntervalMinutes: this.config.app.schedulerIntervalMinutes,
            defaultRainThresholdPct: this.config.alerts.defaultRainThresholdPct,
            defaultEarlyCooldownMinutes: this.config.alerts.defaultEarlyCooldownMinutes,
            defaultFinalCooldownMinutes: this.config.alerts.defaultFinalCooldownMinutes,
        });
        // Add users from config
        this.config.users.forEach(user => {
            worker.addSubscription(user);
        });
        return worker;
    }
    async initDashboardServer() {
        this.logger.info('Initializing dashboard server...');
        this.dashboardServer = new server_1.DashboardServer(this.alertWorker, this.cache, this.weatherAggregator, this.whatsappClient, {
            port: this.config.app.port,
            logLevel: this.config.app.logLevel,
        });
        await this.dashboardServer.start();
    }
    setupGracefulShutdown() {
        const shutdown = async (signal) => {
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
            }
            catch (error) {
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
    async start() {
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
        }
        catch (error) {
            this.logger.error('Failed to start Weather Alert Bot', error);
            process.exit(1);
        }
    }
    // Public API for programmatic control
    getAlertWorker() {
        return this.alertWorker;
    }
    getWeatherAggregator() {
        return this.weatherAggregator;
    }
    getCache() {
        return this.cache;
    }
    getWhatsAppClient() {
        return this.whatsappClient;
    }
    getConfig() {
        return this.config;
    }
}
exports.WeatherAlertBot = WeatherAlertBot;
// Start the bot if this file is run directly
if (require.main === module) {
    const bot = new WeatherAlertBot();
    bot.start().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map