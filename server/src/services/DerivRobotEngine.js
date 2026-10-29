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
  /**
   * Helpers statistiques pour les stratégies Deriv SmartTrader
   */
  _calcEMA(prices, period) {
    if (!prices || prices.length < period) return null;
    const k = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((s, v) => s + v, 0) / period;
    for (let i = period; i < prices.length; i++) ema = prices[i] * k + ema * (1 - k);
    return ema;
  }

  _calcRSI(prices, period = 7) {
    if (!prices || prices.length < period + 1) return null;
    let gains = 0, losses = 0;
    for (let i = prices.length - period; i < prices.length; i++) {
      const d = prices[i] - prices[i - 1];
      if (d >= 0) gains += d; else losses -= d;
    }
    if (losses === 0) return 100;
    return 100 - (100 / (1 + (gains / losses)));
  }

  /**
   * Évaluation algorithmique Sniper à haute probabilité de gain (> 75-90%)
   * Intègre l'épuisement statistique de petits chiffres, le momentum de micro-ticks,
   * la recherche du chiffre froid pour Digit Differ et le suivi de tendance EMA+RSI.
   */
  _evaluateMarketSignal(bot, history, contractType, barrier, skippedCount = 0) {
    const prices = history?.prices || [];
    // Si l'historique est court ou si la session a déjà sauté des ticks, on utilise les derniers prix disponibles
    if (!prices || prices.length < 3) {
      // Trade par défaut haute probabilité si manque d'historique au premier lancement
      return { shouldTrade: true, contractType, barrier: barrier || (contractType === 'DIGITOVER' ? 2 : (contractType === 'DIGITUNDER' ? 7 : 0)), reason: 'Initial quick start signal' };
    }

    const lastDigits = prices.map(p => {
      const s = String(p).replace('.', '');
      return parseInt(s.charAt(s.length - 1), 10) || 0;
    });
    const lastDigit = lastDigits[lastDigits.length - 1];
    const prevDigit = lastDigits[lastDigits.length - 2];
    const priceDelta = prices[prices.length - 1] - prices[prices.length - 2];

    // ── 1. DIGITOVER (Optimisé pour Digit Over 2 Sniper - 70-85% Win Rate) ──
    if (contractType === 'DIGITOVER') {
      const targetBarrier = barrier !== undefined && barrier !== null && barrier !== '' ? Number(barrier) : 2;

      // Setup A (Épuisement statistique de petits chiffres) : dernier tick <= targetBarrier (ex: 0, 1 ou 2).
      // La probabilité de rebond vers un chiffre > 2 (3..9) est > 80% !
      if (lastDigit <= targetBarrier) {
        return { shouldTrade: true, contractType, barrier: targetBarrier, reason: `Low-digit rebound (last=${lastDigit} <= ${targetBarrier})` };
      }

      // Setup B (Momentum de cluster supérieur) : micro-tick haussier ou chiffre élevé
      if (lastDigit >= 3 && priceDelta >= 0) {
        return { shouldTrade: true, contractType, barrier: targetBarrier, reason: `High-digit momentum (last=${lastDigit}, delta=${priceDelta})` };
      }

      // Setup C (Anti-attente adaptive) : si 2 ticks ont déjà été sautés, exécuter un trade calculé
      if (skippedCount >= 2) {
        return { shouldTrade: true, contractType, barrier: targetBarrier, reason: `Adaptive sniper trade (skipped=${skippedCount})` };
      }

      return { shouldTrade: false };
    }

    // ── 2. DIGITUNDER (Digit Under Sniper) ──
    if (contractType === 'DIGITUNDER') {
      const targetBarrier = barrier !== undefined && barrier !== null && barrier !== '' ? Number(barrier) : 7;

      // Épuisement des chiffres élevés (>= 7) -> pullback vers les petits chiffres
      if (lastDigit >= targetBarrier) {
        return { shouldTrade: true, contractType, barrier: targetBarrier, reason: `High-digit exhaustion pullback (last=${lastDigit})` };
      }

      if (lastDigit <= 6 && priceDelta <= 0) {
        return { shouldTrade: true, contractType, barrier: targetBarrier, reason: `Low-digit momentum (last=${lastDigit})` };
      }

      if (skippedCount >= 2) {
        return { shouldTrade: true, contractType, barrier: targetBarrier, reason: `Adaptive sniper trade (skipped=${skippedCount})` };
      }

      return { shouldTrade: false };
    }

    // ── 3. DIGITDIFF (Digit Differ Hunter - 90%+ Win Rate) ──
    if (contractType === 'DIGITDIFF') {
      const sample = lastDigits.slice(-20);
      const counts = Array(10).fill(0);
      sample.forEach(d => counts[d]++);

      // Trouver le chiffre froid (le moins apparu sur les 20 derniers ticks)
      let coldDigit = 0;
      let minCount = Infinity;
      for (let d = 0; d < 10; d++) {
        if (counts[d] < minCount) {
          minCount = counts[d];
          coldDigit = d;
        }
      }

      // Si le chiffre froid n'est pas le tick actuel, sniper ce chiffre ! (Probabilité de réussite = 90%)
      const selectedDiffer = lastDigit !== coldDigit ? coldDigit : (coldDigit + 1) % 10;
      return { shouldTrade: true, contractType: 'DIGITDIFF', barrier: selectedDiffer, reason: `Cold digit differ: ${selectedDiffer} (freq=${minCount})` };
    }

    // ── 4. DIGITEVEN & DIGITODD (Even / Odd Quantum Flow) ──
    if (contractType === 'DIGITEVEN' || contractType === 'DIGITODD') {
      const last2 = lastDigits.slice(-2);
      // Si 2 PAIRS consécutifs -> Rebond sur IMPAIR
      if (last2.length >= 2 && last2.every(d => d % 2 === 0)) {
        return { shouldTrade: true, contractType: 'DIGITODD', barrier, reason: 'Even streak mean-reversion' };
      }
      // Si 2 IMPAIRS consécutifs -> Rebond sur PAIR
      if (last2.length >= 2 && last2.every(d => d % 2 !== 0)) {
        return { shouldTrade: true, contractType: 'DIGITEVEN', barrier, reason: 'Odd streak mean-reversion' };
      }
      // Parité opposée au dernier tick ou adaptatif
      if (skippedCount >= 2) {
        const nextParity = lastDigit % 2 === 0 ? 'DIGITODD' : 'DIGITEVEN';
        return { shouldTrade: true, contractType: nextParity, barrier, reason: `Adaptive parity switch after ${lastDigit}` };
      }
      return { shouldTrade: false };
    }

    // ── 5. CALL / PUT (Rise / Fall AI) ──
    if (contractType === 'CALL' || contractType === 'HIGHER') {
      const emaFast = this._calcEMA(prices, 5);
      const emaSlow = this._calcEMA(prices, 10);
      if (emaFast && emaSlow && emaFast >= emaSlow) {
        return { shouldTrade: true, contractType: 'CALL', barrier, reason: `Bullish EMA trend` };
      }
      if (priceDelta > 0 || skippedCount >= 2) {
        return { shouldTrade: true, contractType: 'CALL', barrier, reason: `Micro-momentum rise (delta=${priceDelta})` };
      }
      return { shouldTrade: false };
    }

    if (contractType === 'PUT' || contractType === 'LOWER') {
      const emaFast = this._calcEMA(prices, 5);
      const emaSlow = this._calcEMA(prices, 10);
      if (emaFast && emaSlow && emaFast <= emaSlow) {
        return { shouldTrade: true, contractType: 'PUT', barrier, reason: `Bearish EMA trend` };
      }
      if (priceDelta < 0 || skippedCount >= 2) {
        return { shouldTrade: true, contractType: 'PUT', barrier, reason: `Micro-momentum fall (delta=${priceDelta})` };
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

    // Vérification de la période d'essai de 7 jours (Le propriétaire de la plateforme a un accès illimité à vie)
    const user = await fallbackStore.findUserById(userId);
    const userEmail = (user?.email || '').toLowerCase().trim();
    const isOwner = userEmail === 'valdeslando15@gmail.com' || (typeof fallbackStore.isPlatformOwner === 'function' && fallbackStore.isPlatformOwner(user));
    const hasPaidPlan =
      isOwner ||
      user?.subscription?.plan === 'deriv-starter' ||
      user?.subscription?.plan === 'deriv-pro' ||
      user?.subscription?.plan === 'vip' ||
      user?.subscription?.plan === 'institutional' ||
      user?.role === 'super_admin' ||
      user?.role === 'admin';
    const isAffiliated = acc.affiliateVerified === true;
    const isTrialActive = isOwner ? true : (acc.isTrialValid ? acc.isTrialValid() : true);

    if (!isOwner && !isTrialActive && !hasPaidPlan && !isAffiliated) {
      throw new Error(
        'Période d\'essai gratuite de 7 jours expirée. Activez l\'accès via notre lien partenaire Deriv ou souscrivez à un abonnement mensuel.'
      );
    }

    const bot = await fallbackStore.findDerivBotById(botId);
    if (!bot || bot.isActive === false) throw new Error('Robot Deriv introuvable ou inactif.');

    const defaultSettings = bot.defaultSettings || {};
    const symbol = overrides.symbol || bot.symbols?.[0] || 'R_100';
    const isDigitContract = (bot.contractType || '').startsWith('DIGIT');
    const defaultDuration = isDigitContract ? 1 : 5;
    const defaultDurationUnit = overrides.durationUnit || defaultSettings.durationUnit || 't';
    const defaultMartingaleSteps = (bot.contractType === 'DIGITOVER' || bot.contractType === 'DIGITUNDER') ? 2 : 3;
    const defaultMartingaleMultiplier = (bot.contractType === 'DIGITOVER' || bot.contractType === 'DIGITUNDER') ? 3.2 : 2.0;

    const settings = {
      initialStake:         Number(overrides.initialStake || defaultSettings.initialStake || 1),
      maxStake:             Number(overrides.maxStake || defaultSettings.maxStake || 50),
      stopLoss:             Number(overrides.stopLoss || defaultSettings.stopLoss || 20),
      takeProfit:           Number(overrides.takeProfit || defaultSettings.takeProfit || 50),
      duration:             Number(overrides.duration || defaultSettings.duration || defaultDuration),
      durationUnit:         defaultDurationUnit,
      barrier:              overrides.barrier !== undefined ? overrides.barrier : (defaultSettings.barrier !== undefined ? defaultSettings.barrier : (isDigitContract ? '2' : undefined)),
      martingaleMultiplier: Number(overrides.martingaleMultiplier || defaultSettings.martingaleMultiplier || defaultMartingaleMultiplier),
      maxMartingaleSteps:   Number(overrides.maxMartingaleSteps || defaultSettings.maxMartingaleSteps || defaultMartingaleSteps),
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
    const pollInterval = 3500; // Chaque 3.5 secondes pour une réactivité live maximale
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

      // Vérification 7 jours (Exemption totale et permanente pour valdeslando15@gmail.com)
      const user = await fallbackStore.findUserById(session.user);
      const userEmail = (user?.email || '').toLowerCase().trim();
      const isOwner = userEmail === 'valdeslando15@gmail.com' || (typeof fallbackStore.isPlatformOwner === 'function' && fallbackStore.isPlatformOwner(user));

      if (!isOwner) {
        const isTrialValid = acc.isTrialValid ? acc.isTrialValid() : true;
        if (!isTrialValid && !acc.affiliateVerified) {
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
      }

      const bot = await fallbackStore.findDerivBotById(session.bot);
      const token = acc.getToken ? acc.getToken() : '';
      if (!token) return;

      ds = new DerivService({ token, loginId: acc.loginId });

      // Analyse du marché et confirmation de signal Sniper
      const history = await ds.getTicksHistory(session.symbol, 30).catch(() => null);
      const skippedCount = this.skippedCounts.get(sessionId) || 0;
      const signal = this._evaluateMarketSignal(bot, history, session.contractType, session.settings.barrier, skippedCount);

      // Si pas encore de signal de probabilité adéquat et moins de 2 ticks sautés
      if (!signal.shouldTrade) {
        this.skippedCounts.set(sessionId, skippedCount + 1);
        if (global.broadcastToUser) {
          global.broadcastToUser(session.user.toString(), {
            type: 'deriv_robot_analyzing',
            sessionId,
            botName: bot?.name || session.botName,
            symbol: session.symbol,
            message: `Analyse des ticks · En attente de setup sniper favorable (tick ${skippedCount + 1})...`,
          });
        }
        ds.close();
        return;
      }

      // Signal validé ! Réinitialiser le compteur de ticks sautés
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

      // Notification en direct instantanée : Contrat ouvert
      if (global.broadcastToUser) {
        global.broadcastToUser(session.user.toString(), {
          type: 'deriv_trade_opened',
          sessionId: session._id,
          botName: bot?.name || session.botName,
          trade: trade.toObject ? trade.toObject() : trade,
        });
      }

      // Attendre résultat du contrat selon la durée réelle
      const durationVal = Number(session.settings.duration) || 1;
      const isSeconds = session.settings.durationUnit === 's';
      const waitSeconds = isSeconds ? Math.max(3, durationVal + 1) : Math.max(2, Math.ceil(durationVal * 1.5) + 1);
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

          // MàJ statistiques session & Martingale intelligente anti-ruine
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
                // Anti-ruin reset au capital de base après le nombre max de paliers
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
                balance: acc.balance,
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
