import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { AlertWorker } from '../scheduler/alertWorker';
import { ForecastCache } from '../cache/forecastCache';
import { WeatherAggregator } from '../services/weatherAggregator';
import { WhatsAppClient } from '../whatsapp/baileysClient';
import { UserSubscription } from '../types';

export interface DashboardServerConfig {
  port: number;
  logLevel: string;
}

export class DashboardServer {
  private app = express();
  private server: any = null;
  
  constructor(
    private alertWorker: AlertWorker,
    private cache: ForecastCache,
    private weatherAggregator: WeatherAggregator,
    private whatsappClient: WhatsAppClient,
    private config: DashboardServerConfig
  ) {
    this.setupMiddleware();
    this.setupRoutes();
  }
  
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));
    
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, 'public')));
  }
  
  private setupRoutes(): void {
    // Dashboard HTML page
    this.app.get('/', (_req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // WhatsApp Auth Page
    this.app.get('/auth', (_req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'auth.html'));
    });
    
    // System stats JSON
    this.app.get('/api/stats', (_req, res) => {
      const cacheStats = this.cache.stats();
      const workerStats = this.alertWorker.getStats();
      const whatsappStatus = this.whatsappClient.getConnectionStatus();
      const queueStats = this.whatsappClient.getQueueStats();
      
      res.json({
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          nodeVersion: process.version,
        },
        cache: {
          hits: cacheStats.hits,
          misses: cacheStats.misses,
          hitRate: this.cache.getHitRate(),
          keys: cacheStats.keys,
        },
        alerts: workerStats,
        whatsapp: {
          connected: whatsappStatus.isConnected,
          queueSize: whatsappStatus.queueSize,
          connectionAttempts: whatsappStatus.connectionAttempts,
          pendingMessages: queueStats.pendingMessages,
        },
        timestamp: new Date().toISOString(),
      });
    });
    
    // All subscriptions
    this.app.get('/api/users', (_req, res) => {
      const users = this.alertWorker.getAllSubscriptions();
      res.json(users);
    });
    
    // Recent alert log
    this.app.get('/api/logs', (req, res) => {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = this.alertWorker.getAlertLog(limit);
      res.json(logs);
    });
    
    // Live forecast for user
    this.app.get('/api/forecast/:userId', async (req, res) => {
      const { userId } = req.params;
      const user = this.alertWorker.getSubscription(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      try {
        const cacheKey = this.cache.generateLocationKey(user.location.lat, user.location.lon, 24);
        let forecast = this.cache.get(cacheKey);
        
        if (!forecast) {
          forecast = await this.weatherAggregator.getAggregatedForecast(user.location, 24);
        }
        
        return res.json({
          user,
          forecast,
          cacheHit: !!this.cache.get(cacheKey),
        });
      } catch (error) {
        console.error('Error fetching forecast:', error);
        return res.status(500).json({ error: 'Failed to fetch forecast' });
      }
    });
    
    // Add subscription
    this.app.post('/api/users', async (req, res) => {
      try {
        const userData: UserSubscription = req.body;
        
        // Validate required fields
        if (!userData.whatsappNumber || !userData.location) {
          return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Generate ID if not provided
        if (!userData.id) {
          userData.id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        
        // Set defaults
        userData.active = userData.active !== false;
        userData.createdAt = new Date();
        userData.rainThresholdPct = userData.rainThresholdPct || 60;
        userData.earlyCooldownMinutes = userData.earlyCooldownMinutes || 120;
        userData.finalCooldownMinutes = userData.finalCooldownMinutes || 60;
        
        this.alertWorker.addSubscription(userData);
        
        return res.status(201).json({
          success: true,
          user: userData,
          message: 'Subscription added successfully',
        });
      } catch (error) {
        console.error('Error adding subscription:', error);
        return res.status(500).json({ error: 'Failed to add subscription' });
      }
    });
    
    // Remove subscription
    this.app.delete('/api/users/:id', (req, res) => {
      const { id } = req.params;
      const deleted = this.alertWorker.removeSubscription(id);
      
      if (deleted) {
        res.json({ success: true, message: 'Subscription removed' });
      } else {
        res.status(404).json({ error: 'Subscription not found' });
      }
    });
    
    // Provider health
    this.app.get('/api/providers/health', async (_req, res) => {
      try {
        const health = await this.weatherAggregator.getProviderHealth();
        return res.json(health);
      } catch (error) {
        console.error('Error fetching provider health:', error);
        return res.status(500).json({ error: 'Failed to fetch provider health' });
      }
    });
    
    // Cache stats
    this.app.get('/api/cache/stats', (_req, res) => {
      const stats = this.cache.stats();
      return res.json({
        ...stats,
        hitRate: this.cache.getHitRate(),
        allKeys: this.cache.getAllKeys(),
      });
    });
    
    // Clear cache
    this.app.post('/api/cache/clear', (_req, res) => {
      this.cache.invalidateAll();
      return res.json({ success: true, message: 'Cache cleared' });
    });
    
    // WhatsApp status
    this.app.get('/api/whatsapp/status', (_req, res) => {
      const status = this.whatsappClient.getConnectionStatus();
      const queueStats = this.whatsappClient.getQueueStats();
      
      return res.json({
        ...status,
        queueStats,
      });
    });
    
    // Send test message
    this.app.post('/api/whatsapp/test', async (req, res) => {
      const { phoneNumber, message } = req.body;

      if (!phoneNumber || !message) {
        return res.status(400).json({ error: 'Phone number and message are required' });
      }

      try {
        const success = await this.whatsappClient.sendMessage(phoneNumber, message);

        if (success) {
          return res.json({ success: true, message: 'Test message queued' });
        } else {
          return res.status(500).json({ error: 'Failed to queue test message' });
        }
      } catch (error) {
        console.error('Error sending test message:', error);
        return res.status(500).json({ error: 'Failed to send test message' });
      }
    });

    // WhatsApp QR Code
    this.app.get('/api/whatsapp/qr', (_req, res) => {
      const qrData = this.whatsappClient.getQRCode();
      return res.json(qrData);
    });

    // WhatsApp Auth Status
    this.app.get('/api/whatsapp/auth-status', (_req, res) => {
      const authStatus = this.whatsappClient.getAuthStatus();
      return res.json(authStatus);
    });

    // WhatsApp Clear Credentials
    this.app.post('/api/whatsapp/clear-credentials', (_req, res) => {
      const cleared = this.whatsappClient.clearCredentials();
      if (cleared) {
        return res.json({ success: true, message: 'Credentials cleared. Please scan QR code to re-authenticate.' });
      } else {
        return res.json({ success: false, message: 'No credentials found to clear.' });
      }
    });

    // WhatsApp Reconnect
    this.app.post('/api/whatsapp/reconnect', async (_req, res) => {
      try {
        const connected = await this.whatsappClient.triggerReconnect();
        if (connected) {
          return res.json({ success: true, message: 'Reconnection initiated' });
        } else {
          return res.status(500).json({ success: false, message: 'Failed to initiate reconnection' });
        }
      } catch (error) {
        console.error('Error triggering reconnection:', error);
        return res.status(500).json({ error: 'Failed to trigger reconnection' });
      }
    });

    // Health check for Render
    this.app.get('/health', (_req, res) => {
      return res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });
    
    // 404 handler
    this.app.use((_req, res) => {
      return res.status(404).json({ error: 'Route not found' });
    });
    
    // Error handler
    this.app.use((error: any, _req: any, res: any, _next: any) => {
      console.error('Server error:', error);
      res.status(500).json({ error: 'Internal server error' });
    });
  }
  
  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.config.port, () => {
        console.log(`Dashboard server running on port ${this.config.port}`);
        console.log(`Dashboard available at http://localhost:${this.config.port}`);
        resolve();
      });
    });
  }
  
  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((error: any) => {
          if (error) {
            reject(error);
          } else {
            console.log('Dashboard server stopped');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}