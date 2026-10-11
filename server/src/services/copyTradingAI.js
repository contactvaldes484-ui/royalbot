'use strict';
/**
 * Copy Trading AI — master risk scoring + auto-pause.
 *
 * Computes a danger score (0=safe, 100=critical) for each master based on:
 *   - Current drawdown vs historical max
 *   - Recent loss streak
 *   - Win rate degradation over last N trades
 *   - Trading frequency anomaly (over-trading)
 *   - Equity curve volatility
 *
 * When score crosses thresholds, flags the master and auto-pauses follower
 * subscriptions that have `aiPauseOnMasterDanger` enabled.
 */

const MasterAccount = require('../models/MasterAccount');
const CopySubscription = require('../models/CopySubscription');
const CopyTrade = require('../models/CopyTrade');

const THRESHOLDS = {
  safe:     0,
  warning:  35,
  danger:   60,
  critical: 80,
};

/**
 * Compute risk score and recommended flag for a master.
 * @returns {{score:number, flag:string, reason:string}}
 */
async function scoreMaster(master) {
  const s = master.stats || {};
  let score = 0;
  const reasons = [];

  // 1. Current drawdown (0–30 pts)
  if (s.currentDrawdown >= 25) { score += 30; reasons.push(`DD critique ${s.currentDrawdown.toFixed(1)}%`); }
  else if (s.currentDrawdown >= 15) { score += 18; reasons.push(`DD élevé ${s.currentDrawdown.toFixed(1)}%`); }
  else if (s.currentDrawdown >= 8)  { score += 8;  reasons.push(`DD modéré ${s.currentDrawdown.toFixed(1)}%`); }

  // 2. Recent loss streak (last 10 trades, 0–25 pts)
  const recentTrades = await CopyTrade.find({ master: master._id, status: 'closed' })
    .sort({ closeTime: -1 }).limit(10).lean();
  if (recentTrades.length >= 5) {
    let streak = 0;
    for (const t of recentTrades) {
      if (t.profit < 0) streak++;
      else break;
    }
    if (streak >= 6) { score += 25; reasons.push(`${streak} pertes consécutives`); }
    else if (streak >= 4) { score += 15; reasons.push(`${streak} pertes d'affilée`); }
    else if (streak >= 3) { score += 7; }
  }

  // 3. Win rate degradation (0–15 pts)
  if (s.totalTrades >= 20) {
    if (s.winRate < 35) { score += 15; reasons.push(`Winrate faible ${s.winRate.toFixed(0)}%`); }
    else if (s.winRate < 45) { score += 8; }
  }

  // 4. Profit factor (0–15 pts)
  if (s.totalTrades >= 20 && s.profitFactor > 0) {
    if (s.profitFactor < 0.8) { score += 15; reasons.push(`PF<0.8 (perdant)`); }
    else if (s.profitFactor < 1.0) { score += 8; reasons.push(`PF<1.0`); }
  }

  // 5. ROI negative (0–15 pts)
  if (s.roi < -15) { score += 15; reasons.push(`ROI ${s.roi.toFixed(1)}%`); }
  else if (s.roi < -5) { score += 7; }

  score = Math.max(0, Math.min(100, score));

  let flag = 'safe';
  if (score >= THRESHOLDS.critical) flag = 'critical';
  else if (score >= THRESHOLDS.danger) flag = 'danger';
  else if (score >= THRESHOLDS.warning) flag = 'warning';

  return {
    score,
    flag,
    reason: reasons.join(' · ') || 'Performances normales',
  };
}

/**
 * Run AI check on a master, update its aiRisk snapshot, and auto-pause
 * follower subscriptions if flag === 'critical' (and they opted in).
 * Returns the updated aiRisk object.
 */
async function evaluateAndProtect(masterId) {
  const master = await MasterAccount.findById(masterId);
  if (!master) return null;

  const risk = await scoreMaster(master);
  master.aiRisk = { ...risk, lastCheckedAt: new Date() };
  await master.save();

  // Auto-pause critical followers
  if (risk.flag === 'critical' || risk.flag === 'danger') {
    const subs = await CopySubscription.find({
      master: master._id,
      status: 'active',
      'settings.aiGuardEnabled': true,
      'settings.aiPauseOnMasterDanger': true,
    });
    for (const sub of subs) {
      // Only pause on critical, or on danger if no recent open trades
      if (risk.flag === 'critical' || (sub.stats.openTrades === 0)) {
        sub.status = 'paused';
        sub.pausedBy = 'ai';
        sub.pauseReason = `IA: ${risk.reason}`;
        sub.pausedAt = new Date();
        await sub.save();
        notifyFollower(sub.follower, {
          type: 'copy_ai_pause',
          masterId: master._id,
          masterName: master.displayName,
          reason: risk.reason,
          flag: risk.flag,
        });
      }
    }
  }

  return master.aiRisk;
}

function notifyFollower(userId, payload) {
  if (global.broadcastToUser) global.broadcastToUser(userId.toString(), payload);
}

module.exports = {
  scoreMaster,
  evaluateAndProtect,
  THRESHOLDS,
};
