const express = require('express');
const Trade = require('../models/Trade');
const DerivTrade = require('../models/DerivTrade');
const BinanceTrade = require('../models/BinanceTrade');
const fallbackStore = require('../services/RuntimeFallbackStore');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * Normalisation d'un trade selon sa source (Deriv, Binance, Bybit, Standard)
 */
function normalizeTrade(t) {
  const isDeriv = Boolean(t.contractId || t.barrier || t.derivAccount || t.contractType);
  const isBinanceExchange = t.exchange === 'binance' || Boolean(t.binanceOrderId || t.binanceAccount);
  const isBybitExchange = t.exchange === 'bybit' || Boolean(t.bybitAccount);

  let category = 'deriv_robot';
  let categoryLabel = 'Robot Deriv SmartTrader';

  if (isDeriv) {
    if (t.isManual) {
      category = 'deriv_manual';
      categoryLabel = 'Trading Manuel SmartTrader';
    } else {
      category = 'deriv_robot';
      categoryLabel = 'Robot Deriv SmartTrader';
    }
  } else if (isBybitExchange) {
    category = 'bybit';
    categoryLabel = 'Robot Bybit Multi-Marchés';
  } else if (isBinanceExchange) {
    category = 'binance';
    categoryLabel = 'Robot Binance Crypto';
  } else if (t.category) {
    category = t.category;
    categoryLabel = t.categoryLabel || category;
  }

  const rawProfit = t.profit !== undefined ? t.profit : (t.pnl !== undefined ? t.pnl : 0);
  const profit = Number(Number(rawProfit).toFixed(2));

  let status = 'open';
  if (t.status === 'won' || t.status === 'lost') {
    status = t.status;
  } else if (t.status === 'closed') {
    status = profit > 0 ? 'won' : (profit < 0 ? 'lost' : 'won');
  } else if (t.result === 'win') {
    status = 'won';
  } else if (t.result === 'loss') {
    status = 'lost';
  }

  const result = status === 'won' ? 'win' : (status === 'lost' ? 'loss' : 'pending');
  const openedAt = t.openedAt || t.createdAt || new Date();
  const stake = Number(t.stake || (t.entryPrice && t.qty ? t.entryPrice * t.qty : t.amount || 0));

  return {
    _id: String(t._id || t.contractId || Math.random()),
    contractId: t.contractId || String(t._id || ''),
    category,
    categoryLabel,
    symbol: t.symbol || 'R_50',
    contractType: t.contractType || t.side || t.type || 'TRADE',
    stake: +stake.toFixed(2),
    profit,
    status,
    result,
    martingaleLevel: t.martingaleLevel || 0,
    openedAt,
    closedAt: t.closedAt || null,
    source: isDeriv ? 'deriv' : (isBybitExchange ? 'bybit' : 'binance'),
  };
}

/**
 * Récupère tous les trades de l'utilisateur sur toutes les catégories
 */
async function fetchAllUserTrades(userId) {
  const all = [];

  // 1. Deriv Trades (Manuel & Robots)
  try {
    const dList = await DerivTrade.find({ user: userId }).sort({ openedAt: -1 }).limit(300).lean();
    if (dList && dList.length > 0) {
      dList.forEach(t => all.push(normalizeTrade(t)));
    }
  } catch (_) {}

  // 2. Binance & Bybit Trades
  try {
    const bList = await BinanceTrade.find({ user: userId }).sort({ openedAt: -1 }).limit(300).lean();
    if (bList && bList.length > 0) {
      bList.forEach(t => all.push(normalizeTrade(t)));
    }
  } catch (_) {}

  // 3. Fallback store (si mode sans MongoDB ou en cache)
  try {
    const fallbackDeriv = await fallbackStore.getDerivTradesByUser(userId);
    if (fallbackDeriv && fallbackDeriv.length > 0) {
      const existingIds = new Set(all.map(x => x._id));
      fallbackDeriv.forEach(t => {
        const id = String(t._id || t.contractId);
        if (!existingIds.has(id)) {
          all.push(normalizeTrade(t));
          existingIds.add(id);
        }
      });
    }
  } catch (_) {}

  // 4. Legacy Trade model
  try {
    const legList = await Trade.find({ user: userId }).sort({ createdAt: -1 }).limit(100).lean();
    if (legList && legList.length > 0) {
      const existingIds = new Set(all.map(x => x._id));
      legList.forEach(t => {
        const id = String(t._id);
        if (!existingIds.has(id)) {
          all.push(normalizeTrade(t));
          existingIds.add(id);
        }
      });
    }
  } catch (_) {}

  return all.sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt));
}

// GET /api/trades : Liste filtrée et paginée par catégorie
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50, category, result, contractType, search, startDate, endDate } = req.query;
    let list = await fetchAllUserTrades(req.user._id);

    // Filtrage par catégorie : 'deriv_manual' | 'deriv_robot' | 'binance' | 'bybit'
    if (category && category !== 'all') {
      list = list.filter(t => t.category === category);
    }

    // Filtrage par résultat : 'win' | 'loss' | 'pending'
    if (result && result !== 'all') {
      list = list.filter(t => t.result === result);
    }

    // Filtrage par type de contrat
    if (contractType && contractType !== 'all') {
      list = list.filter(t => t.contractType?.toLowerCase() === contractType.toLowerCase());
    }

    // Filtrage par recherche
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.symbol?.toLowerCase().includes(q) ||
        t.contractType?.toLowerCase().includes(q) ||
        t.categoryLabel?.toLowerCase().includes(q)
      );
    }

    // Filtrage temporel
    if (startDate) {
      const start = new Date(startDate).getTime();
      list = list.filter(t => new Date(t.openedAt).getTime() >= start);
    }
    if (endDate) {
      const end = new Date(endDate).getTime();
      list = list.filter(t => new Date(t.openedAt).getTime() <= end);
    }

    const total = list.length;
    const p = Math.max(1, parseInt(page, 10));
    const lim = Math.max(1, parseInt(limit, 10));
    const paginated = list.slice((p - 1) * lim, p * lim);

    res.json({
      trades: paginated,
      pagination: {
        page: p,
        limit: lim,
        total,
        pages: Math.ceil(total / lim) || 1,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/trades/:id : Supprimer un trade individuel
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const tradeId = req.params.id;
    await fallbackStore.deleteTrade(req.user._id, tradeId);
    res.json({ success: true, message: 'Trade supprimé avec succès' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/trades : Supprimer tout l'historique ou par catégorie
router.delete('/', authenticate, async (req, res) => {
  try {
    const { category = 'all' } = req.query;
    await fallbackStore.clearTrades(req.user._id, category);
    res.json({ success: true, message: `Historique (${category}) vidé avec succès.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trades/stats/summary : Statistiques unifiées et ventilation par catégorie
router.get('/stats/summary', authenticate, async (req, res) => {
  try {
    const { period = '30d', category } = req.query;
    const periodMap = { '24h': 1, '7d': 7, '30d': 30, '90d': 90, 'all': 3650 };
    const days = periodMap[period] || 30;
    const startTime = Date.now() - days * 24 * 60 * 60 * 1000;

    let all = await fetchAllUserTrades(req.user._id);
    all = all.filter(t => new Date(t.openedAt).getTime() >= startTime);

    if (category && category !== 'all') {
      all = all.filter(t => t.category === category);
    }

    const wins = all.filter(t => t.result === 'win').length;
    const losses = all.filter(t => t.result === 'loss').length;
    const totalProfit = +(all.reduce((sum, t) => sum + (t.profit || 0), 0)).toFixed(2);
    const totalStaked = +(all.reduce((sum, t) => sum + (t.stake || 0), 0)).toFixed(2);
    const winRate = all.length > 0 ? +((wins / all.length) * 100).toFixed(1) : 0;
    const bestTrade = all.length > 0 ? Math.max(...all.map(t => t.profit || 0)) : 0;
    const worstTrade = all.length > 0 ? Math.min(...all.map(t => t.profit || 0)) : 0;

    // Ventilation par catégorie (Analytics)
    const categories = ['deriv_manual', 'deriv_robot', 'binance', 'bybit'];
    const byCategory = {};
    categories.forEach(cat => {
      const catTrades = all.filter(t => t.category === cat);
      const catWins = catTrades.filter(t => t.result === 'win').length;
      const catLosses = catTrades.filter(t => t.result === 'loss').length;
      const catProfit = +(catTrades.reduce((s, t) => s + (t.profit || 0), 0)).toFixed(2);
      const catWinRate = catTrades.length > 0 ? +((catWins / catTrades.length) * 100).toFixed(1) : 0;
      byCategory[cat] = {
        totalTrades: catTrades.length,
        wins: catWins,
        losses: catLosses,
        profit: catProfit,
        winRate: catWinRate,
      };
    });

    // Évolution quotidienne
    const dailyProfits = {};
    all.forEach(t => {
      const day = new Date(t.openedAt).toISOString().split('T')[0];
      if (!dailyProfits[day]) dailyProfits[day] = 0;
      dailyProfits[day] = +(dailyProfits[day] + (t.profit || 0)).toFixed(2);
    });

    res.json({
      stats: {
        totalTrades: all.length,
        wins,
        losses,
        totalProfit,
        totalStaked,
        avgStake: all.length > 0 ? +(totalStaked / all.length).toFixed(2) : 0,
        bestTrade,
        worstTrade,
        winRate,
      },
      byCategory,
      dailyProfits,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
