require('dotenv').config();
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = '1b38d6a0db1247e468332213f2bb0e74f0e55bc2e676701cecbf15543fc45ba8';
}
if (!process.env.ENCRYPTION_KEY) {
  process.env.ENCRYPTION_KEY = '5c5b110611b60ed22cb031fe506f95243397bdfb644d25bc2e391904f026a47d';
}
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
mongoose.set('bufferTimeoutMS', 2500);
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
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
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
app.get('/health', (req, res) => res.json({ status: 'ok', dbConnected: mongoose.connection.readyState === 1, uptime: process.uptime(), time: new Date() }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', dbConnected: mongoose.connection.readyState === 1, uptime: process.uptime(), time: new Date() }));

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
const fallbackStore = require('./services/RuntimeFallbackStore');
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await fallbackStore.getSettings();
    res.json({ settings });
  } catch (err) {
    res.json({ settings: fallbackStore.settings });
  }
});

// Public: profit screenshots for landing page (no auth)
const ProfitScreenshot = require('./models/ProfitScreenshot');
app.get('/api/screenshots', async (req, res) => {
  try {
    if (!fallbackStore.isDbConnected()) {
      return res.json({ screenshots: [] });
    }
    const screenshots = await ProfitScreenshot.find({ isActive: true })
      .select('title description imageData profit trader platform order')
      .sort({ order: 1, createdAt: -1 })
      .limit(20);
    res.json({ screenshots });
  } catch (err) {
    res.json({ screenshots: [] });
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
    if ((client.userRole === 'admin' || client.userRole === 'super_admin') && client.readyState === 1) {
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
const DEFAULT_ATLAS_URI = 'mongodb+srv://valdeslando15_db_user:MTT3SBR7R6QmWQCY@cluster0.1hr6fwe.mongodb.net/RoyalBot?retryWrites=true&w=majority&appName=Cluster0';
const MONGO_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  process.env.MONGO_URL ||
  process.env.DATABASE_URL ||
  DEFAULT_ATLAS_URI;

mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 6000 })
  .then(async () => {
    mongoose.set('bufferCommands', true);
    console.log('✅ MongoDB connected');

    // Auto-seed Super Admin account & Deriv App ID so admin can always log in on production
    try {
      const User = require('./models/User');
      const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@royalbot.pro').toLowerCase().trim();
      const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'RoyalBot@2026';

      let adminUser = await User.findOne({ email: adminEmail });
      if (!adminUser) {
        adminUser = await User.create({
          firstName: 'Super',
          lastName: 'Admin',
          email: adminEmail,
          password: adminPassword,
          role: 'super_admin',
          isVerified: true,
          isActive: true,
          referralCode: 'ADMINRB26',
          subscription: {
            plan: 'institutional',
            billingCycle: 'lifetime',
            startDate: new Date(),
            isActive: true,
          },
        });
        console.log(`✅ Super Admin initialisé : ${adminEmail}`);
      } else if (adminUser.role !== 'super_admin') {
        adminUser.role = 'super_admin';
        adminUser.isActive = true;
        adminUser.isVerified = true;
        await adminUser.save();
      }

      // Seed & Update Owner Account: valdeslando15@gmail.com with unconditional lifetime access
      const ownerEmail = 'valdeslando15@gmail.com';
      let ownerUser = await User.findOne({ email: ownerEmail });
      if (!ownerUser) {
        ownerUser = await User.create({
          firstName: 'Valdes',
          lastName: 'Dev',
          email: ownerEmail,
          password: process.env.OWNER_PASSWORD || 'RoyalBot@2026',
          role: 'super_admin',
          isVerified: true,
          isActive: true,
          referralCode: 'VALDES26',
          subscription: {
            plan: 'institutional',
            billingCycle: 'lifetime',
            startDate: new Date('2020-01-01'),
            endDate: new Date('2099-12-31'),
            isActive: true,
          },
        });
        console.log(`✅ Propriétaire initialisé avec accès à vie inconditionnel : ${ownerEmail}`);
      } else {
        ownerUser.role = 'super_admin';
        ownerUser.isActive = true;
        ownerUser.isVerified = true;
        if (!ownerUser.subscription) ownerUser.subscription = {};
        ownerUser.subscription.plan = 'institutional';
        ownerUser.subscription.billingCycle = 'lifetime';
        ownerUser.subscription.isActive = true;
        ownerUser.subscription.endDate = new Date('2099-12-31');
        await ownerUser.save();
        console.log(`✅ Propriétaire synchronisé avec accès super_admin à vie : ${ownerEmail}`);
      }

      // Ensure PlatformSettings has the configured Deriv App ID (34HkkJSIK047dAEWEgXML)
      let settings = await PlatformSettings.findOne({ key: 'main' });
      if (!settings) {
        settings = await PlatformSettings.create({
          key: 'main',
          derivAppId: process.env.DERIV_APP_ID || '34HkkJSIK047dAEWEgXML',
          derivWsUrl: process.env.DERIV_WS_URL || 'wss://ws.derivws.com/websockets/v3',
        });
      } else if (!settings.derivAppId || settings.derivAppId === '1089') {
        settings.derivAppId = process.env.DERIV_APP_ID || '34HkkJSIK047dAEWEgXML';
        await settings.save();
        console.log(`✅ Deriv App ID configuré : ${settings.derivAppId}`);
      }
    } catch (e) {
      console.warn('⚠️  Admin/Settings auto-seed notice:', e.message);
    }

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
            description: 'Sniper algorithmique 1-tick basé sur l\'épuisement statistique des petits chiffres (rebond Mean Reversion) et le momentum haussier.',
            defaultSettings: { initialStake: 1, maxStake: 30, stopLoss: 20, takeProfit: 50, duration: 1, durationUnit: 't', barrier: '2', martingaleEnabled: false, martingaleMultiplier: 1, maxMartingaleSteps: 2 },
            winRate: '78-84%',
            badge: 'Sniper 1-Tick Rentable',
            order: 1,
          },
          {
            name: 'Digit Differ Hunter',
            slug: 'digit-differ-hunter',
            tier: 'all',
            contractType: 'DIGITDIFF',
            symbols: ['R_100', 'R_50', '1HZ100V'],
            strategyType: 'digit_analyzer',
            description: 'Analyse statistique des 30 derniers ticks pour déterminer le chiffre froid le moins représenté et parier sur sa différence.',
            defaultSettings: { initialStake: 2, maxStake: 50, stopLoss: 30, takeProfit: 60, duration: 1, durationUnit: 't', barrier: '5', martingaleMultiplier: 1.5, maxMartingaleSteps: 2 },
            winRate: '95-99%',
            badge: 'Ultra Haute Précision',
            order: 2,
          },
          {
            name: 'Even / Odd Quantum Flow',
            slug: 'even-odd-quantum-flow',
            tier: 'deriv-pro',
            contractType: 'DIGITEVEN',
            symbols: ['R_25', 'R_50', 'R_75'],
            strategyType: 'even_odd_pattern',
            description: 'Détection d\'anomalies et séries consécutives de parité pour sniper le rebond inverse en 1 tick.',
            defaultSettings: { initialStake: 1, maxStake: 40, stopLoss: 25, takeProfit: 50, duration: 1, durationUnit: 't', martingaleMultiplier: 2, maxMartingaleSteps: 3 },
            winRate: '72-76%',
            badge: 'Flux Quantique',
            order: 3,
          },
          {
            name: 'Volatility 75 Rise/Fall AI',
            slug: 'v75-rise-fall-ai',
            tier: 'all',
            contractType: 'CALL',
            symbols: ['R_75', 'R_100'],
            strategyType: 'trend_following',
            description: 'Suivi de tendance momentum par alignement EMA(5)/EMA(13) et confirmation RSI(7) sur 5 ticks.',
            defaultSettings: { initialStake: 1, maxStake: 35, stopLoss: 20, takeProfit: 45, duration: 5, durationUnit: 't', martingaleMultiplier: 2, maxMartingaleSteps: 3 },
            winRate: '72-78%',
            badge: 'Momentum IA',
            order: 4,
          },
          {
            name: 'Boom & Crash Spiker',
            slug: 'boom-crash-spiker',
            tier: 'deriv-pro',
            contractType: 'PUT',
            symbols: ['BOOM1000', 'CRASH1000'],
            strategyType: 'tick_volatility',
            description: 'Chasseur de pics de volatilité et rebonds post-spike sur Boom 1000 et Crash 1000.',
            defaultSettings: { initialStake: 2, maxStake: 50, stopLoss: 30, takeProfit: 70, duration: 5, durationUnit: 't', martingaleMultiplier: 2, maxMartingaleSteps: 3 },
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
    mongoose.set('bufferCommands', false);
    console.error('❌ MongoDB connection error:', err.message);
    console.warn('⚡ RuntimeFallbackStore in-memory mode activated (zero downtime for Auth & Deriv)');
  });

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = { app, server, wss };
