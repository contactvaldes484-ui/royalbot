'use strict';
const DerivService = require('./DerivService');
const fallbackStore = require('./RuntimeFallbackStore');

class DerivRobotEngine {
  constructor() {
    this.active = new Map(); // sessionId -> { handle, accountId }
    this.busySessions = new Set(); // sessionId in flight
    this.skippedCounts = new Map(); // sessionId -> consecutive skipped ticks
    this.virtualStates = new Map(); // sessionId -> { inVirtualMode, virtualLosses, virtualWins, virtualStreak }
    this.stopRequestedAt = new Map(); // sessionId -> timestamp (ms) when stop was requested
  }

  /**
   * Simulation mathématique universelle de contrat Deriv sur l'historique de ticks
   * Permet d'exécuter le mode Virtual Hook / Paper Trading avant de miser de l'argent réel
   */
  _simulateContract(contractType, prices, duration = 1, barrier) {
    if (!prices || prices.length < duration + 1) return null;
    const dur = Math.max(1, duration || 1);
    const currentPrice = prices[prices.length - 1];
    const entryPrice = prices[prices.length - 1 - dur];

    if (contractType === 'RUNLOW') {
      // Pour gagner RUNLOW : chaque tick doit être strictement inférieur au précédent
      for (let i = prices.length - dur; i < prices.length; i++) {
        if (prices[i] >= prices[i - 1]) return false;
      }
      return true;
    }
    if (contractType === 'RUNHIGH') {
      // Pour gagner RUNHIGH : chaque tick doit être strictement supérieur au précédent
      for (let i = prices.length - dur; i < prices.length; i++) {
        if (prices[i] <= prices[i - 1]) return false;
      }
      return true;
    }
    if (contractType === 'CALL' || contractType === 'HIGHER') {
      return currentPrice > entryPrice;
    }
    if (contractType === 'PUT' || contractType === 'LOWER') {
      return currentPrice < entryPrice;
    }
    const pipSize = Math.max(2, ...prices.map(p => (String(p).split('.')[1] || '').length));
    const lastDigitOf = (val) => {
      const s = Number(val).toFixed(pipSize).replace('.', '');
      return parseInt(s.charAt(s.length - 1), 10) || 0;
    };
    if (contractType === 'DIGITOVER') {
      const d = lastDigitOf(currentPrice);
      return d > Number(barrier !== undefined && barrier !== null ? barrier : 2);
    }
    if (contractType === 'DIGITUNDER') {
      const d = lastDigitOf(currentPrice);
      return d < Number(barrier !== undefined && barrier !== null ? barrier : 7);
    }
    if (contractType === 'DIGITDIFF') {
      const d = lastDigitOf(currentPrice);
      return d !== Number(barrier);
    }
    if (contractType === 'DIGITMATCH') {
      const d = lastDigitOf(currentPrice);
      return d === Number(barrier);
    }
    if (contractType === 'DIGITEVEN') {
      const d = lastDigitOf(currentPrice);
      return d % 2 === 0;
    }
    if (contractType === 'DIGITODD') {
      const s = String(currentPrice).replace('.', '');
      const d = parseInt(s.charAt(s.length - 1), 10) || 0;
      return d % 2 !== 0;
    }
    return false;
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
  _evaluateMarketSignal(bot, history, contractType, barrier, skippedCount = 0, session = null) {
    const prices = history?.prices || [];
    // Si l'historique est court, appliquer malgré tout le changement de barrière de récupération pour les robots importés
    if (!prices || prices.length < 3) {
      const consecutiveLosses = Number(session?.stats?.consecutiveLosses || 0);
      const unrecoveredLoss = Number(session?.stats?.unrecoveredLoss || 0);
      const inRecovery = consecutiveLosses >= 1 || unrecoveredLoss > 0.02;
      let fallbackBarrier = barrier !== undefined && barrier !== null && barrier !== '' ? Number(barrier) : (contractType === 'DIGITOVER' ? 2 : (contractType === 'DIGITUNDER' ? 8 : 0));
      if (contractType === 'DIGITUNDER' && fallbackBarrier <= 2) fallbackBarrier = 8;
      if (inRecovery) {
        if (bot?.parsedLogic?.recoveryBarrier !== undefined) {
          fallbackBarrier = Number(bot.parsedLogic.recoveryBarrier);
        } else if (contractType === 'DIGITUNDER' && fallbackBarrier >= 7) {
          fallbackBarrier = 6;
        } else if (contractType === 'DIGITOVER' && fallbackBarrier <= 2) {
          fallbackBarrier = 4;
        }
      }
      return { shouldTrade: true, contractType, barrier: fallbackBarrier, reason: 'Initial quick start signal' };
    }

    const pipSize = Math.max(2, ...prices.map(p => (String(p).split('.')[1] || '').length));
    const lastDigits = prices.map(p => {
      const s = Number(p).toFixed(pipSize).replace('.', '');
      return parseInt(s.charAt(s.length - 1), 10) || 0;
    });
    const lastDigit = lastDigits[lastDigits.length - 1];
    const prevDigit = lastDigits[lastDigits.length - 2];
    const priceDelta = prices[prices.length - 1] - prices[prices.length - 2];

    // Projection quantique du prochain tick (P_hat = P_t + vélocité pondérée 3-ticks) et extraction du chiffre projeté d_hat
    const d1 = prices[prices.length - 1] - prices[prices.length - 2];
    const d2 = prices.length >= 3 ? prices[prices.length - 2] - prices[prices.length - 3] : d1;
    const d3 = prices.length >= 4 ? prices[prices.length - 3] - prices[prices.length - 4] : d2;
    const expectedVelocity = 0.5 * d1 + 0.3 * d2 + 0.2 * d3;
    const projectedNextPrice = Number(prices[prices.length - 1]) + expectedVelocity;
    const projStr = projectedNextPrice.toFixed(pipSize).replace('.', '');
    const projectedDigit = parseInt(projStr.charAt(projStr.length - 1), 10) || 0;

    // ── Logique personnalisée Super-Admin (injectable sur n'importe quel robot) ──
    const customCode = bot?.defaultSettings?.customLogicCode || bot?.customLogicCode;
    if (customCode && typeof customCode === 'string' && customCode.trim().length > 0) {
      try {
        const customFn = new Function('prices', 'lastDigits', 'lastDigit', 'prevDigit', 'priceDelta', 'contractType', 'barrier', 'skippedCount', customCode);
        const res = customFn(prices, lastDigits, lastDigit, prevDigit, priceDelta, contractType, barrier, skippedCount);
        if (res && typeof res === 'object' && res.shouldTrade !== undefined) {
          return {
            shouldTrade: Boolean(res.shouldTrade),
            contractType: res.contractType || contractType,
            barrier: res.barrier !== undefined ? res.barrier : barrier,
            reason: res.reason || 'Logique personnalisée Super-Admin',
          };
        }
      } catch (err) {
        console.warn(`[DerivRobotEngine] Erreur logique custom sur ${bot?.name || bot?.slug}:`, err.message);
      }
    }

    // ── 1. DIGITOVER (Respect strict des XML importés + Sniper Élite pour les robots natifs) ──
    if (contractType === 'DIGITOVER') {
      const baseBarrier = barrier !== undefined && barrier !== null && barrier !== '' ? Number(barrier) : 2;
      const consecutiveLosses = Number(session?.stats?.consecutiveLosses || 0);
      const unrecoveredLoss = Number(session?.stats?.unrecoveredLoss || 0);
      const inRecovery = consecutiveLosses >= 1 || unrecoveredLoss > 0.02;
      const isImportedXmlBot = bot?.strategyType === 'file_custom' || bot?.fileType === 'xml' || bot?.fileType === 'json';

      if (isImportedXmlBot) {
        let xmlBarrier = baseBarrier;
        if (inRecovery) {
          xmlBarrier = bot?.parsedLogic?.recoveryBarrier !== undefined
            ? Number(bot.parsedLogic.recoveryBarrier)
            : (baseBarrier <= 2 ? 4 : baseBarrier);
        }
        return {
          shouldTrade: true,
          contractType,
          barrier: xmlBarrier,
          reason: `XML Bot execution (DIGITOVER ${xmlBarrier})`,
        };
      }

      // Récupération dynamique par changement de barrière pour Digit Over 1/2 Sniper natif :
      let effectiveBarrier = baseBarrier;
      if (inRecovery && bot?.parsedLogic?.recoveryBarrier !== undefined) {
        effectiveBarrier = Number(bot.parsedLogic.recoveryBarrier);
      } else if (baseBarrier === 1 && inRecovery) {
        effectiveBarrier = 3;
      } else if (baseBarrier <= 2 && consecutiveLosses === 1) {
        effectiveBarrier = 3;
      } else if (baseBarrier <= 2 && consecutiveLosses >= 2) {
        effectiveBarrier = 4;
      }

      const sample25 = lastDigits.slice(-25);
      const sample6 = lastDigits.slice(-6);
      const lowCount25 = sample25.filter(d => d <= effectiveBarrier).length;
      const lowFreq25 = sample25.length > 0 ? lowCount25 / sample25.length : 0.3;
      const lowCount6 = sample6.filter(d => d <= effectiveBarrier).length;

      // Garde Anti-Cluster Mortel : si le marché produit trop de petits chiffres d'affilée, on bloque l'entrée
      if (lowCount6 >= 3 || lowFreq25 >= 0.48) {
        return { shouldTrade: false };
      }

      // Zone cœur sécurisée sur le cercle décimal : projectedDigit loin des bornes 0..effectiveBarrier et 9
      const inSafeOverCore = projectedDigit >= effectiveBarrier + 2 && projectedDigit <= 8;

      // Setup A (Projection quantique au cœur de la zone > effectiveBarrier + rebond ou régime sain)
      if (inSafeOverCore && lowCount6 <= 2 && lowFreq25 <= 0.42) {
        return {
          shouldTrade: true,
          contractType,
          barrier: effectiveBarrier,
          reason: `Quantum Over core (proj=${projectedDigit} > ${effectiveBarrier}, freq25=${(lowFreq25 * 100).toFixed(0)}%)`,
        };
      }

      // Setup B (Régime haute dominance > 72% sur 25 ticks + projection > effectiveBarrier)
      if (lowFreq25 <= 0.28 && projectedDigit > effectiveBarrier && lastDigit > effectiveBarrier) {
        return {
          shouldTrade: true,
          contractType,
          barrier: effectiveBarrier,
          reason: `High-zone dominance (${((1 - lowFreq25) * 100).toFixed(0)}% > ${effectiveBarrier})`,
        };
      }

      // Setup C (Entrée adaptative sécurisée après attente si projection favorable)
      if (skippedCount >= 4 && projectedDigit > effectiveBarrier && lowFreq25 <= 0.40) {
        return {
          shouldTrade: true,
          contractType,
          barrier: effectiveBarrier,
          reason: `Adaptive sniper entry (proj=${projectedDigit} > ${effectiveBarrier})`,
        };
      }

      return { shouldTrade: false };
    }

    // ── 2. DIGITUNDER (Respect strict des XML importés Dual-Barrier 8 -> 6 + Sniper natif) ──
    if (contractType === 'DIGITUNDER') {
      const rawB = barrier !== undefined && barrier !== null && barrier !== '' ? Number(barrier) : 8;
      const baseBarrier = rawB <= 2 ? 8 : rawB;
      const consecutiveLosses = Number(session?.stats?.consecutiveLosses || 0);
      const unrecoveredLoss = Number(session?.stats?.unrecoveredLoss || 0);
      const inRecovery = consecutiveLosses >= 1 || unrecoveredLoss > 0.02;
      const isImportedXmlBot = bot?.strategyType === 'file_custom' || bot?.fileType === 'xml' || bot?.fileType === 'json';

      if (isImportedXmlBot) {
        let xmlBarrier = baseBarrier;
        if (inRecovery) {
          xmlBarrier = bot?.parsedLogic?.recoveryBarrier !== undefined
            ? Number(bot.parsedLogic.recoveryBarrier)
            : (baseBarrier >= 7 ? 6 : baseBarrier);
        }
        return {
          shouldTrade: true,
          contractType,
          barrier: xmlBarrier,
          reason: `XML Bot execution (DIGITUNDER ${xmlBarrier})`,
        };
      }

      const targetBarrier = inRecovery
        ? (bot?.parsedLogic?.recoveryBarrier !== undefined ? Number(bot.parsedLogic.recoveryBarrier) : (baseBarrier >= 7 ? 6 : baseBarrier))
        : baseBarrier;

      const sample25 = lastDigits.slice(-25);
      const sample6 = lastDigits.slice(-6);
      const highCount6 = sample6.filter(d => d >= targetBarrier).length;
      const highFreq25 = sample25.length > 0 ? sample25.filter(d => d >= targetBarrier).length / sample25.length : 0.2;

      // Garde Anti-Cluster : bloquer si série de chiffres >= targetBarrier
      if (highCount6 >= 3 || highFreq25 >= 0.45) {
        return { shouldTrade: false };
      }

      // Zone cœur sécurisée sur le cercle décimal : projectedDigit bien à l'intérieur de [1 .. targetBarrier - 2]
      const inSafeUnderCore = projectedDigit >= 1 && projectedDigit <= Math.max(2, targetBarrier - 2);

      if (inSafeUnderCore && highCount6 <= 2) {
        return { shouldTrade: true, contractType, barrier: targetBarrier, reason: `Quantum Under core (proj=${projectedDigit} < ${targetBarrier})` };
      }

      if (projectedDigit < targetBarrier && lastDigit < targetBarrier && highFreq25 <= 0.25) {
        return { shouldTrade: true, contractType, barrier: targetBarrier, reason: `Low-digit dominance (${((1 - highFreq25) * 100).toFixed(0)}% < ${targetBarrier})` };
      }

      if (skippedCount >= 3 && projectedDigit < targetBarrier && highFreq25 <= 0.38) {
        return { shouldTrade: true, contractType, barrier: targetBarrier, reason: `Adaptive Under ${targetBarrier} sniper (proj=${projectedDigit})` };
      }

      return { shouldTrade: false };
    }

    // ── 3. DIGITDIFF (Digit Differ Hunter & Quantum Differ Entropy VH - Markov Lag-1 + Split-Recovery) ──
    if (contractType === 'DIGITDIFF') {
      const consecutiveLosses = Number(session?.stats?.consecutiveLosses || 0);
      const unrecoveredLoss = Number(session?.stats?.unrecoveredLoss || 0);
      const inRecovery = consecutiveLosses >= 1 || unrecoveredLoss > 0.02;

      // Récupération Dual-Barrier (+40% payout à 70% de probabilité sur Under 7 / Over 2) si perte sur DIGITDIFF
      if (inRecovery && bot?.parsedLogic?.splitRecovery) {
        const useUnder = projectedDigit <= 4;
        return {
          shouldTrade: true,
          contractType: useUnder ? 'DIGITUNDER' : 'DIGITOVER',
          barrier: useUnder ? 7 : 2,
          reason: `Quantum Differ Recovery (${useUnder ? 'DIGITUNDER 7' : 'DIGITOVER 2'}, proj=${projectedDigit})`,
        };
      }

      const sample = lastDigits.slice(-30);
      const recent4 = lastDigits.slice(-4);
      const counts = Array(10).fill(0);
      const trans = Array(10).fill(0);
      sample.forEach(d => counts[d]++);
      for (let i = 0; i < lastDigits.length - 1; i++) {
        if (lastDigits[i] === lastDigit) {
          trans[lastDigits[i + 1]]++;
        }
      }

      // Choisir le chiffre diamétralement opposé à projectedDigit sur le cercle mod-10 ET le plus froid
      let bestDigit = (projectedDigit + 5) % 10;
      let minScore = Infinity;
      for (let d = 0; d < 10; d++) {
        if (d === lastDigit || d === projectedDigit) continue;
        const rawDist = Math.abs(d - projectedDigit);
        const circleDist = Math.min(rawDist, 10 - rawDist); // 0..5 (5 = opposé exact)
        const distPenalty = (5 - circleDist) * 6;
        const score = counts[d] * 3 + trans[d] * 5 + (recent4.includes(d) ? 4 : 0) + distPenalty;
        if (score < minScore) {
          minScore = score;
          bestDigit = d;
        }
      }

      return { shouldTrade: true, contractType: 'DIGITDIFF', barrier: bestDigit, reason: `Markov Cold Differ: ${bestDigit} (proj=${projectedDigit}, freq=${counts[bestDigit]})` };
    }

    // ── 4. DIGITEVEN & DIGITODD (Even / Odd Quantum Flow - Haute Précision) ──
    if (contractType === 'DIGITEVEN' || contractType === 'DIGITODD') {
      const sample = lastDigits.slice(-20);
      const evenCount = sample.filter(d => d % 2 === 0).length;
      const evenRatio = sample.length > 0 ? evenCount / sample.length : 0.5;
      const last3 = lastDigits.slice(-3);
      const last2 = lastDigits.slice(-2);

      // Setup A (Série forte >= 3 consécutifs) : Mean-reversion haute probabilité
      if (last3.length >= 3 && last3.every(d => d % 2 === 0)) {
        return { shouldTrade: true, contractType: 'DIGITODD', barrier: undefined, reason: `Even 3-streak mean-reversion (${last3.join(',')})` };
      }
      if (last3.length >= 3 && last3.every(d => d % 2 !== 0)) {
        return { shouldTrade: true, contractType: 'DIGITEVEN', barrier: undefined, reason: `Odd 3-streak mean-reversion (${last3.join(',')})` };
      }

      // Setup B (Déséquilibre statistique >= 65% sur les 20 derniers ticks + 2 ticks identiques)
      if (evenRatio >= 0.65 && last2.length >= 2 && last2.every(d => d % 2 === 0)) {
        return { shouldTrade: true, contractType: 'DIGITODD', barrier: undefined, reason: `Even imbalance ${(evenRatio * 100).toFixed(0)}% -> Rebond Odd` };
      }
      if (evenRatio <= 0.35 && last2.length >= 2 && last2.every(d => d % 2 !== 0)) {
        return { shouldTrade: true, contractType: 'DIGITEVEN', barrier: undefined, reason: `Odd imbalance ${((1 - evenRatio) * 100).toFixed(0)}% -> Rebond Even` };
      }

      // Setup C (Adaptatif basé sur le biais statistique si attente prolongée)
      if (skippedCount >= 3) {
        const targetParity = evenRatio >= 0.5 ? 'DIGITODD' : 'DIGITEVEN';
        return { shouldTrade: true, contractType: targetParity, barrier: undefined, reason: `Statistical parity equilibrium (${(evenRatio * 100).toFixed(0)}% even)` };
      }
      return { shouldTrade: false };
    }

    // ── 5. CALL / PUT (Rise / Fall AI, Boom/Crash Spiker & Synthetic Momentum Alpha 1s) ──
    if (contractType === 'CALL' || contractType === 'HIGHER' || contractType === 'PUT' || contractType === 'LOWER') {
      const ema3 = this._calcEMA(prices, 3);
      const ema8 = this._calcEMA(prices, 8);
      const ema13 = this._calcEMA(prices, 13);
      const rsi = this._calcRSI(prices, 6);
      const slope3 = prices.length >= 4 ? prices[prices.length - 1] - prices[prices.length - 4] : priceDelta;
      const accel = prices.length >= 3 ? (prices[prices.length - 1] - prices[prices.length - 2]) - (prices[prices.length - 2] - prices[prices.length - 3]) : 0;

      // Z-Score sur les 20 derniers ticks pour détecter les excès statistiques (Bollinger Mean-Reversion)
      const win20 = prices.slice(-20);
      const mean20 = win20.reduce((a, b) => a + b, 0) / Math.max(1, win20.length);
      const variance20 = win20.reduce((s, v) => s + Math.pow(v - mean20, 2), 0) / Math.max(1, win20.length);
      const std20 = Math.sqrt(variance20) || 1e-6;
      const zScore = (prices[prices.length - 1] - mean20) / std20;

      // Setup A (Rebond Z-score extrême >= 1.60 + RSI + amorce de retournement sur le dernier tick)
      if (zScore >= 1.60 && priceDelta < 0 && (rsi === null || rsi >= 65)) {
        return { shouldTrade: true, contractType: 'PUT', barrier: undefined, reason: `Z-Score Overbought Snapback (z=${zScore.toFixed(2)}, RSI=${rsi ? rsi.toFixed(1) : 'N/A'})` };
      }
      if (zScore <= -1.60 && priceDelta > 0 && (rsi === null || rsi <= 35)) {
        return { shouldTrade: true, contractType: 'CALL', barrier: undefined, reason: `Z-Score Oversold Bounce (z=${zScore.toFixed(2)}, RSI=${rsi ? rsi.toFixed(1) : 'N/A'})` };
      }

      // Setup B (Impulsion Triple-EMA alignée sans sur-extension)
      if (ema3 && ema8 && ema13 && ema3 > ema8 && ema8 > ema13 && slope3 > 0 && priceDelta > 0 && accel > 0 && zScore < 1.2 && (rsi === null || (rsi >= 50 && rsi <= 72))) {
        return { shouldTrade: true, contractType: 'CALL', barrier: undefined, reason: `Triple-EMA Impulse CALL (z=${zScore.toFixed(2)}, RSI=${rsi ? rsi.toFixed(1) : 'N/A'})` };
      }
      if (ema3 && ema8 && ema13 && ema3 < ema8 && ema8 < ema13 && slope3 < 0 && priceDelta < 0 && accel < 0 && zScore > -1.2 && (rsi === null || (rsi >= 28 && rsi <= 50))) {
        return { shouldTrade: true, contractType: 'PUT', barrier: undefined, reason: `Triple-EMA Impulse PUT (z=${zScore.toFixed(2)}, RSI=${rsi ? rsi.toFixed(1) : 'N/A'})` };
      }

      // Setup C (Rebond RSI extrême)
      if (rsi !== null && rsi >= 82 && priceDelta < 0) {
        return { shouldTrade: true, contractType: 'PUT', barrier: undefined, reason: `Overbought reversal RSI=${rsi.toFixed(1)}` };
      }
      if (rsi !== null && rsi <= 18 && priceDelta > 0) {
        return { shouldTrade: true, contractType: 'CALL', barrier: undefined, reason: `Oversold reversal RSI=${rsi.toFixed(1)}` };
      }

      return { shouldTrade: false };
    }

    // ── 6. RUNLOW & RUNHIGH (Only Downs / Only Ups Runs Momentum) ──
    if (contractType === 'RUNLOW') {
      const emaFast = this._calcEMA(prices, 4);
      const emaSlow = this._calcEMA(prices, 8);
      if ((emaFast && emaSlow && emaFast <= emaSlow) || priceDelta <= 0 || skippedCount >= 1) {
        return { shouldTrade: true, contractType: 'RUNLOW', barrier: undefined, reason: `Runs momentum down (delta=${priceDelta})` };
      }
      return { shouldTrade: false };
    }

    if (contractType === 'RUNHIGH') {
      const emaFast = this._calcEMA(prices, 4);
      const emaSlow = this._calcEMA(prices, 8);
      if ((emaFast && emaSlow && emaFast >= emaSlow) || priceDelta >= 0 || skippedCount >= 1) {
        return { shouldTrade: true, contractType: 'RUNHIGH', barrier: undefined, reason: `Runs momentum up (delta=${priceDelta})` };
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

    // Vérification de la période d'essai de 7 jours (Le propriétaire et les admins ont un accès illimité à vie)
    const user = await fallbackStore.findUserById(userId);
    const userEmail = (user?.email || '').toLowerCase().trim();
    const isOwner = userEmail === 'valdeslando15@gmail.com' || (typeof fallbackStore.isPlatformOwner === 'function' && fallbackStore.isPlatformOwner(user));
    const isAdmin = isOwner || user?.role === 'super_admin' || user?.role === 'admin';
    const isSubExpired = user?.subscription?.endDate ? new Date(user.subscription.endDate) <= new Date() : false;
    const hasPaidPlan =
      isAdmin ||
      (!isSubExpired && (
        user?.subscription?.plan === 'deriv-starter' ||
        user?.subscription?.plan === 'deriv-pro' ||
        user?.subscription?.plan === 'vip' ||
        user?.subscription?.plan === 'institutional' ||
        (user?.subscription?.isActive && user?.subscription?.plan !== 'free')
      ));
    const isAffiliated = acc.affiliateVerified === true;
    const settingsObj = await fallbackStore.getSettings().catch(() => ({}));
    const freeTrialEnabled = settingsObj?.freeTrialEnabled !== false && Number(settingsObj?.derivTrialDays ?? settingsObj?.freeTrialDays ?? 7) > 0;
    const isTrialActive = isOwner ? true : (freeTrialEnabled && (acc.isTrialValid ? acc.isTrialValid() : true));

    const planCache = require('./planCache');
    const activePlans = planCache.getPublicPlans ? planCache.getPublicPlans() : [];
    const hasActivePaidPlanCatalog =
      settingsObj?.subscriptionsEnabled !== false &&
      !settingsObj?.allRobotsFree &&
      activePlans.some(p => p.isActive !== false && !p.isFree && p.allowPaidSubscription !== false && Number(p.priceMonthly) > 0);

    if (hasActivePaidPlanCatalog && !isAdmin && !isTrialActive && !hasPaidPlan && !isAffiliated) {
      throw new Error(
        freeTrialEnabled
          ? 'Période d\'essai gratuite expirée. Veuillez payer un abonnement ou vous inscrire/connecter via le lien de parrainage Deriv pour débloquer les robots.'
          : 'Essai gratuit désactivé. Veuillez payer un abonnement ou vous inscrire/connecter via le lien de parrainage Deriv de l\'administrateur pour débloquer les robots.'
      );
    }

    const isCustomBuilder = !botId || botId === 'custom-builder' || botId === 'custom';
    const bot = isCustomBuilder
      ? {
          _id: 'custom-builder',
          name: overrides.botName || 'RoyalBot Builder Custom',
          contractType: overrides.contractType || 'DIGITOVER',
          symbols: [overrides.symbol || 'R_100'],
          strategyType: overrides.strategyType || 'bot_builder_custom',
          defaultSettings: overrides || {},
          isActive: true,
        }
      : await fallbackStore.findDerivBotById(botId);
    if (!bot || bot.isActive === false) throw new Error('Robot Deriv introuvable ou inactif.');

    const defaultSettings = bot.defaultSettings || {};
    let symbol = overrides.symbol || bot.symbols?.[0] || 'R_100';
    const cTypeUpper = String(overrides.contractType || bot.contractType || 'DIGITOVER').toUpperCase();

    // Auto-réparation à la volée des robots XML/JSON déjà importés (ex: WEALTH GENERATOR où le shadow '1' avait écrasé la barrière 8 -> 6)
    if (bot.fileContent && (bot.strategyType === 'file_custom' || bot.fileType === 'xml' || bot.fileType === 'json')) {
      try {
        const parser = require('./DerivBotFileParser');
        const reparsed = parser.parse(bot.fileContent, bot.fileName || bot.name || 'bot.xml');
        if (reparsed?.defaultSettings?.barrier !== undefined) {
          defaultSettings.barrier = reparsed.defaultSettings.barrier;
        }
        if (reparsed?.parsedLogic) {
          bot.parsedLogic = { ...(bot.parsedLogic || {}), ...reparsed.parsedLogic };
        }
        if (bot._id && bot._id !== 'custom-builder') {
          fallbackStore.updateDerivBot(bot._id, {
            'defaultSettings.barrier': defaultSettings.barrier,
            parsedLogic: bot.parsedLogic,
          }).catch(() => {});
        }
      } catch (_) {}
    }
    if (cTypeUpper === 'DIGITUNDER' && (defaultSettings.barrier === undefined || Number(defaultSettings.barrier) <= 2)) {
      defaultSettings.barrier = '8';
      bot.parsedLogic = { ...(bot.parsedLogic || {}), barrier: '8', recoveryBarrier: bot.parsedLogic?.recoveryBarrier || '6' };
    }
    // Deriv ne supporte pas CALL/PUT binaire sur BOOM/CRASH ; bascule automatique sur 1HZ100V
    if (/^(BOOM|CRASH)/i.test(symbol) && (cTypeUpper === 'CALL' || cTypeUpper === 'PUT')) {
      symbol = '1HZ100V';
    }
    const isDigitContract = cTypeUpper.startsWith('DIGIT');
    const needsBarrier = ['DIGITOVER', 'DIGITUNDER', 'DIGITMATCH', 'DIGITDIFF'].includes(cTypeUpper);
    const isRunsContract = cTypeUpper.startsWith('RUN');
    const defaultDuration = isDigitContract ? 1 : (isRunsContract ? 2 : 5);
    const defaultDurationUnit = overrides.durationUnit || defaultSettings.durationUnit || 't';
    const userMartingaleMultiplier = Number(overrides.martingaleMultiplier || 1);
    const hasExplicitMartingale = Boolean(overrides.martingaleEnabled) && userMartingaleMultiplier > 1;

    // Rafraîchir le solde du compte directement auprès de Deriv
    let token = '';
    try {
      token = acc.getToken ? acc.getToken() : (acc.token || '');
    } catch (_) {}
    if (token) {
      try {
        const dsCheck = new DerivService({ token, loginId: acc.loginId });
        const authInfo = await dsCheck.authorize();
        if (authInfo?.balance !== undefined) {
          acc.balance = Number(authInfo.balance);
          acc.lastCheck = new Date();
          if (acc.save) await acc.save().catch(() => {});
        }
        dsCheck.close();
      } catch (_) {}
    }

    const initialStakeVal = Number(overrides.initialStake || defaultSettings.initialStake || (isRunsContract ? 0.35 : 1));
    const currentBalance = Number(acc.balance !== undefined ? acc.balance : 0);
    if (currentBalance < initialStakeVal) {
      throw new Error(`Solde insuffisant sur ce compte (${acc.loginId} : $${currentBalance.toFixed(2)} USD). Veuillez basculer sur un compte Démo ou approvisionner votre compte.`);
    }

    const virtualHook = overrides.virtualHook || defaultSettings.virtualHook || { enabled: false, trigger: 3, startWhen: 'loss', stake: 0.5 };
    const martiStart = Number(overrides.martiStart || defaultSettings.martiStart || 1);
    const martiFactor = hasExplicitMartingale
      ? userMartingaleMultiplier
      : Number(overrides.martiFactor || defaultSettings.martiFactor || userMartingaleMultiplier);

    let resolvedLossFactor = 1;
    if (overrides.lossFactor !== undefined && overrides.lossFactor !== null && !isNaN(Number(overrides.lossFactor))) {
      resolvedLossFactor = Number(overrides.lossFactor);
    } else if (defaultSettings.lossFactor !== undefined && defaultSettings.lossFactor !== null && !isNaN(Number(defaultSettings.lossFactor))) {
      resolvedLossFactor = Number(defaultSettings.lossFactor);
    }

    const settings = {
      initialStake:         initialStakeVal,
      maxStake:             Number(overrides.maxStake || defaultSettings.maxStake || 50),
      stopLoss:             Number(overrides.stopLoss || defaultSettings.stopLoss || 20),
      takeProfit:           Number(overrides.takeProfit || defaultSettings.takeProfit || 50),
      duration:             Number(overrides.duration || defaultSettings.duration || defaultDuration),
      durationUnit:         defaultDurationUnit,
      barrier:              needsBarrier ? (overrides.barrier !== undefined ? overrides.barrier : (defaultSettings.barrier !== undefined ? defaultSettings.barrier : '2')) : undefined,
      martingaleEnabled:    hasExplicitMartingale || Boolean(defaultSettings.martingaleEnabled),
      martingaleMultiplier: hasExplicitMartingale ? userMartingaleMultiplier : (defaultSettings.martingaleMultiplier || 1),
      maxMartingaleSteps:   Number(overrides.maxMartingaleSteps || defaultSettings.maxMartingaleSteps || 4),
      martiStart,
      martiFactor,
      virtualHook,
      lossFactor:           resolvedLossFactor,
      customLogicCode:      overrides.customLogicCode || defaultSettings.customLogicCode || bot.customLogicCode || '',
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
    this.stopRequestedAt.delete(sid);
    const hasVh = Boolean(session.settings?.virtualHook?.enabled);
    this.virtualStates.set(sid, {
      inVirtualMode: hasVh,
      virtualLosses: 0,
      virtualWins: 0,
      virtualStreak: 0,
    });
    const pollInterval = 3500; // Chaque 3.5 secondes pour une réactivité live maximale
    const handle = setInterval(() => this._tick(sid), pollInterval);
    this.active.set(sid, { handle, accountId: session.derivAccount.toString() });
  }

  async _tick(sessionId) {
    if (this.busySessions.has(sessionId)) return;
    if (this.stopRequestedAt.has(sessionId) || !this.active.has(sessionId)) return;

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
        const settingsObj = await fallbackStore.getSettings().catch(() => ({}));
        const planCache = require('./planCache');
        const activePlans = planCache.getPublicPlans ? planCache.getPublicPlans() : [];
        const hasActivePaidPlanCatalog =
          settingsObj?.subscriptionsEnabled !== false &&
          !settingsObj?.allRobotsFree &&
          activePlans.some(p => p.isActive !== false && !p.isFree && p.allowPaidSubscription !== false && Number(p.priceMonthly) > 0);
        const freeTrialEnabled = settingsObj?.freeTrialEnabled !== false && Number(settingsObj?.derivTrialDays ?? settingsObj?.freeTrialDays ?? 7) > 0;
        const isTrialValid = freeTrialEnabled && (acc.isTrialValid ? acc.isTrialValid() : true);
        const isSubExpired = user?.subscription?.endDate ? new Date(user.subscription.endDate) <= new Date() : false;
        const hasPaid =
          user?.role === 'super_admin' ||
          user?.role === 'admin' ||
          (!isSubExpired && (
            user?.subscription?.plan?.startsWith('deriv') ||
            user?.subscription?.plan === 'vip' ||
            user?.subscription?.plan === 'institutional' ||
            (user?.subscription?.isActive && user?.subscription?.plan !== 'free')
          ));
        if (hasActivePaidPlanCatalog && !isTrialValid && !acc.affiliateVerified && !hasPaid) {
          session.status = 'stopped';
          session.stoppedAt = new Date();
          if (session.save) await session.save();
          this._clear(sessionId);
          if (global.broadcastToUser) {
            global.broadcastToUser(session.user.toString(), {
              type: 'deriv_trial_expired',
              sessionId,
              message: freeTrialEnabled
                ? 'Période d\'essai Deriv terminée. Veuillez payer un abonnement ou utiliser le lien de parrainage.'
                : 'Essai gratuit désactivé. Veuillez payer un abonnement ou vous inscrire/connecter avec le lien de parrainage Deriv.',
            });
          }
          return;
        }
      }

      const bot = await fallbackStore.findDerivBotById(session.bot);
      let token = '';
      try {
        token = acc.getToken ? acc.getToken() : (acc.token || '');
      } catch (e) {
        console.warn('Error reading token from account:', e.message);
      }
      if (!token) {
        console.warn(`DerivRobotEngine: pas de token pour le compte ${acc.loginId}`);
        return;
      }

      ds = new DerivService({ token, loginId: acc.loginId });

      // Analyse du marché sur 50 ticks et confirmation de signal Sniper Élite
      const history = await ds.getTicksHistory(session.symbol, 50).catch(() => null);
      const skippedCount = this.skippedCounts.get(sessionId) || 0;
      const signal = this._evaluateMarketSignal(bot, history, session.contractType, session.settings.barrier, skippedCount, session);

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

      const targetContractType = signal.contractType || session.contractType;
      const targetBarrier = targetContractType.startsWith('DIGIT') ? (signal.barrier !== undefined ? signal.barrier : session.settings.barrier) : undefined;
      const currentStake = Number(session.stats.currentStake || session.settings.initialStake || 0.35);

      // ── Gestion du Virtual Hook (Paper trading / Simulation de pertes avant ordre réel) ──
      const vhConfig = session.settings?.virtualHook;
      const hasVh = Boolean(vhConfig?.enabled);
      let vState = this.virtualStates.get(sessionId);
      if (hasVh && !vState) {
        vState = { inVirtualMode: true, virtualLosses: 0, virtualWins: 0, virtualStreak: 0 };
        this.virtualStates.set(sessionId, vState);
      }

      if (hasVh && vState?.inVirtualMode) {
        const vhTrigger = Number(vhConfig.trigger || 3);
        const simResult = this._simulateContract(targetContractType, history?.prices, session.settings.duration, targetBarrier);

        if (simResult !== null) {
          if (simResult === false) {
            // Perte simulée
            vState.virtualLosses += 1;
            vState.virtualWins = 0;

            if (vState.virtualLosses < vhTrigger) {
              const statusMsg = `Virtual Hook : Perte simulée (${vState.virtualLosses}/${vhTrigger} requises). Analyse sniper continue...`;
              if (global.broadcastToUser) {
                global.broadcastToUser(session.user.toString(), {
                  type: 'deriv_robot_virtual_tick',
                  sessionId,
                  botName: bot?.name || session.botName,
                  symbol: session.symbol,
                  virtualLosses: vState.virtualLosses,
                  vhTrigger,
                  message: statusMsg,
                });
              }
              ds.close();
              return; // Attend la prochaine perte virtuelle requise
            } else {
              // Condition de déclenchement atteinte !
              vState.inVirtualMode = false;
              const triggerMsg = `🎯 Virtual Hook déclenché (${vState.virtualLosses} pertes simulées atteintes) → Exécution de l'ordre réel sur votre compte !`;
              if (global.broadcastToUser) {
                global.broadcastToUser(session.user.toString(), {
                  type: 'deriv_robot_vh_triggered',
                  sessionId,
                  botName: bot?.name || session.botName,
                  symbol: session.symbol,
                  message: triggerMsg,
                });
              }
            }
          } else {
            // Gain simulé : réinitialise la série de pertes virtuelles
            vState.virtualLosses = 0;
            vState.virtualWins += 1;
            const statusMsg = `Virtual Hook : Gain simulé observé (0/${vhTrigger} pertes). En attente de setup sniper...`;
            if (global.broadcastToUser) {
              global.broadcastToUser(session.user.toString(), {
                type: 'deriv_robot_virtual_tick',
                sessionId,
                botName: bot?.name || session.botName,
                symbol: session.symbol,
                virtualLosses: 0,
                vhTrigger,
                message: statusMsg,
              });
            }
            ds.close();
            return;
          }
        }
      }

      // Vérifier le solde disponible
      const currentAccBalance = Number(acc.balance !== undefined ? acc.balance : 0);
      if (currentAccBalance < currentStake) {
        const errMsg = `Solde insuffisant ($${currentAccBalance.toFixed(2)}) pour miser $${currentStake.toFixed(2)}. Basculez sur un compte Démo ou approvisionnez votre compte.`;
        console.warn(`DerivRobotEngine [${sessionId}]: ${errMsg}`);
        if (global.broadcastToUser) {
          global.broadcastToUser(session.user.toString(), {
            type: 'deriv_robot_error',
            sessionId,
            botName: bot?.name || session.botName,
            error: errMsg,
          });
        }
        await this.pauseSession(sessionId, session.user).catch(() => {});
        ds.close();
        return;
      }

      if (this.stopRequestedAt.has(sessionId) || !this.active.has(sessionId)) {
        ds.close();
        return;
      }

      this.busySessions.add(sessionId);

      // Demander proposition
      let proposal;
      try {
        proposal = await ds.getProposal({
          symbol: session.symbol,
          contractType: targetContractType,
          amount: currentStake,
          duration: session.settings.duration,
          durationUnit: session.settings.durationUnit,
          barrier: targetBarrier,
          currency: acc.currency || 'USD',
        });
      } catch (err) {
        this.busySessions.delete(sessionId);
        ds.close();
        console.warn(`Deriv proposal error [${sessionId}]:`, err.message);
        if (global.broadcastToUser) {
          global.broadcastToUser(session.user.toString(), {
            type: 'deriv_robot_error',
            sessionId,
            botName: bot?.name || session.botName,
            error: `Erreur Deriv (${targetContractType}) : ${err.message}`,
          });
        }
        return;
      }

      if (!proposal?.id || this.stopRequestedAt.has(sessionId) || !this.active.has(sessionId)) {
        this.busySessions.delete(sessionId);
        ds.close();
        return;
      }

      // Acheter le contrat
      const buyStartedAt = Date.now();
      let buyRes;
      try {
        buyRes = await ds.buyContract(proposal.id, proposal.ask_price);
      } catch (err) {
        this.busySessions.delete(sessionId);
        ds.close();
        console.warn(`Deriv buy error [${sessionId}]:`, err.message);
        if (global.broadcastToUser) {
          global.broadcastToUser(session.user.toString(), {
            type: 'deriv_robot_error',
            sessionId,
            botName: bot?.name || session.botName,
            error: `Erreur Deriv (achat contrat) : ${err.message}`,
          });
        }
        return;
      }

      if (!buyRes?.contract_id) {
        this.busySessions.delete(sessionId);
        ds.close();
        return;
      }

      // Si une position a été lancée après le clic sur Arrêter : marquer comme failed & rembourser la mise
      const stopTs = this.stopRequestedAt.get(sessionId);
      if (stopTs && buyStartedAt >= stopTs) {
        const stakeAmount = Number(proposal.ask_price || currentStake);
        const baseBalance = buyRes.balance_after !== undefined ? Number(buyRes.balance_after) : Number(acc.balance || 0);
        acc.balance = +(baseBalance + stakeAmount).toFixed(2);
        acc.lastCheck = new Date();
        if (acc.save) await acc.save().catch(() => {});

        const failedTrade = await fallbackStore.createDerivTrade({
          user: session.user,
          session: session._id,
          derivAccount: acc._id,
          isManual: false,
          contractId: String(buyRes.contract_id),
          transactionId: String(buyRes.transaction_id || ''),
          symbol: session.symbol,
          contractType: targetContractType,
          barrier: targetContractType.startsWith('DIGIT') ? String(targetBarrier || '') : '',
          stake: stakeAmount,
          payout: 0,
          profit: 0,
          status: 'failed',
          refunded: true,
          errorMessage: 'Position échouée : lancée après arrêt du robot (mise remboursée)',
          openedAt: new Date(),
          closedAt: new Date(),
        });

        if (global.broadcastToUser) {
          global.broadcastToUser(session.user.toString(), {
            type: 'deriv_trade_result',
            sessionId: session._id,
            trade: failedTrade.toObject ? failedTrade.toObject() : failedTrade,
            stats: session.stats,
            balance: acc.balance,
            failedAfterStop: true,
          });
        }

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

          // Facteur de perte réel (1.0 par défaut = 100% fidèle au solde réel Deriv)
          let lossFactor = 1.0;
          if (session.settings?.lossFactor !== undefined && session.settings?.lossFactor !== null && !isNaN(Number(session.settings.lossFactor))) {
            lossFactor = Number(session.settings.lossFactor);
          } else if (bot?.defaultSettings?.lossFactor !== undefined && bot?.defaultSettings?.lossFactor !== null && !isNaN(Number(bot.defaultSettings.lossFactor))) {
            lossFactor = Number(bot.defaultSettings.lossFactor);
          }

          let profit = 0;
          if (isWon) {
            profit = status?.profit !== undefined ? Number(status.profit) : +(trade.payout - trade.stake).toFixed(2);
          } else {
            // Perte calculée selon le ratio de perte configuré par le Super-Admin (ex: mise 1$ -> perte 0.12$)
            const baseLoss = Math.abs(status?.profit !== undefined ? Number(status.profit) : Number(trade.stake));
            profit = - +(baseLoss * lossFactor).toFixed(2);
          }

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

            const hasActiveMartingale = updatedSession.settings.martingaleEnabled === true && Number(updatedSession.settings.martingaleMultiplier) > 1;

            const vhConfig = updatedSession.settings?.virtualHook;
            const hasVh = Boolean(vhConfig?.enabled);
            const vState = this.virtualStates.get(sessionId);

            const isSplitBot =
              (bot?.strategyType === 'file_custom' || bot?.fileType === 'xml' || bot?.fileType === 'json' || bot?.parsedLogic?.splitRecovery === true) &&
              (updatedSession.contractType === 'DIGITUNDER' || updatedSession.contractType === 'DIGITOVER' || updatedSession.contractType === 'DIGITDIFF');
            const defaultMult = Number(bot?.defaultSettings?.martingaleMultiplier || 1.47);
            const userCustomizedMartingale = hasActiveMartingale && Math.abs(Number(updatedSession.settings.martingaleMultiplier || 1) - defaultMult) > 0.01;
            const isImportedDigitBot = isSplitBot && !userCustomizedMartingale;

            let unrecoveredLoss = Number(updatedSession.stats.unrecoveredLoss || 0);

            if (isWon) {
              updatedSession.stats.wins += 1;

              if (isImportedDigitBot && unrecoveredLoss > 0) {
                // Split-Recovery DBotPro :
                // 1.00$ perdu -> 1.01$ gagne +0.54$ -> reste 0.46$ (consecutiveLosses remis à 0 pour le split suivant)
                unrecoveredLoss = +(unrecoveredLoss - Math.abs(profit)).toFixed(2);
                if (unrecoveredLoss > 0.02) {
                  updatedSession.stats.unrecoveredLoss = unrecoveredLoss;
                  updatedSession.stats.consecutiveLosses = 0;
                  // Conserver la même mise de récupération pour le 2e split (ex: 1.01$ ou 1.47$)
                } else {
                  // Toute la perte du cycle est remboursée -> retour à la barrière 8 et mise initiale 1.00$
                  updatedSession.stats.unrecoveredLoss = 0;
                  updatedSession.stats.consecutiveLosses = 0;
                  updatedSession.stats.currentStake = updatedSession.settings.initialStake;
                }
              } else {
                updatedSession.stats.unrecoveredLoss = 0;
                updatedSession.stats.consecutiveLosses = 0;
                // Règle : Si le trade gagne, retour immédiat au prix initial
                updatedSession.stats.currentStake = updatedSession.settings.initialStake;
              }

              // Si le Virtual Hook est activé, retour en mode virtuel pour filtrer la prochaine entrée !
              if (hasVh && vState && Number(updatedSession.stats.unrecoveredLoss || 0) === 0) {
                vState.inVirtualMode = true;
                vState.virtualLosses = 0;
              }
            } else {
              updatedSession.stats.losses += 1;
              updatedSession.stats.consecutiveLosses += 1;

              const maxStakeAllowed = updatedSession.settings.maxStake || 50;

              if (isImportedDigitBot) {
                // Calcul exact DBotPro Split-Recovery :
                // - 1ère perte (-1.00$) -> unrecoveredLoss = 1.00$ -> mise = 1.01$ (2-split)
                // - Si 1er split gagne (+0.54$, consecutiveLosses=0) puis 2e split perd (-1.01$, consecutiveLosses=1) -> unrecoveredLoss = 1.47$ -> mise = 1.47$ (2-split)
                // - Si 2 pertes consécutives sans gain intermédiaire (consecutiveLosses >= 2) -> récupération directe en 1 gain (unrecoveredLoss / 0.535)
                const prevUnrecovered = unrecoveredLoss;
                unrecoveredLoss = +(unrecoveredLoss + Math.abs(profit)).toFixed(2);
                updatedSession.stats.unrecoveredLoss = unrecoveredLoss;

                let nextRecoveryStake;
                if (bot?.isSystem && bot?.parsedLogic?.splitRecovery) {
                  // Pour Quantum Differ (récupération sur Under 7 / Over 2 à +40% payout) vs Dual-Barrier Pro (Under 6 / Over 3 à +53.5% payout)
                  const recPayout = updatedSession.contractType === 'DIGITDIFF' ? 0.40 : 0.535;
                  nextRecoveryStake = +((unrecoveredLoss * 1.05) / recPayout).toFixed(2);
                } else if (prevUnrecovered === 0) {
                  nextRecoveryStake = +(unrecoveredLoss * 1.01).toFixed(2);
                } else if (updatedSession.stats.consecutiveLosses === 1) {
                  nextRecoveryStake = +unrecoveredLoss.toFixed(2);
                } else {
                  nextRecoveryStake = +((unrecoveredLoss * 1.02) / 0.535).toFixed(2);
                }

                updatedSession.stats.currentStake = Math.min(Math.max(0.35, nextRecoveryStake), maxStakeAllowed);
                const maxSteps = Number(updatedSession.settings.maxMartingaleSteps || 3);
                if (updatedSession.stats.consecutiveLosses >= maxSteps || updatedSession.stats.unrecoveredLoss > maxStakeAllowed) {
                  updatedSession.stats.unrecoveredLoss = 0;
                  updatedSession.stats.consecutiveLosses = 0;
                  updatedSession.stats.currentStake = updatedSession.settings.initialStake;
                }
              } else {
                const martiStart = Number(updatedSession.settings.martiStart || 1);
                const explicitMult = Number(updatedSession.settings.martingaleMultiplier || 1);
                const martiFactor = explicitMult > 1
                  ? explicitMult
                  : Number(updatedSession.settings.martiFactor || 1);
                const maxSteps = Number(updatedSession.settings.maxMartingaleSteps || 4);

                // Vérification du déclenchement Martingale selon martiStart
                if (hasActiveMartingale && updatedSession.stats.consecutiveLosses >= martiStart) {
                  let nextStake = updatedSession.stats.currentStake;
                  if (martiFactor > 0 && martiFactor < 1) {
                    nextStake = +(updatedSession.stats.currentStake * (1 + martiFactor)).toFixed(2);
                  } else if (martiFactor >= 1) {
                    nextStake = +(updatedSession.stats.currentStake * martiFactor).toFixed(2);
                  }
                  updatedSession.stats.currentStake = Math.min(nextStake, maxStakeAllowed);

                  if (updatedSession.stats.consecutiveLosses >= martiStart + maxSteps) {
                    updatedSession.stats.currentStake = updatedSession.settings.initialStake;
                    updatedSession.stats.consecutiveLosses = 0;
                    if (hasVh && vState) {
                      vState.inVirtualMode = true;
                      vState.virtualLosses = 0;
                    }
                  }
                } else {
                  updatedSession.stats.currentStake = updatedSession.settings.initialStake;
                }
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
      try {
        const s = await fallbackStore.findDerivSessionById(sessionId);
        if (s && global.broadcastToUser) {
          global.broadcastToUser(s.user.toString(), {
            type: 'deriv_robot_error',
            sessionId,
            botName: s.botName,
            error: err.message,
          });
        }
      } catch (_) {}
    }
  }

  async stopSession(sessionId, userId) {
    const sid = sessionId.toString();
    const stoppedAt = new Date();
    // Marquer immédiatement l'arrêt pour empêcher tout nouveau lancement tout en laissant la position en cours se terminer
    this.stopRequestedAt.set(sid, stoppedAt.getTime());
    this._clear(sid, { preserveBusy: true });
    const s = await fallbackStore.updateDerivSession(sid, userId, {
      status: 'stopped',
      stoppedAt,
    });
    if (s && global.broadcastToUser) {
      global.broadcastToUser(userId.toString(), { type: 'deriv_robot_stopped', sessionId: sid });
    }
    return s;
  }

  async pauseSession(sessionId, userId) {
    const sid = sessionId.toString();
    this.stopRequestedAt.set(sid, Date.now());
    this._clear(sid, { preserveBusy: true });
    return fallbackStore.updateDerivSession(sid, userId, { status: 'paused' });
  }

  async resumeSession(sessionId, userId) {
    const s = await fallbackStore.updateDerivSession(sessionId, userId, { status: 'active' });
    if (s) await this._spawn(s);
    return s;
  }

  async enforceAccessPolicies() {
    const settingsObj = await fallbackStore.getSettings().catch(() => ({}));
    const planCache = require('./planCache');
    const activePlans = planCache.getPublicPlans ? planCache.getPublicPlans() : [];
    const hasActivePaidPlanCatalog =
      settingsObj?.subscriptionsEnabled !== false &&
      !settingsObj?.allRobotsFree &&
      activePlans.some(p => p.isActive !== false && !p.isFree && p.allowPaidSubscription !== false && Number(p.priceMonthly) > 0);
    if (!hasActivePaidPlanCatalog) return;

    const freeTrialEnabled = settingsObj?.freeTrialEnabled !== false && Number(settingsObj?.derivTrialDays ?? settingsObj?.freeTrialDays ?? 7) > 0;
    const sessionIds = Array.from(this.active.keys());
    for (const sid of sessionIds) {
      try {
        const session = await fallbackStore.findDerivSessionById(sid);
        if (!session) {
          this._clear(sid);
          continue;
        }
        const acc = await fallbackStore.getDerivAccountById(session.derivAccount);
        const user = await fallbackStore.findUserById(session.user);
        const userEmail = (user?.email || '').toLowerCase().trim();
        const isOwner = userEmail === 'valdeslando15@gmail.com' || (typeof fallbackStore.isPlatformOwner === 'function' && fallbackStore.isPlatformOwner(user));
        const isAdmin = isOwner || user?.role === 'admin' || user?.role === 'super_admin';
        if (isAdmin) continue;

        const isTrialValid = freeTrialEnabled && (acc?.isTrialValid ? acc.isTrialValid() : true);
        const isSubExpired = user?.subscription?.endDate ? new Date(user.subscription.endDate) <= new Date() : false;
        const hasPaid = !isSubExpired && (
          user?.subscription?.plan?.startsWith('deriv') ||
          user?.subscription?.plan === 'vip' ||
          user?.subscription?.plan === 'institutional' ||
          (user?.subscription?.isActive && user?.subscription?.plan !== 'free')
        );
        if (!isTrialValid && !acc?.affiliateVerified && !hasPaid) {
          await this.stopSession(sid, session.user);
          if (global.broadcastToUser) {
            global.broadcastToUser(session.user.toString(), {
              type: 'deriv_trial_expired',
              sessionId: sid,
              message: freeTrialEnabled
                ? 'Période d\'essai Deriv terminée. Veuillez payer un abonnement ou utiliser le lien de parrainage.'
                : 'Essai gratuit désactivé. Veuillez payer un abonnement ou vous inscrire/connecter avec le lien de parrainage Deriv.',
            });
          }
        }
      } catch (_) {}
    }
  }

  _clear(sessionId, { preserveBusy = false } = {}) {
    if (!preserveBusy) this.busySessions.delete(sessionId);
    this.skippedCounts.delete(sessionId);
    this.virtualStates.delete(sessionId);
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
