'use strict';
const WebSocket = require('ws');
const BinanceService = require('./BinanceService');
const BinanceAccount = require('../models/BinanceAccount');
const BinanceTrade = require('../models/BinanceTrade');
const Position = require('../models/Position');
const RobotSession = require('../models/RobotSession');
const notifier = require('./NotificationService');

const WS_BASE = {
  spot:    { live: 'wss://stream.binance.com:9443', test: 'wss://stream.testnet.binance.vision' },
  futures: { live: 'wss://fstream.binance.com',     test: 'wss://stream.binancefuture.com' },
};

class BinanceUserDataStream {
  constructor() { this.conns = new Map(); } // "accountId:market" -> { ws, listenKey, keepalive }

  async start(accountId, market) {
    const key = `${accountId}:${market}`;
    if (this.conns.has(key)) return;
    const acc = await BinanceAccount.findById(accountId).select('+apiKeyEnc +apiSecretEnc');
    if (!acc) return;
    const { apiKey, apiSecret } = acc.getKeys();
    const bx = new BinanceService({ apiKey, apiSecret, isTestnet: acc.isTestnet });

    const { listenKey } = await bx.createListenKey(market);
    const base = WS_BASE[market][acc.isTestnet ? 'test' : 'live'];
    const ws = new WebSocket(`${base}/ws/${listenKey}`);

    const keepalive = setInterval(() => bx.keepAliveListenKey(market, listenKey).catch(() => {}), 30 * 60 * 1000);
    this.conns.set(key, { ws, listenKey, keepalive });

    ws.on('message', (raw) => this._handle(acc, market, JSON.parse(raw)).catch(() => {}));
    ws.on('close', () => { clearInterval(keepalive); this.conns.delete(key); });
    ws.on('error', () => { try { ws.close(); } catch (_) {} });
  }

  async _handle(acc, market, evt) {
    const isFutures = evt.e === 'ORDER_TRADE_UPDATE';
    if (evt.e !== 'ORDER_TRADE_UPDATE' && evt.e !== 'executionReport') return;
    const o = isFutures ? evt.o : evt;

    const status = o.X; // FILLED, CANCELED...
    if (status !== 'FILLED') return;

    const orderId = String(o.i);
    const trade = await BinanceTrade.findOne({ $or: [{ slOrderId: orderId }, { tpOrderId: orderId }], status: 'open' });
    if (!trade) return;

    const exitPrice = Number(isFutures ? (o.ap || o.L) : o.L);
    const pnl = (trade.side === 'BUY' ? exitPrice - trade.entryPrice : trade.entryPrice - exitPrice) * trade.qty;

    trade.status = 'closed'; trade.exitPrice = exitPrice; trade.pnl = +pnl.toFixed(4);
    trade.pnlPct = +((pnl / (trade.entryPrice * trade.qty)) * 100).toFixed(2);
    trade.closeReason = trade.slOrderId === orderId ? 'sl' : 'tp';
    trade.closedAt = new Date();
    await trade.save();
    await Position.findOneAndUpdate({ trade: trade._id }, { status: 'closed' });

    const session = await RobotSession.findById(trade.session);
    if (session) {
      session.stats.totalPnl = +(session.stats.totalPnl + pnl).toFixed(4);
      session.stats.dailyPnl = +(session.stats.dailyPnl + pnl).toFixed(4);
      if (pnl >= 0) session.stats.wins++; else session.stats.losses++;
      const eq = session.stats.startEquity + session.stats.totalPnl;
      session.stats.peakEquity = Math.max(session.stats.peakEquity, eq);
      await session.save();
      notifier.tradeClosed(session.user, { symbol: trade.symbol, pnl, robotKey: session.robotKey, reason: trade.closeReason });
      if (global.broadcastToUser) global.broadcastToUser(session.user.toString(), { type: 'trade_closed', symbol: trade.symbol, pnl, reason: trade.closeReason, sessionId: session._id });
    }
  }

  stop(accountId, market) {
    const key = `${accountId}:${market}`;
    const c = this.conns.get(key);
    if (c) { clearInterval(c.keepalive); try { c.ws.close(); } catch (_) {} this.conns.delete(key); }
  }
}

module.exports = new BinanceUserDataStream();
