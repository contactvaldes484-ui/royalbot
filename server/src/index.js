require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const http = require('http');
const { WebSocketServer } = require('ws');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const compression = require('compression');
const { errorHandler, setupProcessErrorHandlers } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const botRoutes = require('./routes/bots');
const tradeRoutes = require('./routes/trades');
const subscriptionRoutes = require('./routes/subscriptions');
const adminRoutes = require('./routes/admin');
const adminPlansRoutes = require('./routes/adminPlans');
const withdrawalRoutes = require('./routes/withdrawals');
const leaderboardRoutes = require('./routes/leaderboard');
const blogRoutes = require('./routes/blog');
const contactRoutes = require('./routes/contact');
const pushRoutes = require('./routes/push');
const shopRoutes = require('./routes/shop');
const groupRoutes = require('./routes/groups');
const copyTradingRoutes = require('./routes/copyTrading');
const vendorRoutes = require('./routes/vendor');
const reviewsRoutes = require('./routes/reviews');
const copyTradingEngine = require('./services/copyTradingEngine');
const forexRoutes = require('./routes/forex');
const forexScanner = require('./services/forexScanner');
const binanceRoutes = require('./routes/binance');
const bybitRoutes = require('./routes/bybit');
const derivRoutes = require('./routes/deriv');
const adminDerivRoutes = require('./routes/adminDeriv');
const adminCryptoRobotsRoutes = require('./routes/adminCryptoRobots');
const cryptoCatalog = require('./services/CryptoRobotCatalogService');
const webhookRoutes = require('./routes/webhooks');
const robotEngine = require('./services/RobotEngine');
const derivEngine = require('./services/DerivRobotEngine');
const binanceUserStream = require('./services/BinanceUserDataStream');

const { authenticateWS } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);

// WebSocket server for real-time updates
const wss = new WebSocketServer({ server, path: '/ws' });

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many authentication attempts.' }
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
const rawOrigins = process.env.CORS_ORIGIN || process.env.CLIENT_URL || process.env.FRONTEND_URL || '*';
const allowedOrigins = rawOrigins.split(',').map(s => s.trim());
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));
app.use(compression());
app.use(morgan('dev'));

// Health check endpoints for Railway / cloud monitoring
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime(), time: new Date() }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime(), time: new Date() }));

// Webhooks paiement — montés AVANT le parser JSON (vérif HMAC sur le corps brut)
app.use('/api/webhooks', webhookRoutes);

app.use(express.json({ limit: '10mb' }));
app.use(mongoSanitize());
app.use(hpp());
app.use(limiter);

// Cache headers for static assets
app.use('/api', (req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('X-XSS-Protection', '1; mode=block');
  next();
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bots', botRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/admin', adminPlansRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/copy-trading', copyTradingRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/forex', forexRoutes);
app.use('/api/binance', binanceRoutes);
app.use('/api/bybit', bybitRoutes);
app.use('/api/deriv', derivRoutes);
app.use('/api/admin/deriv', adminDerivRoutes);
app.use('/api/admin/crypto-robots', adminCryptoRobotsRoutes);

// Public: platform settings (no auth — read only)
const PlatformSettings = require('./models/PlatformSettings');
app.get('/api/settings', async (req, res) => {
  try {
    let settings = await PlatformSettings.findOne({ key: 'main' });
    if (!settings) {
      settings = await PlatformSettings.create({ key: 'main' });
    }
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public: profit screenshots for landing page (no auth)
const ProfitScreenshot = require('./models/ProfitScreenshot');
app.get('/api/screenshots', async (req, res) => {
  try {
    const screenshots = await ProfitScreenshot.find({ isActive: true })
      .select('title description imageData profit trader platform order')
      .sort({ order: 1, createdAt: -1 })
      .limit(20);
    res.json({ screenshots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV || 'development' });
});

// 404 handler for unknown API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} introuvable.`, code: 'NOT_FOUND' });
});

// Global error handler (must be AFTER all routes)
app.use(errorHandler);
setupProcessErrorHandlers();

// WebSocket connections
wss.on('connection', async (ws, req) => {
  try {
    const user = await authenticateWS(req);
    if (!user) {
      ws.close(1008, 'Unauthorized');
      return;
    }
    ws.userId = user._id.toString();
    ws.userRole = user.role || 'user';
    ws.isAlive = true;

    ws.on('pong', () => { ws.isAlive = true; });
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        handleWSMessage(ws, msg, user);
      } catch (e) {
        ws.send(JSON.stringify({ error: 'Invalid message format' }));
      }
    });

    ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket connected' }));
  } catch (err) {
    ws.close(1008, 'Authentication failed');
  }
});

// Heartbeat
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => clearInterval(interval));

function handleWSMessage(ws, msg, user) {
  switch (msg.type) {
    case 'subscribe_trades':
      ws.subscribedToTrades = true;
      break;
    case 'subscribe_ticks':
      ws.subscribedToTicks = true;
      ws.symbol = msg.symbol;
      break;
    case 'subscribe_group':
      if (!ws.subscribedGroups) ws.subscribedGroups = [];
      if (msg.groupId && !ws.subscribedGroups.includes(msg.groupId)) {
        ws.subscribedGroups.push(msg.groupId);
      }
      break;
    case 'unsubscribe_group':
      if (ws.subscribedGroups) {
        ws.subscribedGroups = ws.subscribedGroups.filter(g => g !== msg.groupId);
      }
      break;
    default:
      ws.send(JSON.stringify({ error: 'Unknown message type' }));
  }
}

// Broadcast to specific user
function broadcastToUser(userId, data) {
  wss.clients.forEach((client) => {
    if (client.userId === userId && client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  });
}

// Broadcast to all admins
function broadcastToAdmins(data) {
  wss.clients.forEach((client) => {
    if (client.userRole === 'admin' && client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  });
}

// Make broadcast available globally
global.broadcastToUser = broadcastToUser;
global.broadcastToAdmins = broadcastToAdmins;
global.wss = wss;

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/RoyalBot')
  .then(async () => {
    console.log('✅ MongoDB connected');

    // Initialize subscription plans cache + cron
    try {
      const planCache = require('./services/planCache');
      const subService = require('./services/subscriptionService');
      await planCache.init();
      console.log(`✅ Plan cache loaded (${planCache.getAllPlans().length} plans)`);
      subService.startCron();
      console.log('✅ Subscription cron jobs started');
    } catch (e) {
      console.warn('⚠️  Plan cache init error:', e.message);
    }

    // ── Binance & Bybit: catalogue dynamique + reprise des sessions robots + user data streams ──
    try {
      await cryptoCatalog.init();
      await robotEngine.resumeAll();
      const BinanceAccount = require('./models/BinanceAccount');
      const liveAccs = await BinanceAccount.find({ status: 'active' });
      for (const a of liveAccs) {
        if (a.permissions?.spot) binanceUserStream.start(a._id, 'spot').catch(() => {});
        if (a.permissions?.futures) binanceUserStream.start(a._id, 'futures').catch(() => {});
      }
      if (liveAccs.length) console.log(`✅ Binance: ${liveAccs.length} compte(s) actifs, streams démarrés`);
    } catch (e) {
      console.warn('⚠️  Binance init error (non-critical):', e.message);
    }

    // ── Deriv: reprise des sessions robots + seed bots de base ──
    try {
      await derivEngine.resumeAll();
      const DerivBot = require('./models/DerivBot');
      const count = await DerivBot.countDocuments();
      if (count === 0) {
        await DerivBot.insertMany([
          {
            name: 'Digit Over 2 Sniper',
            slug: 'digit-over-2-sniper',
            tier: 'all',
            contractType: 'DIGITOVER',
            symbols: ['R_100', 'R_75', 'R_50', 'R_25', 'R_10'],
            strategyType: 'digit_analyzer',
            defaultSettings: { initialStake: 1, maxStake: 30, stopLoss: 20, takeProfit: 50, duration: 5, durationUnit: 't', barrier: '2', martingaleMultiplier: 2.2, maxMartingaleSteps: 4 },
            winRate: '74-78%',
            badge: 'Populaire Synthétique',
            order: 1,
          },
          {
            name: 'Digit Differ Hunter',
            slug: 'digit-differ-hunter',
            tier: 'all',
            contractType: 'DIGITDIFF',
            symbols: ['R_100', 'R_50', '1HZ100V'],
            strategyType: 'digit_analyzer',
            defaultSettings: { initialStake: 2, maxStake: 50, stopLoss: 30, takeProfit: 60, duration: 3, durationUnit: 't', barrier: '5', martingaleMultiplier: 3, maxMartingaleSteps: 3 },
            winRate: '82-86%',
            badge: 'Haut Taux de Réussite',
            order: 2,
          },
          {
            name: 'Even / Odd Quantum Flow',
            slug: 'even-odd-quantum-flow',
            tier: 'deriv-pro',
            contractType: 'DIGITEVEN',
            symbols: ['R_25', 'R_50', 'R_75'],
            strategyType: 'even_odd_pattern',
            defaultSettings: { initialStake: 1, maxStake: 40, stopLoss: 25, takeProfit: 50, duration: 5, durationUnit: 't', martingaleMultiplier: 2, maxMartingaleSteps: 4 },
            winRate: '68-72%',
            badge: 'Algorithme Dérivé',
            order: 3,
          },
          {
            name: 'Volatility 75 Rise/Fall AI',
            slug: 'v75-rise-fall-ai',
            tier: 'all',
            contractType: 'CALL',
            symbols: ['R_75', 'R_100'],
            strategyType: 'trend_following',
            defaultSettings: { initialStake: 1, maxStake: 35, stopLoss: 20, takeProfit: 45, duration: 5, durationUnit: 't', martingaleMultiplier: 2, maxMartingaleSteps: 4 },
            winRate: '70-74%',
            badge: 'Indice Synthétique',
            order: 4,
          },
          {
            name: 'Boom & Crash Spiker',
            slug: 'boom-crash-spiker',
            tier: 'deriv-pro',
            contractType: 'PUT',
            symbols: ['BOOM1000', 'CRASH1000'],
            strategyType: 'tick_volatility',
            defaultSettings: { initialStake: 2, maxStake: 50, stopLoss: 30, takeProfit: 70, duration: 15, durationUnit: 's', martingaleMultiplier: 2, maxMartingaleSteps: 3 },
            winRate: '75-80%',
            badge: 'Spike Hunter',
            order: 5,
          },
        ]);
        console.log('✅ Deriv: 5 robots de trading par défaut initialisés');
      }
    } catch (e) {
      console.warn('⚠️  Deriv init error (non-critical):', e.message);
    }

    copyTradingEngine.start();
    forexScanner.start().catch(err => console.error('Forex scanner start failed:', err.message));
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    console.warn('⚠️  Please check MONGODB_URI in your Railway environment variables');
  });

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = { app, server, wss };
