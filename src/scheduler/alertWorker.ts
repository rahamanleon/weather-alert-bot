import cron from 'node-cron';
import { UserSubscription, AggregatedForecast, AlertType, AlertDecision } from '../types';
import { WeatherAggregator } from '../services/weatherAggregator';
import { ForecastCache } from '../cache/forecastCache';
import { WhatsAppClient } from '../whatsapp/baileysClient';

export interface AlertWorkerConfig {
  schedulerIntervalMinutes: number;
  defaultRainThresholdPct: number;
  defaultEarlyCooldownMinutes: number;
  defaultFinalCooldownMinutes: number;
}

export class AlertWorker {
  private isRunning = false;
  private cronJob: cron.ScheduledTask | null = null;
  private userSubscriptions: Map<string, UserSubscription> = new Map();
  private alertCooldowns: Map<string, { early: Date | null; final: Date | null }> = new Map();
  private alertLog: Array<{
    userId: string;
    type: AlertType;
    rainProbability: number;
    sentAt: Date;
  }> = [];
  
  constructor(
    private weatherAggregator: WeatherAggregator,
    private cache: ForecastCache,
    private whatsappClient: WhatsAppClient,
    private config: AlertWorkerConfig
  ) {}
  
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Alert worker is already running');
      return;
    }
    
    console.log(`Starting alert worker with ${this.config.schedulerIntervalMinutes} minute interval`);
    
    // Convert minutes to cron expression (every X minutes)
    const cronExpression = `*/${this.config.schedulerIntervalMinutes} * * * *`;
    
    this.cronJob = cron.schedule(cronExpression, async () => {
      await this.processAllSubscriptions();
    });
    
    this.isRunning = true;
    console.log('Alert worker started successfully');
    
    // Run immediately on startup
    await this.processAllSubscriptions();
  }
  
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    
    this.isRunning = false;
    console.log('Alert worker stopped');
  }
  
  addSubscription(user: UserSubscription): void {
    this.userSubscriptions.set(user.id, user);
    this.alertCooldowns.set(user.id, { early: null, final: null });
    console.log(`Added subscription for user ${user.id} (${user.whatsappNumber})`);
  }
  
  removeSubscription(userId: string): boolean {
    const deleted = this.userSubscriptions.delete(userId);
    this.alertCooldowns.delete(userId);
    
    if (deleted) {
      console.log(`Removed subscription for user ${userId}`);
    }
    
    return deleted;
  }
  
  getSubscription(userId: string): UserSubscription | undefined {
    return this.userSubscriptions.get(userId);
  }
  
  getAllSubscriptions(): UserSubscription[] {
    return Array.from(this.userSubscriptions.values());
  }
  
  getAlertLog(limit: number = 100): Array<{
    userId: string;
    type: AlertType;
    rainProbability: number;
    sentAt: Date;
  }> {
    return this.alertLog.slice(-limit).reverse();
  }
  
  private async processAllSubscriptions(): Promise<void> {
    const startTime = Date.now();
    console.log(`Processing ${this.userSubscriptions.size} subscriptions...`);
    
    let alertsSent = 0;
    let alertsQueued = 0;
    
    for (const user of this.userSubscriptions.values()) {
      if (!user.active) continue;
      
      try {
        const result = await this.processUserSubscription(user);
        if (result === 'sent') alertsSent++;
        if (result === 'queued') alertsQueued++;
      } catch (error) {
        console.error(`Error processing subscription for user ${user.id}:`, error);
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`Processed all subscriptions in ${duration}ms. Sent ${alertsSent} alerts${alertsQueued > 0 ? `, queued ${alertsQueued}` : ''}.`);
  }
  
  private async processUserSubscription(user: UserSubscription): Promise<'sent' | 'queued' | 'none'> {
    // Check cooldowns
    const cooldown = this.alertCooldowns.get(user.id);
    if (cooldown && this.isInCooldown(user, cooldown)) {
      return 'none';
    }
    
    // Get forecast from cache or fetch new
    const cacheKey = this.cache.generateLocationKey(user.location.lat, user.location.lon, 24);
    let forecast = this.cache.get(cacheKey);
    
    if (!forecast || !this.cache.isFresh(forecast)) {
      forecast = await this.weatherAggregator.getAggregatedForecast(user.location, 24);
      if (forecast.hourly.length > 0) {
        this.cache.set(cacheKey, forecast);
      }
    }
    
    if (forecast.hourly.length === 0) {
      console.log(`No forecast data available for user ${user.id}`);
      return 'none';
    }
    
    // Make alert decision
    const decision = this.makeAlertDecision(forecast, user);
    
    if (!decision.shouldAlert || !decision.type) {
      return 'none';
    }
    
    // Send alert via WhatsApp
    const message = this.formatAlertMessage(user, forecast, decision);
    const connectionStatus = this.whatsappClient.getConnectionStatus();
    const queued = await this.whatsappClient.sendMessage(user.whatsappNumber, message);
    
    if (!queued) {
      return 'none';
    }

    if (!connectionStatus.isConnected) {
      console.log(`Alert queued for ${user.whatsappNumber}: ${decision.type} (WhatsApp not connected)`);
      return 'queued';
    }

    if (queued) {
      // Update cooldowns
      this.updateCooldowns(user.id, decision.type);
      
      // Update user's last alert
      user.lastAlertSentAt = new Date();
      user.lastAlertType = decision.type;
      
      // Log the alert
      this.alertLog.push({
        userId: user.id,
        type: decision.type,
        rainProbability: decision.rainProbability,
        sentAt: new Date(),
      });
      
      // Keep log size manageable
      if (this.alertLog.length > 1000) {
        this.alertLog = this.alertLog.slice(-500);
      }
      
      console.log(`Alert sent to ${user.whatsappNumber}: ${decision.type}`);
      return 'sent';
    }
    
    return 'none';
  }
  
  private makeAlertDecision(
    forecast: AggregatedForecast,
    user: UserSubscription
  ): AlertDecision {
    const threshold = user.rainThresholdPct || this.config.defaultRainThresholdPct;
    
    // Analyze next 6 hours for early warning
    const next6Hours = forecast.hourly.slice(0, 6);
    const next1Hour = forecast.hourly[0];
    
    if (!next1Hour) {
      return { shouldAlert: false, confidence: 'LOW', rainProbability: 0, expectedInHours: 0 };
    }
    
    // Check for ALL CLEAR (rain has passed)
    const hasRecentRain = this.hasRecentRainAlert(user);
    const currentRainLow = next1Hour.rainProbabilityPct < threshold - 20;
    
    if (hasRecentRain && currentRainLow) {
      return {
        shouldAlert: true,
        type: 'ALL_CLEAR',
        confidence: forecast.confidenceLevel,
        rainProbability: next1Hour.rainProbabilityPct,
        expectedInHours: 0,
      };
    }
    
    // Check for FINAL ALERT (rain in next 1 hour)
    const finalAlertThreshold = threshold + 15;
    if (next1Hour.rainProbabilityPct >= finalAlertThreshold && forecast.confidenceLevel === 'HIGH') {
      return {
        shouldAlert: true,
        type: 'FINAL_ALERT',
        confidence: forecast.confidenceLevel,
        rainProbability: next1Hour.rainProbabilityPct,
        expectedInHours: 1,
      };
    }
    
    // Check for EARLY WARNING (rain in next 6 hours)
    const maxRainIn6Hours = Math.max(...next6Hours.map(h => h.rainProbabilityPct));
    if (maxRainIn6Hours >= threshold && forecast.confidenceLevel !== 'LOW') {
      // Find when rain is expected
      const expectedHour = next6Hours.findIndex(h => h.rainProbabilityPct >= threshold);
      const expectedInHours = expectedHour >= 0 ? expectedHour + 1 : 6;
      
      return {
        shouldAlert: true,
        type: 'EARLY_WARNING',
        confidence: forecast.confidenceLevel,
        rainProbability: maxRainIn6Hours,
        expectedInHours,
      };
    }
    
    return {
      shouldAlert: false,
      confidence: forecast.confidenceLevel,
      rainProbability: next1Hour.rainProbabilityPct,
      expectedInHours: 0,
    };
  }
  
  private isInCooldown(
    user: UserSubscription,
    cooldown: { early: Date | null; final: Date | null }
  ): boolean {
    const now = new Date();
    
    // Check early warning cooldown
    if (cooldown.early) {
      const earlyCooldownMs = (user.earlyCooldownMinutes || this.config.defaultEarlyCooldownMinutes) * 60 * 1000;
      if (now.getTime() - cooldown.early.getTime() < earlyCooldownMs) {
        return true;
      }
    }
    
    // Check final alert cooldown
    if (cooldown.final) {
      const finalCooldownMs = (user.finalCooldownMinutes || this.config.defaultFinalCooldownMinutes) * 60 * 1000;
      if (now.getTime() - cooldown.final.getTime() < finalCooldownMs) {
        return true;
      }
    }
    
    return false;
  }
  
  private updateCooldowns(userId: string, alertType: AlertType): void {
    const cooldown = this.alertCooldowns.get(userId);
    if (!cooldown) return;
    
    const now = new Date();
    
    switch (alertType) {
      case 'EARLY_WARNING':
        cooldown.early = now;
        break;
      case 'FINAL_ALERT':
        cooldown.final = now;
        break;
      case 'ALL_CLEAR':
        // Reset both cooldowns
        cooldown.early = null;
        cooldown.final = null;
        break;
    }
    
    this.alertCooldowns.set(userId, cooldown);
  }
  
  private hasRecentRainAlert(user: UserSubscription): boolean {
    if (!user.lastAlertSentAt || !user.lastAlertType) return false;
    
    const alertTypes: AlertType[] = ['EARLY_WARNING', 'FINAL_ALERT'];
    const isRainAlert = alertTypes.includes(user.lastAlertType);
    const isRecent = Date.now() - user.lastAlertSentAt.getTime() < 24 * 60 * 60 * 1000; // Within 24 hours
    
    return isRainAlert && isRecent;
  }
  
  private formatAlertMessage(
    user: UserSubscription,
    forecast: AggregatedForecast,
    decision: AlertDecision
  ): string {
    const location = `${user.location.city}, ${user.location.country}`;
    const emoji = {
      EARLY_WARNING: '🌧️',
      FINAL_ALERT: '⛈️',
      ALL_CLEAR: '🌈',
    }[decision.type!];
    
    const title = {
      EARLY_WARNING: 'RAIN ALERT — Early Warning',
      FINAL_ALERT: 'RAIN ALERT — Final Warning',
      ALL_CLEAR: 'ALL CLEAR — Rain Has Passed',
    }[decision.type!];
    
    const currentHour = forecast.hourly[0];
    
    let message = `${emoji} *${title}*\n`;
    message += `📍 Location: ${location}\n`;
    
    if (decision.type !== 'ALL_CLEAR') {
      message += `🕐 Expected in: ~${decision.expectedInHours} hour${decision.expectedInHours !== 1 ? 's' : ''}\n`;
    }
    
    message += `💧 Rain Probability: ${decision.rainProbability}% (${decision.confidence} confidence)\n`;
    
    if (currentHour) {
      message += `🌡️ Temp: ${Math.round(currentHour.temperatureCelsius)}°C | `;
      message += `💨 Wind: ${Math.round(currentHour.windSpeedKmh)} km/h\n`;
    }
    
    message += `📊 Sources: ${forecast.providersUsed.map(p => p.replace('-', ' ')).join(' ✓ ')}\n\n`;
    
    if (decision.type === 'ALL_CLEAR') {
      message += '_The rain has passed. Stay dry!_\n';
    } else {
      message += `_Next check in ${this.config.schedulerIntervalMinutes} minutes. Reply STOP to unsubscribe._`;
    }
    
    return message;
  }
  
  getStats(): {
    totalUsers: number;
    activeUsers: number;
    alertsSentToday: number;
    isRunning: boolean;
  } {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const alertsSentToday = this.alertLog.filter(
      alert => alert.sentAt >= startOfDay
    ).length;
    
    return {
      totalUsers: this.userSubscriptions.size,
      activeUsers: Array.from(this.userSubscriptions.values()).filter(u => u.active).length,
      alertsSentToday,
      isRunning: this.isRunning,
    };
  }
}
