// Dashboard JavaScript for Weather Alert Bot
class Dashboard {
    constructor() {
        this.baseUrl = window.location.origin;
        this.chart = null;
        this.uptimeInterval = null;
        this.refreshInterval = null;
        this.whatsappPollInterval = null;
        this.startTime = Date.now();

        // Initialize
        this.init();
    }

    async init() {
        // Start rain animation
        this.initRainCanvas();

        // Load initial data
        await this.loadAllData();

        // Start auto-refresh
        this.startAutoRefresh();

        // Update uptime counter
        this.updateUptime();
        this.uptimeInterval = setInterval(() => this.updateUptime(), 1000);

        // Start WhatsApp status polling
        this.loadWhatsAppStatus();
        this.whatsappPollInterval = setInterval(() => this.loadWhatsAppStatus(), 5000);
    }

    async loadAllData() {
        try {
            await Promise.all([
                this.loadSystemStats(),
                this.loadSubscriptions(),
                this.loadAlertLog(),
                this.loadProviderHealth()
            ]);
        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Failed to load dashboard data');
        }
    }
    
    async loadSystemStats() {
        try {
            const response = await fetch('/api/stats');
            const data = await response.json();

            // Update stats cards
            document.getElementById('stat-users').querySelector('.stat-value').textContent =
                data.alerts.totalUsers;
            document.getElementById('stat-alerts').querySelector('.stat-value').textContent =
                data.alerts.alertsSentToday;
            document.getElementById('stat-cache').querySelector('.stat-value').textContent =
                data.cache.hitRate;

            // Update system status LED
            const statusLed = document.getElementById('system-status-led');
            if (data.alerts.isRunning) {
                statusLed.classList.remove('offline');
                statusLed.classList.add('online');
            } else {
                statusLed.classList.remove('online');
                statusLed.classList.add('offline');
            }

            // Pulse cards with new data
            this.pulseCard('stat-users');
            this.pulseCard('stat-alerts');
            this.pulseCard('stat-cache');

        } catch (error) {
            console.error('Error loading system stats:', error);
        }
    }

    async loadWhatsAppStatus() {
        try {
            const response = await fetch('/api/whatsapp/auth-status');
            const status = await response.json();

            const whatsappLink = document.getElementById('whatsapp-status-link');
            const whatsappDot = document.getElementById('whatsapp-status-dot');
            const whatsappText = document.getElementById('whatsapp-status-text');

            if (whatsappLink && whatsappDot && whatsappText) {
                whatsappLink.style.display = 'flex';

                // Update status display
                whatsappLink.className = 'nav-whatsapp';
                if (status.isConnected) {
                    whatsappLink.classList.add('connected');
                    whatsappText.textContent = 'WhatsApp Connected';
                } else if (status.isConnecting) {
                    whatsappLink.classList.add('connecting');
                    whatsappText.textContent = 'Connecting...';
                } else {
                    whatsappLink.classList.add('disconnected');
                    whatsappText.textContent = status.requiresAuth ? 'Auth Required' : 'Disconnected';
                }
            }

        } catch (error) {
            console.error('Error loading WhatsApp status:', error);
        }
    }
    
    async loadSubscriptions() {
        const spinner = document.getElementById('subscriptions-spinner');
        spinner.style.display = 'inline-block';
        
        try {
            const response = await fetch('/api/users');
            const users = await response.json();
            
            const tableBody = document.getElementById('subscriptions-body');
            const userSelect = document.getElementById('user-select');
            
            // Clear existing rows (except first option)
            tableBody.innerHTML = '';
            userSelect.innerHTML = '<option value="">Select User</option>';
            
            // Add users to table
            users.forEach(user => {
                const row = document.createElement('tr');
                
                // Calculate next check time (simplified)
                const nextCheck = '10 min';
                
                row.innerHTML = `
                    <td>
                        <span class="user-status ${user.active ? 'active' : 'inactive'}"></span>
                        ${user.whatsappNumber}
                    </td>
                    <td>${user.location.city}, ${user.location.country}</td>
                    <td>${user.rainThresholdPct}%</td>
                    <td>${user.lastAlertSentAt ? this.formatTimeAgo(new Date(user.lastAlertSentAt)) : 'Never'}</td>
                    <td>${nextCheck}</td>
                    <td class="${user.active ? 'text-green' : 'text-red'}">
                        ${user.active ? 'ACTIVE' : 'INACTIVE'}
                    </td>
                `;
                
                tableBody.appendChild(row);
                
                // Add to user select for forecast
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = `${user.location.city} (${user.whatsappNumber})`;
                userSelect.appendChild(option);
            });
            
            // Update user count in stats
            document.getElementById('stat-users').querySelector('.stat-value').textContent = users.length;
            
        } catch (error) {
            console.error('Error loading subscriptions:', error);
            document.getElementById('subscriptions-body').innerHTML = `
                <tr>
                    <td colspan="6" class="text-red">Failed to load subscriptions</td>
                </tr>
            `;
        } finally {
            spinner.style.display = 'none';
        }
    }
    
    async loadAlertLog() {
        const spinner = document.getElementById('logs-spinner');
        spinner.style.display = 'inline-block';
        
        try {
            const response = await fetch('/api/logs?limit=20');
            const logs = await response.json();
            
            const logContainer = document.getElementById('alert-log');
            logContainer.innerHTML = '';
            
            if (logs.length === 0) {
                logContainer.innerHTML = '<div class="alert-entry">No alerts sent yet</div>';
                return;
            }
            
            logs.forEach(log => {
                const entry = document.createElement('div');
                entry.className = `alert-entry ${log.type.toLowerCase().replace('_', '-')}`;
                
                const typeEmoji = {
                    'EARLY_WARNING': '🌧️',
                    'FINAL_ALERT': '⛈️',
                    'ALL_CLEAR': '🌈'
                }[log.type] || '📝';
                
                entry.innerHTML = `
                    <div class="alert-time">
                        ${this.formatDateTime(new Date(log.sentAt))}
                    </div>
                    <div class="alert-message">
                        ${typeEmoji} <strong>${log.type.replace('_', ' ')}</strong> - 
                        User ${log.userId.substring(0, 8)} - 
                        ${log.rainProbability}% rain probability
                    </div>
                `;
                
                logContainer.appendChild(entry);
            });
            
            // Update alerts count in stats
            const todayAlerts = logs.filter(log => {
                const logDate = new Date(log.sentAt);
                const today = new Date();
                return logDate.toDateString() === today.toDateString();
            }).length;
            
            document.getElementById('stat-alerts').querySelector('.stat-value').textContent = todayAlerts;
            
        } catch (error) {
            console.error('Error loading alert log:', error);
            document.getElementById('alert-log').innerHTML = 
                '<div class="alert-entry text-red">Failed to load alert log</div>';
        } finally {
            spinner.style.display = 'none';
        }
    }
    
    async loadProviderHealth() {
        const spinner = document.getElementById('providers-spinner');
        spinner.style.display = 'inline-block';
        
        try {
            const response = await fetch('/api/providers/health');
            const providers = await response.json();
            
            const providerGrid = document.getElementById('provider-grid');
            providerGrid.innerHTML = '';
            
            providers.forEach(provider => {
                const tile = document.createElement('div');
                tile.className = `provider-tile ${provider.healthy ? 'healthy' : 'unhealthy'}`;
                
                tile.innerHTML = `
                    <div class="provider-name">${provider.name.toUpperCase()}</div>
                    <div class="provider-status ${provider.healthy ? 'healthy' : 'unhealthy'}">
                        ${provider.healthy ? '✓ ONLINE' : '✗ OFFLINE'}
                    </div>
                    <div class="provider-weight">Weight: ${provider.weight}</div>
                `;
                
                providerGrid.appendChild(tile);
            });
            
        } catch (error) {
            console.error('Error loading provider health:', error);
            document.getElementById('provider-grid').innerHTML = 
                '<div class="provider-tile unhealthy">Failed to load provider health</div>';
        } finally {
            spinner.style.display = 'none';
        }
    }
    
    async loadUserForecast() {
        const userId = document.getElementById('user-select').value;
        if (!userId) return;
        
        try {
            const response = await fetch(`/api/forecast/${userId}`);
            const data = await response.json();
            
            if (!data.forecast || !data.forecast.hourly) {
                throw new Error('No forecast data');
            }
            
            this.renderForecastChart(data.forecast.hourly);
            
        } catch (error) {
            console.error('Error loading user forecast:', error);
            this.showError('Failed to load forecast data');
        }
    }
    
    renderForecastChart(hourlyData) {
        const ctx = document.getElementById('forecast-chart').getContext('2d');
        
        // Destroy existing chart
        if (this.chart) {
            this.chart.destroy();
        }
        
        // Prepare data
        const labels = hourlyData.slice(0, 24).map((h, i) => `${i}h`);
        const rainProbabilities = hourlyData.slice(0, 24).map(h => h.rainProbabilityPct);
        const temperatures = hourlyData.slice(0, 24).map(h => h.temperatureCelsius);
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Rain Probability %',
                        data: rainProbabilities,
                        borderColor: '#00f3ff',
                        backgroundColor: 'rgba(0, 243, 255, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Temperature °C',
                        data: temperatures,
                        borderColor: '#ffb347',
                        backgroundColor: 'rgba(255, 179, 71, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(42, 47, 62, 0.5)'
                        },
                        ticks: {
                            color: '#a0a0c0'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        grid: {
                            color: 'rgba(42, 47, 62, 0.5)'
                        },
                        ticks: {
                            color: '#a0a0c0'
                        },
                        title: {
                            display: true,
                            text: 'Rain Probability %',
                            color: '#a0a0c0'
                        },
                        min: 0,
                        max: 100
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false
                        },
                        ticks: {
                            color: '#a0a0c0'
                        },
                        title: {
                            display: true,
                            text: 'Temperature °C',
                            color: '#a0a0c0'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#e0e0ff'
                        }
                    }
                }
            }
        });
    }
    
    initRainCanvas() {
        const canvas = document.getElementById('rain-canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        // Rain particles
        const particles = [];
        const particleCount = 100;
        
        // Create particles
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                length: Math.random() * 20 + 10,
                speed: Math.random() * 2 + 1,
                opacity: Math.random() * 0.3 + 0.1
            });
        }
        
        // Animation loop
        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            particles.forEach(p => {
                // Move particle down
                p.y += p.speed;
                
                // Reset if off screen
                if (p.y > canvas.height) {
                    p.y = -p.length;
                    p.x = Math.random() * canvas.width;
                }
                
                // Draw rain drop
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x, p.y + p.length);
                ctx.strokeStyle = `rgba(0, 243, 255, ${p.opacity})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            });
            
            requestAnimationFrame(animate);
        }
        
        // Start animation
        animate();
        
        // Resize handler
        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        });
    }
    
    startAutoRefresh() {
        // Refresh data every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.loadSystemStats();
            this.loadAlertLog();
            this.loadProviderHealth();
        }, 30000);
    }
    
    updateUptime() {
        const elapsed = Date.now() - this.startTime;
        const hours = Math.floor(elapsed / 3600000);
        const minutes = Math.floor((elapsed % 3600000) / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        
        document.getElementById('uptime').textContent = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    pulseCard(cardId) {
        const card = document.getElementById(cardId);
        card.classList.add('pulse');
        
        setTimeout(() => {
            card.classList.remove('pulse');
        }, 1000);
    }
    
    formatDateTime(date) {
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    formatTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffDays > 0) return `${diffDays}d ago`;
        if (diffHours > 0) return `${diffHours}h ago`;
        if (diffMins > 0) return `${diffMins}m ago`;
        return 'Just now';
    }
    
    showError(message) {
        // Simple error notification
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff4757;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 10000;
            box-shadow: 0 0 20px rgba(255, 71, 87, 0.5);
        `;
        errorDiv.textContent = message;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
    
    // Global functions for button clicks
    window.loadSubscriptions = () => dashboard.loadSubscriptions();
    window.loadAlertLog = () => dashboard.loadAlertLog();
    window.loadProviderHealth = () => dashboard.loadProviderHealth();
    window.loadUserForecast = () => dashboard.loadUserForecast();
});