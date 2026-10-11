'use strict';
const mongoose = require('mongoose');
const BinanceTrade = require('../models/BinanceTrade');
const PerformanceStat = require('../models/PerformanceStat');
const BinanceAccount = require('../models/BinanceAccount');
const RobotSession = require('../models/RobotSession');
const RobotLog = require('../models/RobotLog');
const { ROBOT_CATALOG } = require('../config/binanceRobots');

class PerformanceService {
  /** Stats agrégées pour le dashboard user. */
  async userSummary(userId) {
    const oid = mongoose.Types.ObjectId.createFromHexString(String(userId));
    const agg = await BinanceTrade.aggregate([
      { $match: { user: oid, status: 'closed' } },
      { $group: {
        _id: null,
        totalPnl: { $sum: '$pnl' },
        trades: { $sum: 1 },
        wins: { $sum: { $cond: [{ $gte: ['$pnl', 0] }, 1, 0] } },
        volume: { $sum: { $multiply: ['$qty', '$entryPrice'] } },
      } },
    ]);
    const a = agg[0] || { totalPnl: 0, trades: 0, wins: 0, volume: 0 };

    const closed = await BinanceTrade.find({ user: userId, status: 'closed' }).sort({ closedAt: 1 }).select('pnl closedAt');
    let equity = 0, peak = 0, maxDD = 0, dailyPnl = 0;
    const today = new Date().toISOString().slice(0, 10);
    for (const t of closed) {
      equity += t.pnl; peak = Math.max(peak, equity);
      maxDD = Math.max(maxDD, peak - equity);
      if (t.closedAt && t.closedAt.toISOString().slice(0, 10) === today) dailyPnl += t.pnl;
    }
    const openCount = await BinanceTrade.countDocuments({ user: userId, status: 'open' });
    return {
      totalPnl: +a.totalPnl.toFixed(2),
      dailyPnl: +dailyPnl.toFixed(2),
      trades: a.trades,
      winRate: a.trades ? +((a.wins / a.trades) * 100).toFixed(1) : 0,
      volume: +a.volume.toFixed(2),
      maxDrawdown: +maxDD.toFixed(2),
      roi: peak ? +((a.totalPnl / peak) * 100).toFixed(2) : 0,
      openPositions: openCount,
    };
  }

  /** KPIs globaux pour le dashboard admin Binance. */
  async adminDashboard() {
    const today = new Date().toISOString().slice(0, 10);
    const since = new Date(today + 'T00:00:00Z');

    const [
      totalAccounts, activeAccounts, connectedUsers,
      activeSessions, pausedSessions,
      openTrades, errorLogs24h,
      tradeAgg, dailyAgg,
    ] = await Promise.all([
      BinanceAccount.countDocuments({}),
      BinanceAccount.countDocuments({ status: 'active' }),
      BinanceAccount.distinct('user'),
      RobotSession.countDocuments({ status: 'active' }),
      RobotSession.countDocuments({ status: 'paused' }),
      BinanceTrade.countDocuments({ status: 'open' }),
      RobotLog.countDocuments({ level: 'error', createdAt: { $gte: since } }),
      BinanceTrade.aggregate([
        { $match: { status: 'closed' } },
        { $group: {
          _id: null,
          totalPnl: { $sum: '$pnl' },
          totalCommission: { $sum: '$commission' },
          trades: { $sum: 1 },
          wins: { $sum: { $cond: [{ $gte: ['$pnl', 0] }, 1, 0] } },
          volume: { $sum: { $multiply: ['$qty', '$entryPrice'] } },
        } },
      ]),
      BinanceTrade.aggregate([
        { $match: { status: 'closed', closedAt: { $gte: since } } },
        { $group: { _id: null, pnl: { $sum: '$pnl' }, trades: { $sum: 1 },
          volume: { $sum: { $multiply: ['$qty', '$entryPrice'] } } } },
      ]),
    ]);

    const t = tradeAgg[0] || { totalPnl: 0, totalCommission: 0, trades: 0, wins: 0, volume: 0 };
    const d = dailyAgg[0] || { pnl: 0, trades: 0, volume: 0 };

    return {
      connectedUsers: connectedUsers.length,
      totalAccounts,
      activeAccounts,
      activeSessions,
      pausedSessions,
      openTrades,
      errorLogs24h,
      totalTrades: t.trades,
      totalPnl: +t.totalPnl.toFixed(2),
      totalCommission: +t.totalCommission.toFixed(2),
      totalVolume: +t.volume.toFixed(2),
      winRate: t.trades ? +((t.wins / t.trades) * 100).toFixed(1) : 0,
      dailyPnl: +d.pnl.toFixed(2),
      dailyTrades: d.trades,
      dailyVolume: +d.volume.toFixed(2),
    };
  }

  /** Performance agrégée par robot (tous users). */
  async robotLeaderboard() {
    const [tradeAgg, sessionAgg] = await Promise.all([
      BinanceTrade.aggregate([
        { $match: { status: 'closed' } },
        { $group: {
          _id: '$robotKey',
          trades: { $sum: 1 },
          wins: { $sum: { $cond: [{ $gte: ['$pnl', 0] }, 1, 0] } },
          pnl: { $sum: '$pnl' },
          volume: { $sum: { $multiply: ['$qty', '$entryPrice'] } },
        } },
      ]),
      RobotSession.aggregate([
        { $group: {
          _id: '$robotKey',
          activeSessions: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          totalSessions: { $sum: 1 },
        } },
      ]),
    ]);

    const tradeMap = Object.fromEntries(tradeAgg.map(r => [r._id, r]));
    const sessMap = Object.fromEntries(sessionAgg.map(r => [r._id, r]));
    const keys = new Set([...Object.keys(tradeMap), ...Object.keys(sessMap), ...ROBOT_CATALOG.map(r => r.key)]);

    return [...keys].map(key => {
      const meta = ROBOT_CATALOG.find(r => r.key === key);
      const tr = tradeMap[key] || { trades: 0, wins: 0, pnl: 0, volume: 0 };
      const ss = sessMap[key] || { activeSessions: 0, totalSessions: 0 };
      return {
        robotKey: key,
        name: meta?.name || key,
        tier: meta?.tier || meta?.planRequired || '—',
        markets: meta?.markets || [],
        activeSessions: ss.activeSessions,
        totalSessions: ss.totalSessions,
        trades: tr.trades,
        winRate: tr.trades ? +((tr.wins / tr.trades) * 100).toFixed(1) : 0,
        pnl: +tr.pnl.toFixed(2),
        volume: +tr.volume.toFixed(2),
      };
    }).sort((a, b) => b.pnl - a.pnl);
  }

  /** Snapshot journalier (cron). */
  async snapshotDaily(userId, sessionId) {
    const day = new Date().toISOString().slice(0, 10);
    const since = new Date(day + 'T00:00:00Z');
    const trades = await BinanceTrade.find({ session: sessionId, status: 'closed', closedAt: { $gte: since } });
    const pnl = trades.reduce((s, t) => s + t.pnl, 0);
    const wins = trades.filter(t => t.pnl >= 0).length;
    await PerformanceStat.findOneAndUpdate(
      { user: userId, session: sessionId, day },
      { pnl, trades: trades.length, wins, losses: trades.length - wins,
        winRate: trades.length ? (wins / trades.length) * 100 : 0,
        volume: trades.reduce((s, t) => s + t.qty * t.entryPrice, 0) },
      { upsert: true }
    );
  }
}

module.exports = new PerformanceService();
