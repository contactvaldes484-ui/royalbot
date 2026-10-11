/**
 * Forex Scanner — periodically analyzes every (symbol, timeframe) pair
 * defined in ForexAIConfig, ranks the best setups, fires user alerts.
 */

const ForexAIConfig = require('../models/ForexAIConfig');
const ForexAnalysis = require('../models/ForexAnalysis');
const ForexAlert    = require('../models/ForexAlert');
const User          = require('../models/User');
const analyzer      = require('./forexAnalyzer');

class ForexScanner {
  constructor() {
    this.timer = null;
    this.running = false;
    this.logs = [];
    this.maxLogs = 200;
    this.lastResults = [];           // ranked analyses from last cycle
    this.lastCycleStart = null;
  }

  _log(level, msg) {
    const entry = { t: new Date(), level, message: msg };
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) this.logs.shift();
    if (level === 'error') console.error(`[ForexScanner] ${msg}`);
  }

  getLogs(limit = 100) { return this.logs.slice(-limit).reverse(); }
  getLastResults() { return this.lastResults; }

  async start() {
    const cfg = await ForexAIConfig.getSingleton();
    if (!cfg.enabled) { this._log('info', 'Scanner disabled by config'); return; }
    this._log('info', `Forex AI scanner started · ${cfg.symbols.length} symbols × ${cfg.timeframes.length} TFs every ${cfg.scannerIntervalMs / 1000}s`);
    this.scheduleNext(0);
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this._log('info', 'Scanner stopped');
  }

  async scheduleNext(delay) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.runCycle().catch(e => this._log('error', e.message)), delay);
  }

  async runCycle() {
    if (this.running) return;
    this.running = true;
    const cfg = await ForexAIConfig.getSingleton();
    if (!cfg.enabled) { this.running = false; this.scheduleNext(cfg.scannerIntervalMs); return; }

    this.lastCycleStart = new Date();
    const startMs = Date.now();
    const results = [];
    let totalAnalyses = 0;
    let alertsFiredThisCycle = 0;

    for (const symbol of cfg.symbols) {
      for (const tf of cfg.timeframes) {
        try {
          const a = await analyzer.analyze(symbol, tf, {
            swingLookback: cfg.swingLookback,
            candleCount: cfg.candleCount,
            dataProvider: cfg.dataProvider,
            apiKey: cfg.twelveDataApiKey,
          });
          if (!a) continue;
          totalAnalyses++;
          // Strip bars before saving (heavy) — keep last 50 for charting
          const { bars, ...analysisCore } = a;

          // Upsert latest cached analysis
          await ForexAnalysis.findOneAndUpdate(
            { symbol, timeframe: tf },
            { ...analysisCore, computedAt: new Date() },
            { upsert: true, new: true },
          );

          results.push({
            ...analysisCore,
            score: a.confidence * (a.signal !== 'wait' ? 1 : 0.3),
          });

          // Fire alerts
          if (cfg.alertsEnabled && a.signal !== 'wait' && a.confidence >= cfg.alertMinConfidence) {
            const fired = await this.fireAlertsFor(a);
            alertsFiredThisCycle += fired;
          }
        } catch (err) {
          this._log('error', `${symbol} ${tf}: ${err.message}`);
        }
        // Small delay to avoid hammering data provider
        await new Promise(r => setTimeout(r, 150));
      }
    }

    // Rank
    results.sort((a, b) => b.score - a.score);
    this.lastResults = results;

    cfg.lastScanAt = new Date();
    cfg.lastScanDurationMs = Date.now() - startMs;
    cfg.totalScansRun = (cfg.totalScansRun || 0) + 1;
    cfg.totalAnalysesGenerated = (cfg.totalAnalysesGenerated || 0) + totalAnalyses;
    cfg.totalAlertsFired = (cfg.totalAlertsFired || 0) + alertsFiredThisCycle;
    await cfg.save();

    this._log('info', `Cycle done · ${totalAnalyses} analyses · ${alertsFiredThisCycle} alerts · ${cfg.lastScanDurationMs}ms`);

    // Broadcast top picks to all admin sockets (admins watching dashboard)
    if (global.broadcastToAdmins) global.broadcastToAdmins({
      type: 'forex_scan_complete',
      totalAnalyses, alertsFired: alertsFiredThisCycle,
      duration: cfg.lastScanDurationMs,
      topPicks: results.slice(0, 5).map(r => ({ symbol: r.symbol, timeframe: r.timeframe, signal: r.signal, confidence: r.confidence })),
    });

    this.running = false;
    this.scheduleNext(cfg.scannerIntervalMs);
  }

  async fireAlertsFor(analysis) {
    // Find all matching alerts
    const alerts = await ForexAlert.find({ enabled: true });
    let fired = 0;
    for (const a of alerts) {
      if (a.symbols.length && !a.symbols.includes(analysis.symbol)) continue;
      if (a.timeframes.length && !a.timeframes.includes(analysis.timeframe)) continue;
      if (!a.signals.includes(analysis.signal)) continue;
      if (analysis.confidence < a.minConfidence) continue;

      // Cooldown
      const key = `${analysis.symbol}:${analysis.timeframe}:${analysis.signal}`;
      if (a.lastFiredKey === key && a.lastTriggeredAt) {
        const elapsed = (Date.now() - a.lastTriggeredAt.getTime()) / 60_000;
        if (elapsed < a.cooldownMinutes) continue;
      }

      // Fire
      a.triggered++;
      a.lastTriggeredAt = new Date();
      a.lastFiredKey = key;
      await a.save();
      fired++;

      const payload = {
        type: 'forex_alert',
        alertId: a._id,
        symbol: analysis.symbol,
        timeframe: analysis.timeframe,
        signal: analysis.signal,
        confidence: analysis.confidence,
        probability: analysis.probability,
        entry: analysis.entry,
        stopLoss: analysis.stopLoss,
        takeProfit1: analysis.takeProfit1,
        riskReward: analysis.riskReward,
        summary: analysis.aiSummary,
      };

      // WebSocket
      if (a.channels?.websocket && global.broadcastToUser) {
        global.broadcastToUser(a.user.toString(), payload);
      }

      // Email / Telegram / Push handlers (optional integrations)
      if (a.channels?.email) {
        try {
          const user = await User.findById(a.user).select('email firstName');
          if (user?.email) {
            const mailer = require('./mailer');
            if (mailer?.sendEmail) {
              await mailer.sendEmail(user.email,
                `🤖 Signal IA Forex — ${analysis.symbol} ${analysis.timeframe}`,
                `<h2>${payload.signal.toUpperCase()} ${analysis.symbol} (${analysis.timeframe})</h2>
                 <p>Confiance: <b>${analysis.confidence}%</b> · Probabilité: ${analysis.probability}%</p>
                 <p>Entrée: <b>${analysis.entry}</b> · SL: ${analysis.stopLoss} · TP1: ${analysis.takeProfit1}</p>
                 <p>${analysis.aiSummary}</p>`,
              );
            }
          }
        } catch {}
      }
      if (a.channels?.push) {
        try {
          const pushService = require('./pushNotifications');
          if (pushService?.sendToUser) await pushService.sendToUser(a.user.toString(), {
            title: `🤖 ${payload.signal.toUpperCase()} ${analysis.symbol}`,
            body: analysis.aiSummary,
            data: payload,
          });
        } catch {}
      }
    }
    return fired;
  }
}

module.exports = new ForexScanner();
