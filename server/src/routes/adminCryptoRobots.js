'use strict';
const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const CryptoRobotConfig = require('../models/CryptoRobotConfig');
const cryptoCatalog = require('../services/CryptoRobotCatalogService');
const strategyCompiler = require('../services/StrategyCompilerService');

router.use(authenticate, requireAdmin);

// 1. Liste de tous les robots crypto et leurs stratégies
router.get('/', async (req, res) => {
  try {
    const robots = await CryptoRobotConfig.find().sort({ order: 1, createdAt: 1 });
    res.json({ robots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Tester une explication en langage naturel de stratégie (sans sauvegarder)
router.post('/parse-prompt', async (req, res) => {
  try {
    const { promptDescription } = req.body;
    if (!promptDescription) return res.status(400).json({ error: 'Description de la stratégie requise.' });

    const parsed = strategyCompiler.parsePrompt(promptDescription);
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });

    // Compiler et tester immédiatement sur des ticks simulés
    const tempConfig = {
      risk: {
        slAtrMultiplier: parsed.parsed.slMultiplier,
        tpAtrMultiplier: parsed.parsed.tpMultiplier,
      },
      indicatorsConfig: {
        emaFast: 9,
        emaSlow: 21,
        emaTrend: 200,
        rsiPeriod: 14,
      },
    };
    const signalFn = strategyCompiler.compileStrategyFunction(tempConfig);
    const simulation = strategyCompiler.testStrategyOnSample(signalFn);

    res.json({
      success: true,
      parsed: parsed.parsed,
      simulation,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Créer un nouveau robot personnalisé
router.post('/', async (req, res) => {
  try {
    const { name, key, tier, promptDescription, strategyMode, symbols, timeframe, minCapital, winRate, risk, indicatorsConfig } = req.body;
    if (!name) return res.status(400).json({ error: 'Le nom du robot est requis.' });

    const generatedKey = (key || name).toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
    const exists = await CryptoRobotConfig.findOne({ key: generatedKey });
    if (exists) return res.status(409).json({ error: 'Un robot avec cette clé existe déjà.' });

    const saved = await cryptoCatalog.saveRobot({
      key: generatedKey,
      name,
      tier: tier || 'starter',
      strategyTitle: req.body.strategyTitle || (promptDescription ? 'Stratégie Personnalisée Admin' : 'Stratégie Algorithmique'),
      strategyMode: strategyMode || (promptDescription ? 'prompt_nl' : 'builtin'),
      promptDescription: promptDescription || '',
      symbols: symbols && symbols.length ? symbols : ['BTCUSDT', 'ETHUSDT'],
      timeframe: timeframe || '5m',
      minCapital: minCapital || 10,
      winRate: winRate || '78-84%',
      badge: req.body.badge || 'Admin Custom',
      risk: risk || { slAtrMultiplier: 1.5, tpAtrMultiplier: 3.0, maxOpenTrades: 2 },
      indicatorsConfig: indicatorsConfig || {},
      isActive: true,
      isDefault: false,
    });

    res.status(201).json({ success: true, robot: saved, message: `Robot « ${saved.name} » créé et stratégie implémentée avec succès.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Modifier un robot existant ou sa stratégie
router.put('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const updateData = { ...req.body };
    delete updateData._id;

    const saved = await cryptoCatalog.saveRobot({ ...updateData, key });
    res.json({ success: true, robot: saved, message: `Robot « ${saved.name} » et stratégie mis à jour avec succès.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Supprimer un robot personnalisé
router.delete('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const bot = await CryptoRobotConfig.findOne({ key });
    if (!bot) return res.status(404).json({ error: 'Robot introuvable.' });
    if (bot.isDefault) return res.status(400).json({ error: 'Les robots système par défaut ne peuvent pas être supprimés (vous pouvez les désactiver).' });

    await cryptoCatalog.deleteRobot(key);
    res.json({ success: true, message: 'Robot supprimé avec succès.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Réinitialiser aux stratégies professionnelles par défaut
router.post('/reset-defaults', async (req, res) => {
  try {
    await cryptoCatalog.seedDefaultBots();
    await cryptoCatalog.reloadAll();
    const robots = await CryptoRobotConfig.find().sort({ order: 1 });
    res.json({ success: true, message: 'Robots et stratégies réinitialisés aux meilleures versions institutionnelles.', count: robots.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
