'use strict';
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { isAdmin } = require('../lib/permissions');
const BybitAccount = require('../models/BybitAccount');
const RobotSession = require('../models/RobotSession');
const BybitService = require('../services/BybitService');
const robotEngine = require('../services/RobotEngine');
const affiliateVerifier = require('../services/AffiliateVerificationService');
const { ROBOT_CATALOG } = require('../config/binanceRobots');

// ─── 1. Comptes Bybit ────────────────────────────────────────────────────────
router.get('/accounts', authenticate, async (req, res) => {
  try {
    const accounts = await BybitAccount.find({ user: req.user._id });
    res.json({ accounts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/accounts/connect', authenticate, async (req, res) => {
  try {
    const { apiKey, apiSecret, label, category = 'unified', isTestnet = false } = req.body;
    if (!apiKey || !apiSecret) {
      return res.status(400).json({ error: 'apiKey et apiSecret Bybit requis.' });
    }

    const bx = new BybitService({ apiKey, apiSecret, isTestnet });
    const test = await bx.testConnection();

    if (!test.reading) {
      return res.status(400).json({ error: 'Clés Bybit invalides ou lecture refusée.', details: test.errors });
    }

    if (test.withdraw) {
      return res.status(400).json({
        error: 'SÉCURITÉ : La permission de RETRAIT est activée sur votre clé Bybit. Désactivez-la sur Bybit avant de connecter.',
      });
    }

    // Vérification de parrainage automatique
    let isAffiliated = false;
    if (test.uid) {
      const affCheck = await affiliateVerifier.verifyBybitAccount(test.uid);
      isAffiliated = affCheck.isAffiliated;
    }

    const acc = new BybitAccount({
      user: req.user._id,
      label: label || 'Bybit Unified',
      category,
      isTestnet,
      bybitUid: test.uid || '',
      affiliateVerified: isAffiliated,
      affiliateCheckedAt: new Date(),
    });

    acc.setKeys(apiKey, apiSecret);
    acc.permissions = {
      spot: test.spot,
      linear: test.linear,
      reading: test.reading,
      withdraw: false,
    };
    acc.spotUSDT = test.spotUSDT || 0;
    acc.futuresUSDT = test.futuresUSDT || 0;
    acc.status = (test.spot || test.linear) ? 'active' : 'error';
    acc.lastCheck = new Date();
    acc.connectedAt = new Date();
    await acc.save();

    const safe = acc.toObject();
    delete safe.apiKeyEnc;
    delete safe.apiSecretEnc;

    res.json({ success: true, account: safe, test });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/accounts/:id/test', authenticate, async (req, res) => {
  try {
    const acc = await BybitAccount.findOne({ _id: req.params.id, user: req.user._id }).select('+apiKeyEnc +apiSecretEnc');
    if (!acc) return res.status(404).json({ error: 'Compte Bybit introuvable.' });

    const { apiKey, apiSecret } = acc.getKeys();
    const bx = new BybitService({ apiKey, apiSecret, isTestnet: acc.isTestnet });
    const test = await bx.testConnection();

    acc.status = (test.spot || test.linear) ? 'active' : 'error';
    acc.spotUSDT = test.spotUSDT || acc.spotUSDT;
    acc.futuresUSDT = test.futuresUSDT || acc.futuresUSDT;
    acc.lastCheck = new Date();
    await acc.save();

    res.json({ test, status: acc.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/accounts/:id', authenticate, async (req, res) => {
  try {
    const acc = await BybitAccount.findOne({ _id: req.params.id, user: req.user._id });
    if (!acc) return res.status(404).json({ error: 'Compte Bybit introuvable.' });

    await BybitAccount.findByIdAndDelete(acc._id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 2. Robots disponibles (Partagés avec Binance) ───────────────────────────
router.get('/robots', authenticate, (req, res) => {
  res.json({ robots: ROBOT_CATALOG });
});

// ─── 3. Vérification manuelle de parrainage ──────────────────────────────────
router.post('/accounts/:id/verify-affiliate', authenticate, async (req, res) => {
  try {
    const { uid } = req.body;
    const acc = await BybitAccount.findOne({ _id: req.params.id, user: req.user._id });
    if (!acc) return res.status(404).json({ error: 'Compte introuvable.' });

    const check = await affiliateVerifier.verifyBybitAccount(uid || acc.bybitUid);
    acc.affiliateVerified = check.isAffiliated;
    acc.affiliateCheckedAt = new Date();
    if (uid) acc.bybitUid = uid;
    await acc.save();

    res.json({ success: true, isAffiliated: acc.affiliateVerified, message: check.reason });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
