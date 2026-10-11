'use strict';
const BinanceTrade = require('../models/BinanceTrade');

class RiskManager {
  /**
   * Taille de position. SL obligatoire — lève une erreur sinon.
   * Modes d'ajustement des lots (choisis par l'utilisateur) :
   *  - 'risk'       : qty = (equity * risk%) / |entry - sl|   (défaut)
   *  - 'fixed'      : notional = fixedNotionalUsd (USDT par trade)
   *  - 'multiplier' : base 'risk' × lotMultiplier
   * Toujours plafonné par le notional maximum autorisé (levier/solde).
   */
  sizePosition({ equity, riskPercent, entryPrice, slPrice, leverage = 1, market,
                 sizingMode = 'risk', fixedNotionalUsd = 0, lotMultiplier = 1 }) {
    if (!slPrice || slPrice <= 0) throw new Error('RISK_NO_SL: Stop Loss obligatoire — trade refusé.');
    const slDistance = Math.abs(entryPrice - slPrice);
    if (slDistance <= 0) throw new Error('RISK_BAD_SL: distance SL nulle.');

    const maxNotional = market === 'futures' ? equity * leverage * 0.95 : equity * 0.98;
    let qty;

    if (sizingMode === 'fixed' && fixedNotionalUsd > 0) {
      const notional = Math.min(fixedNotionalUsd, maxNotional);
      qty = notional / entryPrice;
    } else {
      const riskAmount = equity * (riskPercent / 100);
      qty = riskAmount / slDistance;
      if (sizingMode === 'multiplier' && lotMultiplier > 0) qty *= lotMultiplier;
      const notional = qty * entryPrice;
      if (notional > maxNotional) qty = maxNotional / entryPrice;
    }
    return Math.max(qty, 0);
  }

  /** Garde-fous AVANT ouverture. */
  async preTradeCheck(session, { openCount }) {
    const r = session.risk;
    const s = session.stats;

    if (openCount >= session.settings.maxOpenTrades) return { ok: false, reason: 'MAX_OPEN_TRADES' };

    if (s.startEquity > 0 && s.dailyPnl <= -(s.startEquity * r.maxDailyLossPct / 100))
      return { ok: false, reason: 'DAILY_LOSS_LIMIT' };

    if (s.peakEquity > 0) {
      const equityNow = s.startEquity + s.totalPnl;
      const dd = (s.peakEquity - equityNow) / s.peakEquity * 100;
      if (dd >= r.maxDrawdownPct) return { ok: false, reason: 'MAX_DRAWDOWN' };
    }

    const day = new Date().toISOString().slice(0, 10);
    const since = new Date(day + 'T00:00:00Z');
    const todayCount = await BinanceTrade.countDocuments({ session: session._id, openedAt: { $gte: since } });
    if (todayCount >= r.maxTradesPerDay) return { ok: false, reason: 'MAX_TRADES_PER_DAY' };

    if (session.lastTradeAt && (Date.now() - new Date(session.lastTradeAt).getTime()) / 1000 < r.cooldownSeconds)
      return { ok: false, reason: 'COOLDOWN' };

    return { ok: true };
  }
}

module.exports = new RiskManager();
