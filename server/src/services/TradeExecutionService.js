const BinanceService = require('./BinanceService');
const BybitService = require('./BybitService');
const RiskManager = require('./RiskManager');
const { normalizeOrder } = require('../lib/binanceFilters');
const BinanceAccount = require('../models/BinanceAccount');
const BybitAccount = require('../models/BybitAccount');
const BinanceTrade = require('../models/BinanceTrade');
const Position = require('../models/Position');
const RobotLog = require('../models/RobotLog');
const notifier = require('./NotificationService');

class TradeExecutionService {
  async _client(session) {
    if (session.exchange === 'bybit' || session.bybitAccount) {
      const acc = await BybitAccount.findById(session.bybitAccount).select('+apiKeyEnc +apiSecretEnc');
      if (!acc) throw new Error('Compte Bybit introuvable');
      const { apiKey, apiSecret } = acc.getKeys();
      return { acc, bx: new BybitService({ apiKey, apiSecret, isTestnet: acc.isTestnet }), isBybit: true };
    }
    const acc = await BinanceAccount.findById(session.binanceAccount).select('+apiKeyEnc +apiSecretEnc');
    if (!acc) throw new Error('Compte Binance introuvable');
    const { apiKey, apiSecret } = acc.getKeys();
    return { acc, bx: new BinanceService({ apiKey, apiSecret, isTestnet: acc.isTestnet }), isBybit: false };
  }

  /** Ouvre un trade depuis un signal de stratégie. */
  async openFromSignal({ session, symbol, signal, equity }) {
    const market = session.market;
    const { acc, bx, isBybit } = await this._client(session);

    const openCount = await BinanceTrade.countDocuments({ session: session._id, status: 'open' });
    const guard = await RiskManager.preTradeCheck(session, { openCount });
    if (!guard.ok) {
      await RobotLog.create({ user: session.user, session: session._id, level: 'warn', event: 'risk_block', message: guard.reason, meta: { symbol } });
      return null;
    }

    const side = signal.type === 'buy' ? 'BUY' : 'SELL';
    const entry = signal.entryPrice;

    let qty;
    try {
      qty = RiskManager.sizePosition({
        equity, riskPercent: session.risk.riskPercent,
        entryPrice: entry, slPrice: signal.sl,
        leverage: session.settings.leverage, market,
        sizingMode: session.settings.sizingMode,
        fixedNotionalUsd: session.settings.fixedNotionalUsd,
        lotMultiplier: session.settings.lotMultiplier,
      });
    } catch (e) {
      await RobotLog.create({ user: session.user, session: session._id, level: 'warn', event: 'risk_block', message: e.message, meta: { symbol } });
      return null;
    }

    if (isBybit) {
      if (market === 'futures') {
        await bx.setLeverage(symbol, session.settings.leverage).catch(() => {});
      }
      const bybitSide = side === 'BUY' ? 'Buy' : 'Sell';
      let bybitOrder;
      try {
        bybitOrder = await bx.createOrder(market === 'futures' ? 'linear' : 'spot', {
          symbol,
          side: bybitSide,
          orderType: 'Market',
          qty: String(qty || 0.001),
          takeProfit: signal.tp ? String(signal.tp) : undefined,
          stopLoss: signal.sl ? String(signal.sl) : undefined,
        });
      } catch (e) {
        await RobotLog.create({ user: session.user, session: session._id, level: 'error', event: 'bybit_error', message: e.message, meta: { symbol } });
        return null;
      }
      const trade = await BinanceTrade.create({
        user: session.user, session: session._id, exchange: 'bybit', bybitAccount: acc._id, robotKey: session.robotKey,
        market, symbol, side, positionSide: side === 'BUY' ? 'LONG' : 'SHORT',
        type: 'MARKET', qty, entryPrice: entry, sl: signal.sl, tp: signal.tp,
        leverage: market === 'futures' ? session.settings.leverage : 1,
        binanceOrderId: String(bybitOrder.orderId || Date.now()),
        status: 'open', reason: signal.reason, openedAt: new Date(),
      });
      session.stats.totalTrades += 1;
      session.lastTradeAt = new Date();
      await session.save();
      await RobotLog.create({ user: session.user, session: session._id, level: 'info', event: 'open', message: `Bybit ${side} ${symbol} @ ${entry}`, meta: { qty, sl: signal.sl, tp: signal.tp } });
      notifier.tradeOpened(session.user, { symbol, side, qty, price: entry, sl: signal.sl, tp: signal.tp, robotKey: session.robotKey, exchange: 'bybit' });
      if (global.broadcastToUser) global.broadcastToUser(session.user.toString(), { type: 'trade_opened', symbol, side, price: entry, sl: signal.sl, tp: signal.tp, sessionId: session._id, exchange: 'bybit' });
      return trade;
    }

    const norm = await normalizeOrder(bx, market, symbol, { qty, price: signal.sl });
    qty = norm.qty;
    if (!qty || qty < (norm.filters?.minQty || 0) || qty * entry < (norm.filters?.minNotional || 0)) {
      await RobotLog.create({ user: session.user, session: session._id, level: 'warn', event: 'risk_block', message: 'MIN_NOTIONAL', meta: { symbol, qty } });
      return null;
    }

    if (market === 'futures') {
      await bx.setMarginType(symbol, 'ISOLATED').catch(() => {});
      await bx.setLeverage(symbol, session.settings.leverage).catch(() => {});
    }

    const clientId = `UB_${session._id.toString().slice(-6)}_${Date.now().toString(36)}`;
    const entryParams = market === 'futures'
      ? { symbol, side, type: 'MARKET', quantity: qty, newClientOrderId: clientId, positionSide: side === 'BUY' ? 'LONG' : 'SHORT' }
      : { symbol, side, type: 'MARKET', quantity: qty, newClientOrderId: clientId };

    let order;
    try {
      order = await bx.createOrder(market, entryParams);
    } catch (e) {
      await RobotLog.create({ user: session.user, session: session._id, level: 'error', event: 'binance_error', message: e.message, meta: { symbol, code: e.code } });
      return null;
    }

    const fillPrice = Number(order.avgPrice || order.fills?.[0]?.price || entry);

    let slOrderId, tpOrderId;
    try {
      const r = await this._placeProtection(bx, market, { symbol, side, qty, sl: signal.sl, tp: signal.tp });
      slOrderId = r.slOrderId; tpOrderId = r.tpOrderId;
    } catch (e) {
      await RobotLog.create({ user: session.user, session: session._id, level: 'warn', event: 'binance_error', message: `protection: ${e.message}`, meta: { symbol } });
    }

    const trade = await BinanceTrade.create({
      user: session.user, session: session._id, binanceAccount: acc._id, robotKey: session.robotKey,
      market, symbol, side, positionSide: side === 'BUY' ? 'LONG' : 'SHORT',
      type: 'MARKET', qty, entryPrice: fillPrice, sl: signal.sl, tp: signal.tp,
      leverage: market === 'futures' ? session.settings.leverage : 1,
      binanceOrderId: String(order.orderId), binanceClientId: clientId,
      slOrderId, tpOrderId, status: 'open', reason: signal.reason, openedAt: new Date(),
    });

    if (market === 'futures') {
      await Position.create({
        user: session.user, session: session._id, binanceAccount: acc._id,
        symbol, positionSide: side === 'BUY' ? 'LONG' : 'SHORT', qty, entryPrice: fillPrice,
        leverage: session.settings.leverage, sl: signal.sl, tp: signal.tp,
        slOrderId, tpOrderId, trade: trade._id, status: 'open',
      });
    }

    session.stats.totalTrades += 1;
    session.lastTradeAt = new Date();
    await session.save();

    await RobotLog.create({ user: session.user, session: session._id, level: 'info', event: 'open', message: `${side} ${symbol} @ ${fillPrice}`, meta: { qty, sl: signal.sl, tp: signal.tp } });

    notifier.tradeOpened(session.user, { symbol, side, qty, price: fillPrice, sl: signal.sl, tp: signal.tp, robotKey: session.robotKey });
    if (global.broadcastToUser) global.broadcastToUser(session.user.toString(), { type: 'trade_opened', symbol, side, price: fillPrice, sl: signal.sl, tp: signal.tp, sessionId: session._id });

    // ── Copy-trading : propage l'ouverture aux followers de ce robot (master) ──
    try {
      require('./copyTradingEngine').onMasterTradeOpened({ sessionId: session._id.toString(), trade: this._masterCtx(trade) }).catch(() => {});
    } catch (_) { /* moteur copy indispo */ }

    return trade;
  }

  /** Normalise une BinanceTrade en objet masterTrade pour le copy-trading. */
  _masterCtx(trade) {
    return {
      ticket: trade.binanceOrderId || String(trade._id),
      symbol: trade.symbol, market: trade.market,
      type: trade.side === 'BUY' ? 'buy' : 'sell',
      volume: trade.qty, openPrice: trade.entryPrice,
      sl: trade.sl, tp: trade.tp,
      profit: trade.pnl, closePrice: trade.exitPrice,
    };
  }

  /**
   * Ouvre un trade « copié » sur le compte Binance d'un follower (MARKET + SL/TP).
   * Pas de session robot : c'est une copie. Renvoie la BinanceTrade créée.
   */
  async openCopyTrade({ user, accountId, market, symbol, side, qty, sl, tp, leverage = 1, robotKey = 'copy' }) {
    const { acc, bx } = await this._client(accountId);

    const norm = await normalizeOrder(bx, market, symbol, { qty, price: sl });
    qty = norm.qty;
    const px = Number((await bx.getPrice(market, symbol)).price);
    if (!qty || qty < (norm.filters?.minQty || 0) || qty * px < (norm.filters?.minNotional || 0)) {
      const e = new Error('lot_too_small'); e.skip = true; throw e;
    }

    if (market === 'futures') {
      await bx.setMarginType(symbol, 'ISOLATED').catch(() => {});
      await bx.setLeverage(symbol, leverage).catch(() => {});
    }

    const clientId = `UBC_${String(accountId).slice(-6)}_${Date.now().toString(36)}`;
    const entryParams = market === 'futures'
      ? { symbol, side, type: 'MARKET', quantity: qty, newClientOrderId: clientId, positionSide: side === 'BUY' ? 'LONG' : 'SHORT' }
      : { symbol, side, type: 'MARKET', quantity: qty, newClientOrderId: clientId };

    const order = await bx.createOrder(market, entryParams);
    const fillPrice = Number(order.avgPrice || order.fills?.[0]?.price || px);

    let slOrderId, tpOrderId;
    if (sl || tp) {
      try { const r = await this._placeProtection(bx, market, { symbol, side, qty, sl, tp }); slOrderId = r.slOrderId; tpOrderId = r.tpOrderId; }
      catch (_) { /* protection best-effort */ }
    }

    const trade = await BinanceTrade.create({
      user, binanceAccount: acc._id, robotKey,
      market, symbol, side, positionSide: side === 'BUY' ? 'LONG' : 'SHORT',
      type: 'MARKET', qty, entryPrice: fillPrice, sl, tp,
      leverage: market === 'futures' ? leverage : 1,
      binanceOrderId: String(order.orderId), binanceClientId: clientId,
      slOrderId, tpOrderId, status: 'open', reason: 'copy', openedAt: new Date(),
    });
    return trade;
  }

  // SL/TP : futures → STOP_MARKET / TAKE_PROFIT_MARKET ; spot → OCO
  async _placeProtection(bx, market, { symbol, side, qty, sl, tp }) {
    const closeSide = side === 'BUY' ? 'SELL' : 'BUY';
    if (market === 'futures') {
      const posSide = side === 'BUY' ? 'LONG' : 'SHORT';
      const slo = await bx.createOrder('futures', { symbol, side: closeSide, type: 'STOP_MARKET', stopPrice: sl, closePosition: 'true', positionSide: posSide, workingType: 'MARK_PRICE' });
      const tpo = await bx.createOrder('futures', { symbol, side: closeSide, type: 'TAKE_PROFIT_MARKET', stopPrice: tp, closePosition: 'true', positionSide: posSide, workingType: 'MARK_PRICE' });
      return { slOrderId: String(slo.orderId), tpOrderId: String(tpo.orderId) };
    }
    const oco = await bx.createOrder('spot', { symbol, side: closeSide, type: 'OCO', quantity: qty, price: tp, stopPrice: sl, stopLimitPrice: sl, stopLimitTimeInForce: 'GTC' }).catch(() => null);
    return { slOrderId: oco?.orderListId ? String(oco.orderListId) : undefined, tpOrderId: undefined };
  }

  /** Ferme un trade (signal inverse / manuel). */
  async closeTrade(tradeId, closeReason = 'signal') {
    const trade = await BinanceTrade.findById(tradeId);
    if (!trade || trade.status !== 'open') return null;
    const { bx, isBybit } = await this._client(trade);
    const closeSide = trade.side === 'BUY' ? 'SELL' : 'BUY';

    if (isBybit) {
      const bybitCloseSide = trade.side === 'BUY' ? 'Sell' : 'Buy';
      await bx.createOrder(trade.market === 'futures' ? 'linear' : 'spot', {
        symbol: trade.symbol,
        side: bybitCloseSide,
        orderType: 'Market',
        qty: String(trade.qty),
      }).catch(() => {});
    } else {
      if (trade.market === 'futures') {
        await bx.createOrder('futures', { symbol: trade.symbol, side: closeSide, type: 'MARKET', quantity: trade.qty, positionSide: trade.positionSide, reduceOnly: 'true' }).catch(() => {});
      } else {
        if (trade.slOrderId) await bx.cancelOrder('spot', trade.symbol, trade.slOrderId).catch(() => {});
        await bx.createOrder('spot', { symbol: trade.symbol, side: closeSide, type: 'MARKET', quantity: trade.qty }).catch(() => {});
      }
    }

    const px = Number((await bx.getPrice(trade.market, trade.symbol)).price);
    const pnl = (trade.side === 'BUY' ? (px - trade.entryPrice) : (trade.entryPrice - px)) * trade.qty;

    trade.status = 'closed'; trade.exitPrice = px; trade.pnl = +pnl.toFixed(4);
    trade.pnlPct = +((pnl / (trade.entryPrice * trade.qty)) * 100).toFixed(2);
    trade.closeReason = closeReason; trade.closedAt = new Date();
    await trade.save();
    await Position.findOneAndUpdate({ trade: trade._id }, { status: 'closed' });

    const RobotSession = require('../models/RobotSession');
    const session = await RobotSession.findById(trade.session);
    if (session) {
      session.stats.totalPnl = +(session.stats.totalPnl + pnl).toFixed(4);
      session.stats.dailyPnl = +(session.stats.dailyPnl + pnl).toFixed(4);
      if (pnl >= 0) session.stats.wins++; else session.stats.losses++;
      const eq = session.stats.startEquity + session.stats.totalPnl;
      session.stats.peakEquity = Math.max(session.stats.peakEquity, eq);
      await session.save();
      notifier.tradeClosed(session.user, { symbol: trade.symbol, pnl, robotKey: session.robotKey, reason: closeReason });
      if (global.broadcastToUser) global.broadcastToUser(session.user.toString(), { type: 'trade_closed', symbol: trade.symbol, pnl, sessionId: session._id });

      // ── Copy-trading : propage la fermeture aux followers (sauf si c'est déjà une copie) ──
      if (closeReason !== 'copy_master_close') {
        try {
          require('./copyTradingEngine').onMasterTradeClosed({ sessionId: session._id.toString(), trade: this._masterCtx(trade) }).catch(() => {});
        } catch (_) { /* moteur copy indispo */ }
      }
    }
    return trade;
  }
}

module.exports = new TradeExecutionService();
