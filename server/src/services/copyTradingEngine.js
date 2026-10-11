'use strict';
/**
 * Copy Trading Engine (Binance)
 * ─────────────────────────────────────────────────────────────────────────
 * Écoute les trades des robots Binance « masters » (via TradeExecutionService)
 * et réplique l'exécution sur les comptes Binance des followers abonnés.
 *
 * Flow:
 *   master (RobotSession) ouvre un trade → onMasterTradeOpened()
 *      → CopySubscriptions actives sur ce master
 *      → pour chaque follower : calcul quantité → openCopyTrade sur son compte Binance
 *      → log CopyTrade
 *
 *   master ferme un trade → onMasterTradeClosed()
 *      → fermer les CopyTrades correspondantes (closeTrade réel) → P&L réel
 *      → maj stats abonnement + commission master
 *
 *   périodique (60s): recalcul stats master + AI risk + equity curve
 */

const MasterAccount    = require('../models/MasterAccount');
const CopySubscription = require('../models/CopySubscription');
const CopyTrade        = require('../models/CopyTrade');
const CommissionLedger = require('../models/CommissionLedger');
const BinanceTrade     = require('../models/BinanceTrade');
const RobotSession     = require('../models/RobotSession');
const User             = require('../models/User');
const execService      = require('./TradeExecutionService');
const aiGuard          = require('./copyTradingAI');

class CopyTradingEngine {
  constructor() {
    this.statsTimer = null;
    this.logs = [];
    this.maxLogs = 500;
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  start() {
    if (this.statsTimer) return;
    this.statsTimer = setInterval(() => this._refreshAllMasters().catch(() => {}), 60_000);
    console.log('✅ CopyTradingEngine started');
  }

  stop() {
    if (this.statsTimer) clearInterval(this.statsTimer);
    this.statsTimer = null;
  }

  // ─── Master trade event handlers (appelés par TradeExecutionService) ───────

  /**
   * @param {Object} ctx
   * @param {string} ctx.sessionId  RobotSession id (master = robot Binance)
   * @param {Object} ctx.trade      { ticket, symbol, market, type, volume, openPrice, sl, tp, profit }
   */
  async onMasterTradeOpened(ctx) {
    try {
      const masters = await this._findMastersByContext(ctx);
      if (!masters.length) return;

      for (const master of masters) {
        const subs = await CopySubscription.find({ master: master._id, status: 'active' })
          .populate('followerBinanceAccount');
        for (const sub of subs) {
          await this._copyTradeToFollower(master, sub, ctx.trade);
        }
      }
    } catch (err) {
      this._log('error', `onMasterTradeOpened: ${err.message}`);
    }
  }

  async onMasterTradeClosed(ctx) {
    try {
      const masters = await this._findMastersByContext(ctx);
      if (!masters.length) return;

      for (const master of masters) {
        const copies = await CopyTrade.find({ master: master._id, masterTicket: ctx.trade.ticket, status: 'open' });
        for (const copy of copies) {
          await this._closeFollowerTrade(master, copy, ctx.trade);
        }
        master.totalCopiedTrades = (master.totalCopiedTrades || 0) + copies.length;
        master.stats.lastTradeAt = new Date();
        await master.save();
      }
    } catch (err) {
      this._log('error', `onMasterTradeClosed: ${err.message}`);
    }
  }

  // ─── Per-follower copy execution ───────────────────────────────────────────

  async _copyTradeToFollower(master, sub, masterTrade) {
    const settings = sub.settings || {};

    if (settings.allowedSymbols?.length && !settings.allowedSymbols.includes(masterTrade.symbol)) {
      return this._logSkip(master, sub, masterTrade, 'symbol_filter');
    }
    if (settings.maxAllocation > 0 && sub.stats.netPnl < -Math.abs(settings.maxAllocation)) {
      return this._logSkip(master, sub, masterTrade, 'max_allocation_exceeded');
    }
    if (settings.globalSL > 0 && sub.stats.netPnl <= -settings.globalSL) {
      await this._autoStop(sub, 'global_sl_hit');
      return this._logSkip(master, sub, masterTrade, 'global_sl_hit');
    }
    if (settings.globalTP > 0 && sub.stats.netPnl >= settings.globalTP) {
      await this._autoStop(sub, 'global_tp_hit');
      return this._logSkip(master, sub, masterTrade, 'global_tp_hit');
    }

    const account = sub.followerBinanceAccount;
    if (!account || account.status !== 'active') {
      return this._logSkip(master, sub, masterTrade, 'account_disconnected');
    }

    const qty = this._computeQty(master, sub, masterTrade, account);
    if (qty <= 0) return this._logSkip(master, sub, masterTrade, 'qty_too_small');

    const type = settings.reverseDirection
      ? (masterTrade.type === 'buy' ? 'sell' : 'buy')
      : masterTrade.type;
    const side = type === 'buy' ? 'BUY' : 'SELL';
    const sl = settings.copySL ? masterTrade.sl : undefined;
    const tp = settings.copyTP ? masterTrade.tp : undefined;

    const copy = await CopyTrade.create({
      subscription: sub._id,
      master: master._id,
      follower: sub.follower,
      masterTicket: masterTrade.ticket,
      masterLot: masterTrade.volume,
      masterOpenPrice: masterTrade.openPrice,
      followerLot: qty,
      symbol: masterTrade.symbol,
      market: masterTrade.market || 'spot',
      type,
      sl, tp,
      openTime: new Date(),
      status: 'open',
      comment: `Copy:${master.slug}:${masterTrade.ticket}`,
    });

    try {
      const ft = await execService.openCopyTrade({
        user: sub.follower,
        accountId: account._id,
        market: masterTrade.market || 'spot',
        symbol: masterTrade.symbol,
        side, qty, sl, tp,
        leverage: master.market === 'futures' ? (master.stats?.leverage || 5) : 1,
      });
      copy.followerTicket = ft._id.toString();
      copy.followerOpenPrice = ft.entryPrice;
      copy.followerLot = ft.qty;
      await copy.save();

      sub.stats.copiedTrades += 1;
      sub.stats.openTrades   += 1;
      sub.stats.lastCopyAt    = new Date();
      await sub.save();

      this._notify(sub.follower, {
        type: 'copy_trade_opened', subscriptionId: sub._id,
        masterName: master.displayName, symbol: masterTrade.symbol, tradeType: type, lot: ft.qty,
      });
      this._log('info', `Copy → ${master.slug} → follower ${sub.follower}: ${masterTrade.symbol} ${type} ${ft.qty}`);
    } catch (err) {
      if (err.skip) return this._logSkip(master, sub, masterTrade, err.message, copy);
      copy.status = 'failed';
      copy.errorMessage = err.message;
      await copy.save();
      this._log('error', `Copy failed (${master.slug}→${sub.follower}): ${err.message}`);
    }
  }

  async _closeFollowerTrade(master, copy, masterTrade) {
    try {
      // Fermeture réelle de la copie sur le compte Binance du follower → P&L réel
      let profit = 0, closePrice = masterTrade.closePrice || masterTrade.openPrice;
      if (copy.followerTicket && /^[a-f0-9]{24}$/i.test(copy.followerTicket)) {
        const closed = await execService.closeTrade(copy.followerTicket, 'copy_master_close').catch(() => null);
        if (closed) { profit = closed.pnl || 0; closePrice = closed.exitPrice || closePrice; }
      }
      // Fallback : miroir proportionnel du P&L master
      if (!profit && masterTrade.profit !== undefined && masterTrade.volume > 0) {
        profit = +(masterTrade.profit * (copy.followerLot / masterTrade.volume)).toFixed(2);
      }

      copy.status = 'closed';
      copy.closeTime = new Date();
      copy.followerClosePrice = closePrice;
      copy.profit = +profit.toFixed(2);

      const sub = await CopySubscription.findById(copy.subscription);
      if (sub) {
        if (profit > 0 && master.feePct > 0) {
          copy.fee = +(profit * (master.feePct / 100)).toFixed(2);
          sub.stats.feesPaid = +(sub.stats.feesPaid + copy.fee).toFixed(2);
          try {
            await User.findByIdAndUpdate(master.user, { $inc: { copyTradingEarnings: copy.fee, copyTradingAvailable: copy.fee } });
            await CommissionLedger.create({
              master: master.user, masterAccount: master._id, type: 'earn', amount: copy.fee,
              copyTrade: copy._id, subscription: sub._id, follower: copy.follower, symbol: copy.symbol,
              feePct: master.feePct, tradeProfit: profit,
              description: `Commission ${master.feePct}% sur trade copié ${copy.symbol}`,
            });
            this._notify(master.user, { type: 'copy_commission_earned', amount: copy.fee, symbol: copy.symbol, feePct: master.feePct, tradeProfit: profit });
          } catch (err) {
            this._log('error', `commission credit failed: ${err.message}`);
          }
        }
        const netProfit = profit - copy.fee;
        sub.stats.openTrades = Math.max(0, sub.stats.openTrades - 1);
        if (netProfit >= 0) {
          sub.stats.wins += 1;
          sub.stats.totalProfit = +(sub.stats.totalProfit + netProfit).toFixed(2);
        } else {
          sub.stats.losses += 1;
          sub.stats.totalLoss = +(sub.stats.totalLoss + Math.abs(netProfit)).toFixed(2);
        }
        sub.stats.netPnl = +(sub.stats.totalProfit - sub.stats.totalLoss).toFixed(2);

        if (sub.stats.netPnl > (sub.stats.peakEquity || 0)) sub.stats.peakEquity = sub.stats.netPnl;
        const dd = ((sub.stats.peakEquity || 0) - sub.stats.netPnl);
        if (dd > sub.stats.maxDrawdown) sub.stats.maxDrawdown = +dd.toFixed(2);

        const ddPct = sub.stats.startEquity > 0 ? (dd / sub.stats.startEquity) * 100 : 0;
        if (sub.settings.maxDrawdownPct > 0 && ddPct >= sub.settings.maxDrawdownPct) {
          await this._autoStop(sub, `subscription_dd_${ddPct.toFixed(1)}%`);
        } else {
          await sub.save();
        }
      }

      await copy.save();
      this._notify(copy.follower, { type: 'copy_trade_closed', masterName: master.displayName, symbol: copy.symbol, profit, fee: copy.fee });
    } catch (err) {
      this._log('error', `closeFollowerTrade: ${err.message}`);
    }
  }

  // ─── Sizing quantité crypto ────────────────────────────────────────────────

  _computeQty(master, sub, masterTrade, account) {
    const s = sub.settings;
    let qty;
    if (s.lotMode === 'fixed') {
      qty = s.fixedLot;
    } else if (s.lotMode === 'multiplier') {
      qty = masterTrade.volume * s.multiplier;
    } else {
      // proportional → ratio equity follower / equity master
      const masterEq = master.stats?.currentEquity || master.stats?.startBalance || 1000;
      const followerEq = (account?.futuresUSDT || 0) + (account?.spotUSDT || 0) || 100;
      const ratio = followerEq / Math.max(masterEq, 100);
      qty = masterTrade.volume * ratio;
    }
    if (s.maxLotPerTrade > 0) qty = Math.min(qty, s.maxLotPerTrade);
    return qty > 0 ? +qty.toFixed(8) : 0;
  }

  // ─── Master resolution ──────────────────────────────────────────────────────

  async _findMastersByContext(ctx) {
    if (!ctx.sessionId) return [];
    return MasterAccount.find({ status: 'approved', robotSession: ctx.sessionId });
  }

  async _autoStop(sub, reason) {
    sub.status = 'stopped';
    sub.pausedBy = 'ai';
    sub.pauseReason = reason;
    sub.stoppedAt = new Date();
    await sub.save();
    this._notify(sub.follower, { type: 'copy_auto_stopped', subscriptionId: sub._id, reason });
    this._log('warn', `Auto-stop sub ${sub._id}: ${reason}`);
  }

  // ─── Periodic master refresh ────────────────────────────────────────────────

  async _refreshAllMasters() {
    const masters = await MasterAccount.find({ status: 'approved' });
    for (const m of masters) {
      try {
        await this._recomputeMasterStats(m);
        await aiGuard.evaluateAndProtect(m._id);
      } catch (err) {
        this._log('error', `refresh master ${m.slug}: ${err.message}`);
      }
    }
  }

  async _recomputeMasterStats(master) {
    if (!master.robotSession) {
      master.followersCount = await CopySubscription.countDocuments({ master: master._id, status: { $ne: 'stopped' } });
      return master.save();
    }
    const sess = await RobotSession.findById(master.robotSession);
    if (sess) {
      const closed = await BinanceTrade.find({ session: master.robotSession, status: 'closed' }).select('pnl closedAt').sort({ closedAt: 1 });
      const wins = closed.filter(t => t.pnl > 0);
      const losses = closed.filter(t => t.pnl <= 0);
      const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;
      const avgWin = wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
      const totalLoss = losses.reduce((s, t) => s + Math.abs(t.pnl || 0), 0);
      const avgLoss = losses.length ? totalLoss / losses.length : 0;
      const totalProfit = sess.stats?.totalPnl || closed.reduce((s, t) => s + (t.pnl || 0), 0);
      const startBalance = master.stats?.startBalance || sess.stats?.startEquity || 1000;
      const currentEquity = startBalance + totalProfit;
      const roi = startBalance > 0 ? (totalProfit / startBalance) * 100 : 0;
      const profitFactor = totalLoss > 0 ? (avgWin * wins.length) / totalLoss : (wins.length ? 10 : 0);

      const curve = master.equityCurve || [];
      const peak = Math.max(startBalance, ...curve.map(p => p.equity || 0), currentEquity);
      const currentDD = peak > 0 ? ((peak - currentEquity) / peak) * 100 : 0;
      const maxDD = Math.max(master.stats?.maxDrawdown || 0, currentDD);

      master.stats = {
        ...master.stats,
        startBalance,
        currentEquity: +currentEquity.toFixed(2),
        totalProfit: +totalProfit.toFixed(2),
        totalTrades: closed.length,
        wins: wins.length, losses: losses.length,
        winRate: +winRate.toFixed(1),
        roi: +roi.toFixed(2),
        avgWin: +avgWin.toFixed(2),
        avgLoss: +avgLoss.toFixed(2),
        profitFactor: +profitFactor.toFixed(2),
        maxDrawdown: +maxDD.toFixed(2),
        currentDrawdown: +currentDD.toFixed(2),
        lastTradeAt: closed.length ? closed[closed.length - 1].closedAt : master.stats.lastTradeAt,
      };

      const now = new Date();
      const last = curve[curve.length - 1];
      if (!last || (now - new Date(last.t)) > 5 * 60_000) {
        curve.push({ t: now, equity: currentEquity, balance: currentEquity, drawdown: currentDD });
        if (curve.length > 200) curve.shift();
        master.equityCurve = curve;
      }
    }

    master.followersCount = await CopySubscription.countDocuments({ master: master._id, status: { $ne: 'stopped' } });
    await master.save();
  }

  // ─── Logging ────────────────────────────────────────────────────────────────

  _logSkip(master, sub, masterTrade, reason, copy) {
    if (copy) { copy.status = 'skipped'; copy.skipReason = reason; copy.save().catch(() => {}); }
    this._log('info', `Skip copy ${master.slug}→${sub.follower} (${masterTrade.symbol}): ${reason}`);
  }

  _log(level, message) {
    const entry = { t: new Date(), level, message };
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) this.logs.shift();
    if (level === 'error') console.error('[CopyEngine]', message);
  }

  getLogs(limit = 100) {
    return this.logs.slice(-limit).reverse();
  }

  _notify(userId, data) {
    if (global.broadcastToUser) global.broadcastToUser(userId.toString(), data);
  }
}

module.exports = new CopyTradingEngine();
