'use strict';
const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const DerivBot = require('../models/DerivBot');
const DerivAccount = require('../models/DerivAccount');
const DerivSession = require('../models/DerivSession');
const DerivTrade = require('../models/DerivTrade');

router.use(authenticate, requireAdmin);

// ─── 1. Gestion des Robots Deriv (Création illimitée) ─────────────────────────
router.get('/bots', async (req, res) => {
  try {
    const bots = await DerivBot.find().sort({ order: 1, createdAt: -1 });
    res.json({ bots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/bots', async (req, res) => {
  try {
    const { name, slug, contractType, symbols, tier, strategyType, defaultSettings, winRate, badge } = req.body;
    if (!name || !slug) return res.status(400).json({ error: 'Nom et slug requis.' });

    const exists = await DerivBot.findOne({ slug: slug.toLowerCase().trim() });
    if (exists) return res.status(409).json({ error: 'Un robot avec ce slug existe déjà.' });

    const bot = await DerivBot.create({
      name,
      slug: slug.toLowerCase().trim(),
      contractType: contractType || 'DIGITOVER',
      symbols: symbols || ['R_100', 'R_75', 'R_50', 'R_25', 'R_10'],
      tier: tier || 'all',
      strategyType: strategyType || 'digit_analyzer',
      defaultSettings: defaultSettings || {},
      winRate: winRate || '78-84%',
      badge: badge || 'Automatisé',
      fileName: req.body.fileName || '',
      fileType: req.body.fileType || 'none',
      fileContent: req.body.fileContent || '',
      parsedLogic: req.body.parsedLogic || {},
    });

    res.status(201).json({ success: true, bot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Analyse et extraction des paramètres d'un fichier Deriv Bot (XML / JSON)
router.post('/bots/parse-file', async (req, res) => {
  try {
    const { fileContent, fileName } = req.body;
    if (!fileContent) return res.status(400).json({ error: 'Contenu du fichier requis.' });

    const parser = require('../services/DerivBotFileParser');
    const parsed = parser.parse(fileContent, fileName || 'deriv_bot.xml');
    res.json({ success: true, parsed });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Création d'un robot Deriv directement depuis un fichier uploadé
router.post('/bots/upload-file', async (req, res) => {
  try {
    const { fileContent, fileName, tier, customName } = req.body;
    if (!fileContent) return res.status(400).json({ error: 'Contenu du fichier requis.' });

    const parser = require('../services/DerivBotFileParser');
    const parsed = parser.parse(fileContent, fileName || 'deriv_bot.xml');

    const botName = (customName || parsed.name).trim();
    const slug = (botName + '-' + Date.now().toString().slice(-4))
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const bot = await DerivBot.create({
      name: botName,
      slug,
      tier: tier || 'all',
      contractType: parsed.contractType,
      symbols: parsed.symbols,
      strategyType: 'file_custom',
      defaultSettings: parsed.defaultSettings,
      winRate: parsed.winRate || '80-86%',
      badge: 'Fichier Bot XML',
      description: parsed.description,
      fileName: parsed.fileName,
      fileType: parsed.fileType,
      fileContent: fileContent,
      parsedLogic: parsed.parsedLogic,
    });

    res.status(201).json({ success: true, bot, message: `Robot Deriv « ${bot.name} » créé avec succès à partir du fichier.` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/bots/:id', async (req, res) => {
  try {
    const bot = await DerivBot.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!bot) return res.status(404).json({ error: 'Robot introuvable.' });
    res.json({ success: true, bot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/bots/:id', async (req, res) => {
  try {
    const activeSessions = await DerivSession.countDocuments({ bot: req.params.id, status: 'active' });
    if (activeSessions > 0) {
      return res.status(409).json({ error: `Impossible de supprimer : ${activeSessions} session(s) active(s) sur ce robot.` });
    }
    await DerivBot.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Robot supprimé.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 2. Suivi des Comptes & Périodes d'essai 7 jours ─────────────────────────
router.get('/accounts', async (req, res) => {
  try {
    const accounts = await DerivAccount.find()
      .populate('user', 'firstName lastName email subscription')
      .sort({ createdAt: -1 });

    const enriched = accounts.map(acc => {
      const o = acc.toObject();
      o.isTrialValid = acc.isTrialValid();
      o.trialDaysRemaining = acc.getTrialDaysRemaining();
      return o;
    });

    res.json({ accounts: enriched });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Validation ou Révocation de l'affiliation en 1 clic
router.post('/accounts/:id/toggle-affiliate', async (req, res) => {
  try {
    const acc = await DerivAccount.findById(req.params.id);
    if (!acc) return res.status(404).json({ error: 'Compte introuvable.' });

    acc.affiliateVerified = !acc.affiliateVerified;
    acc.affiliateCheckedAt = new Date();
    await acc.save();

    res.json({ success: true, affiliateVerified: acc.affiliateVerified });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Prolonger la période d'essai de N jours
router.post('/accounts/:id/extend-trial', async (req, res) => {
  try {
    const { days = 7 } = req.body;
    const acc = await DerivAccount.findById(req.params.id);
    if (!acc) return res.status(404).json({ error: 'Compte introuvable.' });

    const currentExpiry = acc.trialExpiresAt && new Date(acc.trialExpiresAt) > new Date()
      ? new Date(acc.trialExpiresAt)
      : new Date();

    acc.trialExpiresAt = new Date(currentExpiry.getTime() + days * 24 * 60 * 60 * 1000);
    await acc.save();

    res.json({
      success: true,
      trialExpiresAt: acc.trialExpiresAt,
      trialDaysRemaining: acc.getTrialDaysRemaining(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 3. KPIs & Statistiques Deriv ───────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const totalAccounts = await DerivAccount.countDocuments();
    const verifiedAffiliates = await DerivAccount.countDocuments({ affiliateVerified: true });
    const totalBots = await DerivBot.countDocuments();
    const activeSessions = await DerivSession.countDocuments({ status: 'active' });
    const totalTrades = await DerivTrade.countDocuments();

    res.json({
      totalAccounts,
      verifiedAffiliates,
      totalBots,
      activeSessions,
      totalTrades,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
