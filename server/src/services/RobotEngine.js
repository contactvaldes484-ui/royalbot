const RobotSession = require('../models/RobotSession');
const BinanceAccount = require('../models/BinanceAccount');
const BybitAccount = require('../models/BybitAccount');
const BinanceTrade = require('../models/BinanceTrade');
const RobotLog = require('../models/RobotLog');
const BinanceService = require('./BinanceService');
const BybitService = require('./BybitService');
const execService = require('./TradeExecutionService');
const marketStream = require('./MarketStreamService');
const cryptoCatalog = require('./CryptoRobotCatalogService');
const { strategies } = require('./strategyEngine');
const { MIN_DEPOSIT_USDT } = require('../config/binanceRobots');

// Catalogue robot → marché/symbols Binance/timeframe/intervalle poll
// NB: Binance n'a ni Forex ni XAUUSD → remappé sur paires crypto USDT.
const ROBOT_CONFIG = {
  free_trend:        { tf: '5m',  poll: 20000, symbols: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'] },
  starter_smc:       { tf: '15m', poll: 15000, symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'] },
  starter_scalper:   { tf: '5m',  poll: 12000, symbols: ['BTCUSDT', 'ETHUSDT'] },
  starter_swing:     { tf: '1h',  poll: 30000, symbols: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'] },
  pro_institutional: { tf: '15m', poll: 10000, symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'] },
  pro_scalper:       { tf: '5m',  poll: 8000,  symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'] },
  vip_quantum:       { tf: '5m',  poll: 8000,  symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'] },
  vip_smc:           { tf: '15m', poll: 8000,  symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'AVAXUSDT'] },
  vip_scalper:       { tf: '1m',  poll: 5000,  symbols: ['BTCUSDT', 'ETHUSDT'] },
  vip_hedge:         { tf: '15m', poll: 10000, symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'] },
  vip_precision_smc: { tf: '15m', poll: 7000,  symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'] },
  inst_correlation:  { tf: '15m', poll: 6000,  symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT'] },
  inst_arbitrage:    { tf: '5m',  poll: 5000,  symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'] },
  inst_quant:        { tf: '15m', poll: 6000,  symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'] },
  inst_flow:         { tf: '15m', poll: 5000,  symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'AVAXUSDT'] },
};

class RobotEngine {
  constructor() {
    this.active = new Map(); // sessionId -> { handle, accountId }
  }

  async resumeAll() {
    const sessions = await RobotSession.find({ status: 'active' });
    for (const s of sessions) await this._spawn(s).catch(e => console.error('RobotEngine resume:', e.message));
    if (sessions.length) console.log(`🤖 RobotEngine: ${sessions.length} session(s) reprises`);
    return sessions.length;
  }

  async startSession(userId, accountId, robotKey, market, overrides = {}) {
    const exchange = overrides.exchange === 'bybit' ? 'bybit' : 'binance';
    let acc, equity;

    if (exchange === 'bybit') {
      acc = await BybitAccount.findOne({ _id: accountId, user: userId });
      if (!acc) throw new Error('Compte Bybit introuvable');
      if (acc.status !== 'active') throw new Error('Compte Bybit non actif (test de connexion requis)');
      equity = market === 'futures' ? acc.futuresUSDT : acc.spotUSDT;
    } else {
      acc = await BinanceAccount.findOne({ _id: accountId, user: userId });
      if (!acc) throw new Error('Compte Binance introuvable');
      if (acc.status !== 'active') throw new Error('Compte Binance non actif (test de connexion requis)');
      equity = market === 'futures' ? acc.futuresUSDT : acc.spotUSDT;
    }

    const cfg = cryptoCatalog.getConfig(robotKey) || ROBOT_CONFIG[robotKey];
    if (!cfg) throw new Error('Robot inconnu');

    // Dépôt minimum : les robots tradent dès 10 USDT.
    if (!(equity >= MIN_DEPOSIT_USDT)) {
      throw new Error(`Solde ${market} insuffisant : ${Number(equity || 0).toFixed(2)} USDT. Minimum requis : ${MIN_DEPOSIT_USDT} USDT.`);
    }

    // Normalisation du mode de taille de lot choisi par l'utilisateur
    const sizingMode = ['risk', 'fixed', 'multiplier'].includes(overrides.sizingMode) ? overrides.sizingMode : 'risk';

    const sessionData = {
      user: userId,
      exchange,
      binanceAccount: exchange === 'binance' ? accountId : undefined,
      bybitAccount: exchange === 'bybit' ? accountId : undefined,
      robotKey,
      market,
      settings: {
        symbols: overrides.symbols || cfg.symbols,
        leverage: overrides.leverage || (market === 'futures' ? 5 : 1),
        maxOpenTrades: overrides.maxOpenTrades || 2,
        timeframe: cfg.tf,
        sizingMode,
        fixedNotionalUsd: sizingMode === 'fixed' ? Math.max(0, Number(overrides.fixedNotionalUsd) || 0) : 0,
        lotMultiplier: sizingMode === 'multiplier' ? Math.max(0.1, Number(overrides.lotMultiplier) || 1) : 1,
      },
      risk: { ...(overrides.risk || {}) },
      stats: { startEquity: equity, peakEquity: equity, lastResetDay: new Date().toISOString().slice(0, 10) },
      status: 'active',
    };

    const session = await RobotSession.create(sessionData);

    await this._spawn(session);
    if (global.broadcastToUser) global.broadcastToUser(userId.toString(), { type: 'robot_started', sessionId: session._id, robotKey, market, exchange });
    return session;
  }

  async _spawn(session) {
    const cfg = cryptoCatalog.getConfig(session.robotKey) || ROBOT_CONFIG[session.robotKey];
    if (!cfg) return;
    for (const sym of session.settings.symbols) {
      marketStream.subscribe(session.market, sym, cfg.tf, session.user.toString());
    }
    const handle = setInterval(() => this._tick(session._id.toString()), cfg.poll || 10000);
    this.active.set(session._id.toString(), { handle, accountId: (session.binanceAccount || session.bybitAccount || '').toString() });
  }

  async _tick(sessionId) {
    try {
      const session = await RobotSession.findById(sessionId);
      if (!session || session.status !== 'active') return this._clear(sessionId);

      const today = new Date().toISOString().slice(0, 10);
      if (session.stats.lastResetDay !== today) {
        session.stats.dailyPnl = 0; session.stats.lastResetDay = today; await session.save();
      }

      const cfg = cryptoCatalog.getConfig(session.robotKey) || ROBOT_CONFIG[session.robotKey];
      const stratFn = cryptoCatalog.getStrategyFn(session.robotKey) || strategies[session.robotKey];
      if (!stratFn) return;

      let bx, equity;

      if (session.exchange === 'bybit') {
        const acc = await BybitAccount.findById(session.bybitAccount).select('+apiKeyEnc +apiSecretEnc');
        if (!acc) return this._clear(sessionId);
        const { apiKey, apiSecret } = acc.getKeys();
        bx = new BybitService({ apiKey, apiSecret, isTestnet: acc.isTestnet });
        try {
          const test = await bx.testConnection();
          equity = session.market === 'futures' ? (test.futuresUSDT || session.stats.startEquity) : (test.spotUSDT || session.stats.startEquity);
        } catch (_) { equity = session.stats.startEquity || 0; }
      } else {
        const acc = await BinanceAccount.findById(session.binanceAccount).select('+apiKeyEnc +apiSecretEnc');
        if (!acc) return this._clear(sessionId);
        const { apiKey, apiSecret } = acc.getKeys();
        bx = new BinanceService({ apiKey, apiSecret, isTestnet: acc.isTestnet });
        try {
          equity = session.market === 'futures'
            ? Number((await bx.getFuturesAccount()).availableBalance || session.stats.startEquity)
            : Number((await bx.getSpotAccount()).balances?.find(b => b.asset === 'USDT')?.free || session.stats.startEquity);
        } catch (_) { equity = session.stats.startEquity || 0; }
      }

      const openTrades = await BinanceTrade.find({ session: session._id, status: 'open' });
      if (openTrades.length >= session.settings.maxOpenTrades) return;

      for (const symbol of session.settings.symbols) {
        if (openTrades.find(t => t.symbol === symbol)) continue;

        let klines;
        if (session.exchange === 'bybit') {
          klines = await bx.getKlines(session.market === 'futures' ? 'linear' : 'spot', symbol, cfg.tf, 200);
        } else {
          klines = await bx.getKlines(session.market, symbol, cfg.tf, 200);
        }
        const tick = this._klinesToTick(klines);
        const signal = stratFn(tick);
        if (!signal) continue;

        signal.entryPrice = tick.closes[tick.closes.length - 1];
        if (session.market === 'spot' && signal.type === 'sell') continue; // pas de short en spot

        await execService.openFromSignal({ session, symbol, signal, equity });
        break; // un nouveau trade par tick
      }
    } catch (err) {
      await RobotLog.create({ session: sessionId, level: 'error', event: 'tick_error', message: err.message }).catch(() => {});
    }
  }

  _klinesToTick(klines) {
    const closes = [], highs = [], lows = [], volumes = [];
    for (const k of klines) {
      highs.push(+k[2]); lows.push(+k[3]); closes.push(+k[4]); volumes.push(+k[5]);
    }
    return { closes, highs, lows, volumes, bid: closes[closes.length - 1], ask: closes[closes.length - 1] };
  }

  async stopSession(sessionId, userId) {
    this._clear(sessionId);
    const s = await RobotSession.findOneAndUpdate({ _id: sessionId, user: userId }, { status: 'stopped', stoppedAt: new Date() }, { new: true });
    if (s && global.broadcastToUser) global.broadcastToUser(userId.toString(), { type: 'robot_stopped', sessionId });
    return s;
  }

  async pauseSession(sessionId, userId) {
    this._clear(sessionId);
    return RobotSession.findOneAndUpdate({ _id: sessionId, user: userId }, { status: 'paused' }, { new: true });
  }

  async resumeSession(sessionId, userId) {
    const s = await RobotSession.findOneAndUpdate({ _id: sessionId, user: userId }, { status: 'active' }, { new: true });
    if (s) await this._spawn(s);
    return s;
  }

  _clear(sessionId) {
    const e = this.active.get(sessionId);
    if (e) { clearInterval(e.handle); this.active.delete(sessionId); }
  }

  getActiveCount() { return this.active.size; }
}

module.exports = new RobotEngine();
