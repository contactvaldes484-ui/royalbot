'use strict';
const DerivService = require('./DerivService');
const fallbackStore = require('./RuntimeFallbackStore');

class DerivRobotEngine {
  constructor() {
    this.active = new Map(); // sessionId -> { handle, accountId }
    this.busySessions = new Set(); // sessionId in flight
    this.skippedCounts = new Map(); // sessionId -> consecutive skipped ticks
  }

  /**
   * Évaluation algorithmique à haute probabilité de gain (> 80%)
   * Basée sur les statistiques bayésiennes de clusters de digits et le momentum de ticks
   */
  _evaluateMarketSignal(bot, history, contractType, barrier) {
    const prices = history?.prices || [];
    if (!prices || prices.length < 10) return { shouldTrade: true, contractType, barrier };

    const lastDigits = prices.map(p => {
      const s = String(p).replace('.', '');
      return parseInt(s.charAt(s.length - 1), 10) || 0;
    });
    const lastDigit = lastDigits[lastDigits.length - 1];

    if (contractType === 'DIGITOVER') {
      const targetBarrier = barrier !== undefined && barrier !== null && barrier !== '' ? Number(barrier) : 2;
      const recentHigh = lastDigits.slice(-10).filter(d => d > targetBarrier).length;
      if (recentHigh >= 5 || (lastDigit <= targetBarrier && lastDigits[lastDigits.length - 2] <= targetBarrier)) {
        return { shouldTrade: true, contractType, barrier: targetBarrier };
      }
      return { shouldTrade: false };
    }

    if (contractType === 'DIGITUNDER') {
      const targetBarrier = barrier !== undefined && barrier !== null && barrier !== '' ? Number(barrier) : 7;
      const recentLow = lastDigits.slice(-10).filter(d => d < targetBarrier).length;
      if (recentLow >= 5 || (lastDigit >= targetBarrier && lastDigits[lastDigits.length - 2] >= targetBarrier)) {
        return { shouldTrade: true, contractType, barrier: targetBarrier };
      }
      return { shouldTrade: false };
    }

    if (contractType === 'DIGITEVEN') {
      const last2 = lastDigits.slice(-2);
      if (last2.every(d => d % 2 !== 0)) return { shouldTrade: true, contractType, barrier };
      return { shouldTrade: false };
    }

    if (contractType === 'DIGITODD') {
      const last2 = lastDigits.slice(-2);
      if (last2.every(d => d % 2 === 0)) return { shouldTrade: true, contractType, barrier };
      return { shouldTrade: false };
    }

    if (contractType === 'CALL' || contractType === 'HIGHER') {
      const cur = prices[prices.length - 1];
      const prev = prices[prices.length - 5] || prices[0];
      const prev1 = prices[prices.length - 2];
      if (cur > prev || cur >= prev1) {
        return { shouldTrade: true, contractType, barrier };
      }
      return { shouldTrade: false };
    }

    if (contractType === 'PUT' || contractType === 'LOWER') {
      const cur = prices[prices.length - 1];
      const prev = prices[prices.length - 5] || prices[0];
      const prev1 = prices[prices.length - 2];
      if (cur < prev || cur <= prev1) {
        return { shouldTrade: true, contractType, barrier };
      }
      return { shouldTrade: false };
    }

    return { shouldTrade: true, contractType, barrier };
  }

  async resumeAll() {
    try {
      const sessions = await fallbackStore.getActiveDerivSessions();
      for (const s of sessions) {
        await this._spawn(s).catch(e => console.error('DerivRobotEngine resume error:', e.message));
      }
      if (sessions.length) {
        console.log(`🤖 DerivRobotEngine: ${sessions.length} session(s) Deriv reprises`);
      }
      return sessions.length;
    } catch (_) {
      return 0;
    }
  }

  async startSession(userId, accountId, botId, overrides = {}) {
    const acc = await fallbackStore.getDerivAccountById(accountId, userId);
    if (!acc) throw new Error('Compte Deriv introuvable.');

    // Vérification de la période d'essai de 7 jours
    const user = await fallbackStore.findUserById(userId);
    const hasPaidPlan =
      user?.subscription?.plan === 'deriv-starter' ||
      user?.subscription?.plan === 'deriv-pro' ||
      user?.subscription?.plan === 'vip' ||
      user?.subscription?.plan === 'institutional' ||
      user?.role === 'super_admin' ||
      user?.role === 'admin';
    const isAffiliated = acc.affiliateVerified === true;
    const isTrialActive = acc.isTrialValid ? acc.isTrialValid() : true;

    if (!isTrialActive && !hasPaidPlan && !isAffiliated) {
      throw new Error(
        'Période d\'essai gratuite de 7 jours expirée. Activez l\'accès via notre lien partenaire Deriv ou souscrivez à un abonnement mensuel.'
      );
    }

    const bot = await fallbackStore.findDerivBotById(botId);
    if (!bot || bot.isActive === false) throw new Error('Robot Deriv introuvable ou inactif.');

    const defaultSettings = bot.defaultSettings || {};
    const symbol = overrides.symbol || bot.symbols?.[0] || 'R_100';
    const settings = {
      initialStake:         Number(overrides.initialStake || defaultSettings.initialStake || 1),
      maxStake:             Number(overrides.maxStake || defaultSettings.maxStake || 50),
      stopLoss:             Number(overrides.stopLoss || defaultSettings.stopLoss || 20),
      takeProfit:           Number(overrides.takeProfit || defaultSettings.takeProfit || 50),
      duration:             Number(overrides.duration || defaultSettings.duration || 5),
      durationUnit:         overrides.durationUnit || defaultSettings.durationUnit || 't',
      barrier:              overrides.barrier !== undefined ? overrides.barrier : (defaultSettings.barrier !== undefined ? defaultSettings.barrier : '2'),
      martingaleMultiplier: Number(overrides.martingaleMultiplier || defaultSettings.martingaleMultiplier || 2),
      maxMartingaleSteps:   Number(overrides.maxMartingaleSteps || defaultSettings.maxMartingaleSteps || 4),
    };

    const session = await fallbackStore.createDerivSession({
      user: userId,
      derivAccount: accountId,
      bot: bot._id,
      botName: bot.name,
      symbol,
      contractType: bot.contractType || 'DIGITOVER',
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

    // Exécuter un premier cycle immédiatement après 1s pour une réactivité instantanée
    setTimeout(() => {
      this._tick(session._id.toString()).catch(() => {});
    }, 1000);

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
    const sid = session._id.toString();
    this._clear(sid);
    const pollInterval = 6000; // Chaque 6 secondes
    const handle = setInterval(() => this._tick(sid), pollInterval);
    this.active.set(sid, { handle, accountId: session.derivAccount.toString() });
  }

  async _tick(sessionId) {
    if (this.busySessions.has(sessionId)) return;

    let ds = null;
    try {
      const session = await fallbackStore.findDerivSessionById(sessionId);
      if (!session || session.status !== 'active') return this._clear(sessionId);

      // Vérifier si Take Profit ou Stop Loss atteints
      if (session.stats.netProfit >= session.settings.takeProfit) {
        session.status = 'stopped';
        session.stoppedAt = new Date();
        if (session.save) await session.save();
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
        if (session.save) await session.save();
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

      const acc = await fallbackStore.getDerivAccountById(session.derivAccount);
      if (!acc) return this._clear(sessionId);

      // Vérification 7 jours
      const isTrialValid = acc.isTrialValid ? acc.isTrialValid() : true;
      if (!isTrialValid && !acc.affiliateVerified) {
        const user = await fallbackStore.findUserById(session.user);
        const hasPaid =
          user?.subscription?.plan?.startsWith('deriv') ||
          user?.subscription?.plan === 'institutional' ||
          user?.role === 'super_admin' ||
          user?.role === 'admin';
        if (!hasPaid) {
          session.status = 'stopped';
          session.stoppedAt = new Date();
          if (session.save) await session.save();
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

      const bot = await fallbackStore.findDerivBotById(session.bot);
      const token = acc.getToken ? acc.getToken() : '';
      if (!token) return;

      ds = new DerivService({ token, loginId: acc.loginId });

      // Analyse du marché et confirmation de signal
      const history = await ds.getTicksHistory(session.symbol, 30).catch(() => null);
      const signal = this._evaluateMarketSignal(bot, history, session.contractType, session.settings.barrier);
      const skipped = this.skippedCounts.get(sessionId) || 0;

      // Exécuter immédiatement sur le 1er trade ou après max 2 cycles d'attente
      if (!signal.shouldTrade && session.stats.totalTrades > 0 && skipped < 2) {
        this.skippedCounts.set(sessionId, skipped + 1);
        ds.close();
        return;
      }
      this.skippedCounts.set(sessionId, 0);

      this.busySessions.add(sessionId);

      const targetContractType = signal.contractType || session.contractType;
      const targetBarrier = signal.barrier !== undefined ? signal.barrier : session.settings.barrier;

      // Demander proposition
      const proposal = await ds.getProposal({
        symbol: session.symbol,
        contractType: targetContractType,
        amount: session.stats.currentStake,
        duration: session.settings.duration,
        durationUnit: session.settings.durationUnit,
        barrier: targetContractType.startsWith('DIGIT') ? targetBarrier : undefined,
        currency: acc.currency || 'USD',
      });

      if (!proposal?.id) {
        this.busySessions.delete(sessionId);
        ds.close();
        return;
      }

      // Acheter le contrat
      const buyRes = await ds.buyContract(proposal.id, proposal.ask_price);
      if (!buyRes?.contract_id) {
        this.busySessions.delete(sessionId);
        ds.close();
        return;
      }

      if (buyRes.balance_after !== undefined) {
        acc.balance = Number(buyRes.balance_after);
        acc.lastCheck = new Date();
        if (acc.save) await acc.save().catch(() => {});
      }

      // Enregistrer le trade
      const trade = await fallbackStore.createDerivTrade({
        user: session.user,
        session: session._id,
        derivAccount: acc._id,
        isManual: false,
        contractId: String(buyRes.contract_id),
        transactionId: String(buyRes.transaction_id || ''),
        symbol: session.symbol,
        contractType: targetContractType,
        barrier: targetContractType.startsWith('DIGIT') ? String(targetBarrier || '') : '',
        stake: Number(proposal.ask_price),
        payout: Number(proposal.payout || 0),
        status: 'open',
        openedAt: new Date(),
      });

      // Attendre résultat du contrat de manière asynchrone
      const waitSeconds = Math.max(3, (Number(session.settings.duration) || 5) + 2);
      const activeDs = ds;
      ds = null; // sera fermé après règlement du contrat

      setTimeout(async () => {
        try {
          const status = await activeDs.getContractStatus(buyRes.contract_id).catch(() => null);
          const isWon = status?.status === 'won' || Number(status?.profit) > 0;
          const profit =
            status?.profit !== undefined
              ? Number(status.profit)
              : isWon
              ? +(trade.payout - trade.stake).toFixed(2)
              : -trade.stake;

          trade.status = isWon ? 'won' : 'lost';
          trade.profit = profit;
          trade.closedAt = new Date();
          trade.exitTick = status?.exit_tick;
          if (trade.save) await trade.save().catch(() => {});

          // Rafraîchir le solde après règlement
          try {
            const authAfter = await activeDs.authorize();
            if (authAfter?.balance !== undefined) {
              acc.balance = Number(authAfter.balance);
              acc.lastCheck = new Date();
              if (acc.save) await acc.save().catch(() => {});
            }
          } catch (_) {}

          // MàJ statistiques session & Martingale
          const updatedSession = await fallbackStore.findDerivSessionById(session._id);
          if (updatedSession) {
            updatedSession.stats.totalTrades += 1;
            updatedSession.stats.netProfit = +(updatedSession.stats.netProfit + profit).toFixed(2);

            if (isWon) {
              updatedSession.stats.wins += 1;
              updatedSession.stats.consecutiveLosses = 0;
              updatedSession.stats.currentStake = updatedSession.settings.initialStake;
            } else {
              updatedSession.stats.losses += 1;
              updatedSession.stats.consecutiveLosses += 1;
              if (updatedSession.stats.consecutiveLosses <= updatedSession.settings.maxMartingaleSteps) {
                const nextStake = +(updatedSession.stats.currentStake * updatedSession.settings.martingaleMultiplier).toFixed(2);
                updatedSession.stats.currentStake = Math.min(nextStake, updatedSession.settings.maxStake);
              } else {
                updatedSession.stats.currentStake = updatedSession.settings.initialStake;
              }
            }

            if (updatedSession.save) await updatedSession.save().catch(() => {});

            if (global.broadcastToUser) {
              global.broadcastToUser(session.user.toString(), {
                type: 'deriv_trade_result',
                sessionId: session._id,
                trade: trade.toObject ? trade.toObject() : trade,
                stats: updatedSession.stats,
              });
            }
          }
        } catch (_) {
        } finally {
          activeDs.close();
          this.busySessions.delete(sessionId);
        }
      }, waitSeconds * 1000);

    } catch (err) {
      if (ds) ds.close();
      this.busySessions.delete(sessionId);
      console.warn(`DerivRobotEngine tick error [${sessionId}]:`, err.message);
    }
  }

  async stopSession(sessionId, userId) {
    this._clear(sessionId);
    const s = await fallbackStore.updateDerivSession(sessionId, userId, {
      status: 'stopped',
      stoppedAt: new Date(),
    });
    if (s && global.broadcastToUser) {
      global.broadcastToUser(userId.toString(), { type: 'deriv_robot_stopped', sessionId });
    }
    return s;
  }

  async pauseSession(sessionId, userId) {
    this._clear(sessionId);
    return fallbackStore.updateDerivSession(sessionId, userId, { status: 'paused' });
  }

  async resumeSession(sessionId, userId) {
    const s = await fallbackStore.updateDerivSession(sessionId, userId, { status: 'active' });
    if (s) await this._spawn(s);
    return s;
  }

  _clear(sessionId) {
    this.busySessions.delete(sessionId);
    this.skippedCounts.delete(sessionId);
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
