# 🌧️ Weather Alert Bot

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Render](https://img.shields.io/badge/Deploy%20on-Render-46B3E6)](https://render.com)

A production-ready, intelligent weather monitoring system that aggregates real-time forecasts from multiple APIs, detects rain probability thresholds, and delivers WhatsApp alerts with cooldown logic. Features a stunning sci-fi terminal dashboard for real-time monitoring.

## 🚀 Features

### 🌤️ Multi-Source Weather Intelligence
- **3 Free-Tier Weather APIs**: Open-Meteo, OpenWeatherMap, WeatherAPI.com
- **Weighted Consensus Algorithm**: Combines forecasts with confidence scoring
- **Automatic Fallback**: Graceful degradation when APIs fail
- **Exponential Backoff**: Smart retry logic for API failures

### 📱 Intelligent Alert System
- **WhatsApp Integration**: Real-time alerts via Baileys WebSocket
- **Cooldown Logic**: Prevents alert spam with configurable windows
- **Threshold Detection**: Customizable rain probability triggers
- **Multi-User Support**: Personalized alerts for different locations

### 📊 Stunning Dashboard
- **Sci-Fi Terminal UI**: Dark theme with glowing neon elements
- **Real-Time Charts**: Interactive precipitation forecasts with Chart.js
- **Rain Particle Animation**: Visual precipitation simulation
- **Provider Health Monitoring**: Live status of all weather APIs
- **Alert History**: Timeline of sent notifications

### 🏗️ Production Architecture
- **Modular Design**: Independently testable layers
- **In-Memory Caching**: Reduces API calls with TTL-based cache
- **Structured Logging**: JSON logs with Pino for observability
- **Graceful Shutdown**: Proper signal handling for zero-downtime updates
- **Environment-Based Config**: 12-factor app compliance

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Weather Alert Bot                        │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │  Open-   │  │  Open-   │  │ Weather- │  → Weather       │
│  │  Meteo   │  │ Weather  │  │  API.com │    Aggregator    │
│  └──────────┘  └──────────┘  └──────────┘                  │
│         │            │             │                        │
├─────────┼────────────┼─────────────┼────────────────────────┤
│         ▼            ▼             ▼                        │
│  ┌────────────────────────────────────┐  ┌──────────────┐  │
│  │      Weighted Consensus Engine     │  │   Forecast   │  │
│  │  • Confidence scoring              │  │     Cache    │  │
│  │  • Error handling                  │  │  • TTL-based │  │
│  │  • Fallback logic                  │  │  • Statistics│  │
│  └────────────────────────────────────┘  └──────────────┘  │
│                    │                             │          │
├────────────────────┼─────────────────────────────┼──────────┤
│                    ▼                             ▼          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Alert Detection Engine                  │  │
│  │  • Threshold monitoring                              │  │
│  │  • Cooldown management                               │  │
│  │  • Cron-based scheduling                             │  │
│  └──────────────────────────────────────────────────────┘  │
│                    │                                        │
├────────────────────┼────────────────────────────────────────┤
│                    ▼                                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              WhatsApp Notification Layer             │  │
│  │  • Baileys WebSocket client                          │  │
│  │  • Rate limiting                                     │  │
│  │  • Session persistence                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                    │                                        │
├────────────────────┼────────────────────────────────────────┤
│                    ▼                                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                Dashboard & API Layer                 │  │
│  │  • Express.js server                                 │  │
│  │  • Real-time WebSocket updates                       │  │
│  │  • Sci-fi terminal UI                                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Quick Start

### Prerequisites
- Node.js 20 or higher
- npm 10 or higher
- WhatsApp account (for alerts)
- API keys for weather providers (free tier available)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/weather-alert-bot.git
   cd weather-alert-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure the application**
   ```bash
   cp config.example.json config.json
   cp .env.example .env
   ```
   
   Edit `config.json` with your API keys and user settings.

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Start the bot**
   ```bash
   npm start
   ```

   For development with hot reload:
   ```bash
   npm run dev
   ```

6. **Access the dashboard**
   Open your browser to `http://localhost:3000` to see the sci-fi terminal dashboard.

## ⚙️ Configuration

### Configuration File (`config.json`)

```json
{
  "app": {
    "port": 3000,
    "logLevel": "info",
    "schedulerIntervalMinutes": 15
  },
  "apis": {
    "openMeteo": {
      "enabled": true,
      "baseUrl": "https://api.open-meteo.com/v1"
    },
    "openWeather": {
      "enabled": true,
      "apiKey": "your_openweather_api_key",
      "baseUrl": "https://api.openweathermap.org/data/2.5"
    },
    "weatherApi": {
      "enabled": true,
      "apiKey": "your_weatherapi_key",
      "baseUrl": "http://api.weatherapi.com/v1"
    }
  },
  "cache": {
    "forecastTtlMinutes": 30,
    "maxEntries": 100
  },
  "alerts": {
    "defaultRainThresholdPct": 70,
    "defaultEarlyCooldownMinutes": 60,
    "defaultFinalCooldownMinutes": 180
  },
  "whatsapp": {
    "sessionPath": "./whatsapp-session",
    "messageRateLimitMs": 1000
  },
  "users": [
    {
      "id": "user1",
      "name": "John Doe",
      "phoneNumber": "+1234567890",
      "location": {
        "latitude": 40.7128,
        "longitude": -74.0060,
        "city": "New York"
      },
      "rainThresholdPct": 70,
      "earlyCooldownMinutes": 60,
      "finalCooldownMinutes": 180
    }
  ]
}
```

### Environment Variables (`.env`)

```env
OPENWEATHER_API_KEY=your_openweather_api_key
WEATHERAPI_API_KEY=your_weatherapi_key
PORT=3000
NODE_ENV=production
```

## 🚀 Deployment

### Render.com (Free Tier)

1. **Create a new Web Service** on Render
2. **Connect your GitHub repository**
3. **Configure build settings:**
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
4. **Add environment variables:**
   - `OPENWEATHER_API_KEY`
   - `WEATHERAPI_API_KEY`
   - `PORT` (set to 10000 for Render)
5. **Deploy!**

The bot will run continuously on Render's free tier (750 hours/month).

### Railway.app

1. **Create a new project** on Railway
2. **Deploy from GitHub**
3. **Add environment variables** as above
4. **The bot will auto-deploy on push**

### Docker Deployment

```bash
# Build the image
docker build -t weather-alert-bot .

# Run the container
docker run -p 3000:3000 \
  -e OPENWEATHER_API_KEY=your_key \
  -e WEATHERAPI_API_KEY=your_key \
  weather-alert-bot
```

## 📱 WhatsApp Setup

1. **First-time setup:**
   - Start the bot: `npm start`
   - Check the logs for QR code
   - Scan QR code with WhatsApp mobile app
   - Session will be saved for future runs

2. **Session persistence:**
   - Session data is stored in `./whatsapp-session/`
   - Backup this directory to avoid re-authentication
   - Delete to force new login

3. **Rate limiting:**
   - Default: 1 message per second
   - Adjust via `messageRateLimitMs` in config

## 🎨 Dashboard Features

### Real-Time Monitoring
- **Weather Provider Status**: Live health indicators
- **Cache Statistics**: Hit/miss rates and memory usage
- **Alert History**: Timeline of sent notifications
- **User Management**: Add/remove users via UI

### Interactive Charts
- **Precipitation Forecast**: 24-hour rain probability
- **Temperature Trends**: Hourly temperature changes
- **Wind Speed**: Gust and direction visualization
- **Provider Comparison**: Side-by-side API accuracy

### Sci-Fi Terminal UI
- **Glowing Neon Elements**: Cyan and magenta accents
- **Rain Particle Animation**: Visual precipitation simulation
- **Terminal-Style Logs**: Real-time system events
- **Responsive Design**: Works on mobile and desktop

## 🔧 API Reference

### REST Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | System health status |
| `/api/forecast/:lat/:lon` | GET | Get forecast for location |
| `/api/providers` | GET | Weather provider health |
| `/api/alerts` | GET | Alert history |
| `/api/users` | GET | List users |
| `/api/users` | POST | Add new user |
| `/api/cache/stats` | GET | Cache statistics |
| `/api/whatsapp/status` | GET | WhatsApp connection status |

### WebSocket Events

Connect to `ws://localhost:3000/ws` for real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Update:', data.type, data.payload);
};
```

**Event Types:**
- `forecast_update`: New forecast data
- `alert_triggered`: Alert sent to user
- `provider_status`: Provider health change
- `cache_update`: Cache statistics update

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- src/services/weatherAggregator.test.ts
```

### Test Structure
- **Unit Tests**: Individual component testing
- **Integration Tests**: Component interaction testing
- **E2E Tests**: Full system flow testing
- **Mock APIs**: Simulated weather API responses

## 📊 Performance & Scaling

### Free-Tier Optimization
- **API Rate Limits**: Respects free-tier constraints
- **Caching Strategy**: Reduces API calls by 80%
- **Memory Management**: Automatic cache pruning
- **Connection Pooling**: Reusable HTTP connections

### Monitoring
- **Structured Logging**: JSON format for log aggregation
- **Metrics Endpoint**: `/api/metrics` for Prometheus
- **Health Checks**: Readiness and liveness probes
- **Error Tracking**: Centralized error reporting

## 🔒 Security

- **Input Validation**: All user inputs sanitized
- **Rate Limiting**: Prevents API abuse
- **Environment Secrets**: No hardcoded credentials
- **Session Encryption**: WhatsApp session data encrypted
- **CORS Configuration**: Restricted to dashboard domain
- **Helmet.js**: Security headers middleware

## 🛠️ Development

### Project Structure

```
weather-alert-bot/
├── src/
│   ├── types/           # TypeScript interfaces
│   ├── providers/       # Weather API implementations
│   ├── services/        # Business logic (aggregator)
│   ├── cache/          # Caching layer
│   ├── scheduler/      # Alert scheduling
│   ├── whatsapp/       # WhatsApp integration
│   ├── dashboard/      # Express server & UI
│   └── utils/          # Shared utilities
├── dist/               # Compiled JavaScript
├── config.json         # Application configuration
└── package.json        # Dependencies & scripts
```

### Common Tasks

```bash
# Development with hot reload
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Format code
npm run format

# Generate TypeScript declarations
npm run build:types
```

### Adding a New Weather Provider

1. Create a new class in `src/providers/` extending `BaseWeatherProvider`
2. Implement the `fetchHourlyForecast` method
3. Add provider configuration to `config.json`
4. Register provider in `WeatherAggregator`

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript strict mode
- Write tests for new features
- Update documentation
- Use conventional commits

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Open-Meteo**: Free weather API without key required
- **OpenWeatherMap**: Comprehensive weather data
- **WeatherAPI.com**: Reliable forecast provider
- **Baileys**: WhatsApp Web implementation
- **Chart.js**: Beautiful data visualization
- **Render.com**: Free hosting platform

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/weather-alert-bot/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/weather-alert-bot/discussions)
- **Email**: support@example.com

---

<div align="center">
  <p>Built with ❤️ by <a href="https://github.com/yourusername">Rahman Leon</a></p>
  <p>If you find this project useful, please give it a ⭐ on GitHub!</p>
</div>