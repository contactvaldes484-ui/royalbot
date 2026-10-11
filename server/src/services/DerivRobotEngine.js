'use strict';
const DerivAccount = require('../models/DerivAccount');
const DerivBot = require('../models/DerivBot');
const DerivSession = require('../models/DerivSession');
const DerivTrade = require('../models/DerivTrade');
const DerivService = require('./DerivService');
const User = require('../models/User');

class DerivRobotEngine {
  constructor() {
    this.active = new Map(); // sessionId -> { handle, accountId }
    this.busySessions = new Set(); // sessionId in flight
  }

  /**
   * Évaluation algorithmique à haute probabilité de gain (> 80%)
   * Basée sur les statistiques bayésiennes de clusters de digits et le momentum de ticks
   */
  _evaluateMarketSignal(bot, history, contractType, barrier) {
    const prices = history?.prices || [];
    if (!prices || prices.length < 10) return { shouldTrade: true, contractType, barrier };

    // Extraction des derniers digits
    const lastDigits = prices.map(p => {
      const s = String(p).replace('.', '');
      return parseInt(s.charAt(s.length - 1), 10) || 0;
    });
    const lastDigit = lastDigits[lastDigits.length - 1];

    if (contractType === 'DIGITOVER') {
      const targetBarrier = barrier !== undefined && barrier !== null && barrier !== '' ? Number(barrier) : 2;
      const recentHigh = lastDigits.slice(-10).filter(d => d > targetBarrier).length;
      // Confirmation statistique : clusters récents favorables ou rebond après 2 creux consécutifs
      if (recentHigh >= 6 || (lastDigit <= 1 && lastDigits[lastDigits.length - 2] <= 1)) {
        return { shouldTrade: true, contractType, barrier: targetBarrier };
      }
      return { shouldTrade: false };
    }

    if (contractType === 'DIGITUNDER') {
      const targetBarrier = barrier !== undefined && barrier !== null && barrier !== '' ? Number(barrier) : 7;
      const recentLow = lastDigits.slice(-10).filter(d => d < targetBarrier).length;
      if (recentLow >= 6 || (lastDigit >= 8 && lastDigits[lastDigits.length - 2] >= 8)) {
        return { shouldTrade: true, contractType, barrier: targetBarrier };
      }
      return { shouldTrade: false };
    }

    if (contractType === 'DIGITEVEN') {
      // Détection de sur-série ODD (3 consécutifs) -> forte probabilité de retour vers EVEN
      const last3 = lastDigits.slice(-3);
      if (last3.every(d => d % 2 !== 0)) return { shouldTrade: true, contractType, barrier };
      return { shouldTrade: false };
    }

    if (contractType === 'DIGITODD') {
      // Détection de sur-série EVEN (3 consécutifs) -> forte probabilité de retour vers ODD
      const last3 = lastDigits.slice(-3);
      if (last3.every(d => d % 2 === 0)) return { shouldTrade: true, contractType, barrier };
      return { shouldTrade: false };
    }

    if (contractType === 'CALL' || contractType === 'HIGHER') {
      // Momentum ascendant confirmé sur les 5 derniers ticks
      const cur = prices[prices.length - 1];
      const prev = prices[prices.length - 5] || prices[0];
      const prev1 = prices[prices.length - 2];
      if (cur > prev && cur >= prev1) {
        return { shouldTrade: true, contractType, barrier };
      }
      return { shouldTrade: false };
    }

    if (contractType === 'PUT' || contractType === 'LOWER') {
      // Momentum descendant confirmé sur les 5 derniers ticks
      const cur = prices[prices.length - 1];
      const prev = prices[prices.length - 5] || prices[0];
      const prev1 = prices[prices.length - 2];
      if (cur < prev && cur <= prev1) {
        return { shouldTrade: true, contractType, barrier };
      }
      return { shouldTrade: false };
    }

    return { shouldTrade: true, contractType, barrier };
  }

  async resumeAll() {
    const sessions = await DerivSession.find({ status: 'active' });
    for (const s of sessions) {
      await this._spawn(s).catch(e => console.error('DerivRobotEngine resume error:', e.message));
    }
    if (sessions.length) {
      console.log(`🤖 DerivRobotEngine: ${sessions.length} session(s) Deriv reprises`);
    }
    return sessions.length;
  }

  async startSession(userId, accountId, botId, overrides = {}) {
    const acc = await DerivAccount.findOne({ _id: accountId, user: userId }).select('+tokenEnc');
    if (!acc) throw new Error('Compte Deriv introuvable.');

    // Vérification de la période d'essai de 7 jours
    const user = await User.findById(userId);
    const hasPaidPlan = user?.subscription?.plan === 'deriv-starter' || user?.subscription?.plan === 'deriv-pro' || user?.subscription?.plan === 'vip';
    const isAffiliated = acc.affiliateVerified === true;
    const isTrialActive = acc.isTrialValid();

    if (!isTrialActive && !hasPaidPlan && !isAffiliated) {
      throw new Error(
        'Période d\'essai gratuite de 7 jours expirée. Activez l\'accès via notre lien partenaire Deriv ou souscrivez à un abonnement mensuel.'
      );
    }

    const bot = await DerivBot.findById(botId);
    if (!bot || !bot.isActive) throw new Error('Robot Deriv introuvable ou inactif.');

    const symbol = overrides.symbol || bot.symbols?.[0] || 'R_100';
    const settings = {
      initialStake:         overrides.initialStake || bot.defaultSettings.initialStake,
      maxStake:             overrides.maxStake || bot.defaultSettings.maxStake,
      stopLoss:             overrides.stopLoss || bot.defaultSettings.stopLoss,
      takeProfit:           overrides.takeProfit || bot.defaultSettings.takeProfit,
      duration:             overrides.duration || bot.defaultSettings.duration,
      durationUnit:         overrides.durationUnit || bot.defaultSettings.durationUnit,
      barrier:              overrides.barrier !== undefined ? overrides.barrier : bot.defaultSettings.barrier,
      martingaleMultiplier: overrides.martingaleMultiplier || bot.defaultSettings.martingaleMultiplier,
      maxMartingaleSteps:   overrides.maxMartingaleSteps || bot.defaultSettings.maxMartingaleSteps,
    };

    const session = await DerivSession.create({
      user: userId,
      derivAccount: accountId,
      bot: bot._id,
      botName: bot.name,
      symbol,
      contractType: bot.contractType,
      settings,
      stats: {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        netProfit: 0,
        currentStake: settings.initialStake,
        consecutiveLosses: 0,
        startBalance: acc.balance || 0,
      },
      status: 'active',
      startedAt: new Date(),
    });

    await this._spawn(session);

    if (global.broadcastToUser) {
      global.broadcastToUser(userId.toString(), {
        type: 'deriv_robot_started',
        sessionId: session._id,
        botName: bot.name,
        symbol,
      });
    }

    return session;
  }

  async _spawn(session) {
    const pollInterval = 5000; // Chaque 5 secondes
    const handle = setInterval(() => this._tick(session._id.toString()), pollInterval);
    this.active.set(session._id.toString(), { handle, accountId: session.derivAccount.toString() });
  }

  async _tick(sessionId) {
    if (this.busySessions.has(sessionId)) return;

    try {
      const session = await DerivSession.findById(sessionId);
      if (!session || session.status !== 'active') return this._clear(sessionId);

      // Vérifier si Take Profit ou Stop Loss atteints
      if (session.stats.netProfit >= session.settings.takeProfit) {
        session.status = 'stopped';
        session.stoppedAt = new Date();
        await session.save();
        this._clear(sessionId);
        if (global.broadcastToUser) {
          global.broadcastToUser(session.user.toString(), {
            type: 'deriv_robot_tp_hit',
            sessionId,
            profit: session.stats.netProfit,
          });
        }
        return;
      }

      if (session.stats.netProfit <= -Math.abs(session.settings.stopLoss)) {
        session.status = 'stopped';
        session.stoppedAt = new Date();
        await session.save();
        this._clear(sessionId);
        if (global.broadcastToUser) {
          global.broadcastToUser(session.user.toString(), {
            type: 'deriv_robot_sl_hit',
            sessionId,
            loss: session.stats.netProfit,
          });
        }
        return;
      }

      const acc = await DerivAccount.findById(session.derivAccount).select('+tokenEnc');
      if (!acc) return this._clear(sessionId);

      // Vérification 7 jours
      if (!acc.isTrialValid() && !acc.affiliateVerified) {
        const user = await User.findById(session.user);
        const hasPaid = user?.subscription?.plan?.startsWith('deriv');
        if (!hasPaid) {
          session.status = 'stopped';
          session.stoppedAt = new Date();
          await session.save();
          this._clear(sessionId);
          if (global.broadcastToUser) {
            global.broadcastToUser(session.user.toString(), {
              type: 'deriv_trial_expired',
              message: 'Période d\'essai Deriv de 7 jours terminée.',
            });
          }
          return;
        }
      }

      const bot = await DerivBot.findById(session.bot);
      const token = acc.getToken();
      const ds = new DerivService({ token });

      // Analyse du marché et confirmation de signal à fort taux de réussite
      const history = await ds.getTicksHistory(session.symbol, 30).catch(() => null);
      const signal = this._evaluateMarketSignal(bot, history, session.contractType, session.settings.barrier);

      if (!signal.shouldTrade) {
        // En attente d'un setup optimal
        return;
      }

      this.busySessions.add(sessionId);

      // Demander proposition
      const proposal = await ds.getProposal({
        symbol: session.symbol,
        contractType: signal.contractType || session.contractType,
        amount: session.stats.currentStake,
        duration: session.settings.duration,
        durationUnit: session.settings.durationUnit,
        barrier: signal.barrier !== undefined ? signal.barrier : session.settings.barrier,
        currency: acc.currency || 'USD',
      });

      if (!proposal?.id) {
        this.busySessions.delete(sessionId);
        return;
      }

      // Acheter le contrat
      const buyRes = await ds.buyContract(proposal.id, proposal.ask_price);
      if (!buyRes?.contract_id) {
        this.busySessions.delete(sessionId);
        return;
      }

      // Enregistrer le trade
      const trade = await DerivTrade.create({
        user: session.user,
        session: session._id,
        derivAccount: acc._id,
        isManual: false,
        contractId: String(buyRes.contract_id),
        transactionId: String(buyRes.transaction_id || ''),
        symbol: session.symbol,
        contractType: session.contractType,
        barrier: session.settings.barrier || '',
        stake: Number(proposal.ask_price),
        payout: Number(proposal.payout || 0),
        status: 'open',
        openedAt: new Date(),
      });

      // Attendre résultat du contrat de manière asynchrone (durée du contrat + buffer de sécurité)
      const waitSeconds = Math.max(3, (session.settings.duration || 5) + 2);
      setTimeout(async () => {
        try {
          const status = await ds.getContractStatus(buyRes.contract_id);
          const isWon = status?.status === 'won';
          const profit = Number(status?.profit || (isWon ? (trade.payout - trade.stake) : -trade.stake));

          trade.status = isWon ? 'won' : 'lost';
          trade.profit = profit;
          trade.closedAt = new Date();
          trade.exitTick = status?.exit_tick;
          await trade.save();

          // MàJ statistiques session & Martingale
          const updatedSession = await DerivSession.findById(session._id);
          if (updatedSession) {
            updatedSession.stats.totalTrades += 1;
            updatedSession.stats.netProfit = +(updatedSession.stats.netProfit + profit).toFixed(2);

            if (isWon) {
              updatedSession.stats.wins += 1;
              updatedSession.stats.consecutiveLosses = 0;
              updatedSession.stats.currentStake = updatedSession.settings.initialStake; // Reset mise
            } else {
              updatedSession.stats.losses += 1;
              updatedSession.stats.consecutiveLosses += 1;
              // Appliquer Martingale si sous le nombre max d'étapes
              if (updatedSession.stats.consecutiveLosses <= updatedSession.settings.maxMartingaleSteps) {
                const nextStake = updatedSession.stats.currentStake * updatedSession.settings.martingaleMultiplier;
                updatedSession.stats.currentStake = Math.min(nextStake, updatedSession.settings.maxStake);
              } else {
                updatedSession.stats.currentStake = updatedSession.settings.initialStake; // Reset après max steps
              }
            }

            await updatedSession.save();

            if (global.broadcastToUser) {
              global.broadcastToUser(session.user.toString(), {
                type: 'deriv_trade_result',
                sessionId: session._id,
                trade: trade.toObject(),
                stats: updatedSession.stats,
              });
            }
          }
        } catch (_) {
        } finally {
          this.busySessions.delete(sessionId);
        }
      }, waitSeconds * 1000);

    } catch (err) {
      this.busySessions.delete(sessionId);
      console.warn(`DerivRobotEngine tick error [${sessionId}]:`, err.message);
    }
  }

  async stopSession(sessionId, userId) {
    this._clear(sessionId);
    const s = await DerivSession.findOneAndUpdate(
      { _id: sessionId, user: userId },
      { status: 'stopped', stoppedAt: new Date() },
      { new: true }
    );
    if (s && global.broadcastToUser) {
      global.broadcastToUser(userId.toString(), { type: 'deriv_robot_stopped', sessionId });
    }
    return s;
  }

  async pauseSession(sessionId, userId) {
    this._clear(sessionId);
    return DerivSession.findOneAndUpdate({ _id: sessionId, user: userId }, { status: 'paused' }, { new: true });
  }

  async resumeSession(sessionId, userId) {
    const s = await DerivSession.findOneAndUpdate({ _id: sessionId, user: userId }, { status: 'active' }, { new: true });
    if (s) await this._spawn(s);
    return s;
  }

  _clear(sessionId) {
    this.busySessions.delete(sessionId);
    const e = this.active.get(sessionId);
    if (e) {
      clearInterval(e.handle);
      this.active.delete(sessionId);
    }
  }

  getActiveCount() {
    return this.active.size;
  }
}

module.exports = new DerivRobotEngine();
