'use strict';
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { authenticate } = require('../middleware/auth');
const DerivAccount = require('../models/DerivAccount');
const DerivBot = require('../models/DerivBot');
const DerivSession = require('../models/DerivSession');
const DerivTrade = require('../models/DerivTrade');
const DerivService = require('../services/DerivService');
const derivEngine = require('../services/DerivRobotEngine');
const affiliateVerifier = require('../services/AffiliateVerificationService');
const User = require('../models/User');
const PlatformSettings = require('../models/PlatformSettings');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'default_secret', {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

const generateReferralCode = () => {
  return 'DT' + Math.random().toString(36).substring(2, 8).toUpperCase();
};

// ─── 0. Configuration publique OAuth Deriv ────────────────────────────────────
router.get('/oauth-config', async (req, res) => {
  try {
    const s = await PlatformSettings.findOne({ key: 'main' });
    const appId = String(s?.derivAppId || process.env.DERIV_APP_ID || '34HkkJSIK047dAEWEgXML').trim();
    const affiliateUrl = s?.derivAffiliateUrl || process.env.DERIV_AFFILIATE_URL || 'https://track.deriv.com/_DEFAULT/';
    const oauthUrl = `https://oauth.deriv.com/oauth2/authorize?app_id=${encodeURIComponent(appId)}&l=FR&brand=deriv`;
    res.json({ appId, affiliateUrl, oauthUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 0b. Connexion / Inscription 1-clic via OAuth Deriv + Synchronisation Soldes ───
router.post('/oauth-login', async (req, res) => {
  try {
    let { accounts = [], code, codeVerifier, redirectUri, clientId } = req.body;

    // Support OAuth 2.0 PKCE code exchange (https://auth.deriv.com/oauth2/token)
    if (code && (!accounts || accounts.length === 0)) {
      const s = await PlatformSettings.findOne({ key: 'main' });
      const resolvedClientId = String(clientId || s?.derivAppId || process.env.DERIV_APP_ID || '34HkkJSIK047dAEWEgXML').trim();
      const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: resolvedClientId,
        code: String(code),
        code_verifier: String(codeVerifier || ''),
        redirect_uri: String(redirectUri || ''),
      });
      const tokenResp = await fetch('https://auth.deriv.com/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams.toString(),
      });
      const tokenData = await tokenResp.json();
      if (!tokenResp.ok || !tokenData.access_token) {
        return res.status(400).json({
          error: tokenData.error_description || tokenData.error || 'Échec de l\'échange du code OAuth Deriv.',
        });
      }
      accounts = [{ acct: 'DERIV', token: tokenData.access_token, cur: 'USD' }];
    }

    if (!Array.isArray(accounts) || accounts.length === 0) {
      return res.status(400).json({ error: 'Aucun compte ou jeton Deriv reçu.' });
    }

    // 1. Autoriser et vérifier chaque jeton auprès de Deriv (REST v2 + WebSocket)
    const verifiedItems = [];
    for (const item of accounts) {
      if (!item?.token) continue;
      const ds = new DerivService({ token: item.token, loginId: item.acct !== 'DERIV' ? item.acct : '' });
      try {
        const authData = await ds.authorize();
        if (authData && authData.loginid) {
          // Si c'est un token OAuth 2.0 unique qui retourne plusieurs comptes dans account_list (Réel + Démo)
          if (item.acct === 'DERIV' && Array.isArray(authData.account_list) && authData.account_list.length > 1) {
            for (const subAcc of authData.account_list) {
              verifiedItems.push({
                token: item.token,
                cur: subAcc.currency || item.cur || 'USD',
                authData: {
                  ...authData,
                  loginid: subAcc.loginid,
                  currency: subAcc.currency || authData.currency || 'USD',
                  is_virtual: subAcc.is_virtual,
                  balance: subAcc.balance !== undefined ? subAcc.balance : authData.balance,
                },
              });
            }
          } else {
            verifiedItems.push({ token: item.token, cur: item.cur, authData });
          }
        }
      } catch (err) {
        console.warn(`Deriv OAuth authorize error for ${item.acct}:`, err.message);
      } finally {
        ds.close();
      }
    }

    if (verifiedItems.length === 0) {
      return res.status(400).json({
        error: 'Impossible de valider vos jetons auprès de Deriv. Veuillez réessayer la connexion.',
      });
    }

    // 2. Identifier ou créer automatiquement l'utilisateur RoyalBot
    let user = null;
    const authHeader = req.header('Authorization')?.replace('Bearer ', '');
    if (authHeader) {
      try {
        const decoded = jwt.verify(authHeader, process.env.JWT_SECRET || 'default_secret');
        user = await User.findById(decoded.userId);
      } catch (_) {}
    }

    const primaryAuth = verifiedItems[0].authData;
    const loginIds = verifiedItems.map(v => v.authData.loginid);

    if (!user) {
      // Chercher si un de ces comptes Deriv est déjà rattaché à un utilisateur RoyalBot
      const existingDerivAcc = await DerivAccount.findOne({ loginId: { $in: loginIds } });
      if (existingDerivAcc) {
        user = await User.findById(existingDerivAcc.user);
      }
    }

    if (!user) {
      const rawEmail = (primaryAuth.email || `deriv_${primaryAuth.user_id || primaryAuth.loginid}@deriv.royalbot.pro`)
        .toLowerCase()
        .trim();
      user = await User.findOne({ email: rawEmail });

      if (!user) {
        const fullName = String(primaryAuth.fullname || '').trim();
        const parts = fullName ? fullName.split(/\s+/) : [];
        const firstName = parts[0] || 'Trader';
        const lastName = parts.slice(1).join(' ') || primaryAuth.loginid || 'Deriv';

        user = await User.create({
          firstName,
          lastName,
          email: rawEmail,
          password: crypto.randomBytes(16).toString('hex'),
          referralCode: generateReferralCode(),
          isVerified: true,
          isActive: true,
          lastLogin: new Date(),
        });
      } else {
        user.lastLogin = new Date();
        await user.save();
      }
    }

    // 3. Synchroniser tous les comptes Deriv (Réel + Démo) et leurs soldes en direct
    const synced = [];
    for (const { token, cur, authData } of verifiedItems) {
      const isDemo = Boolean(authData.is_virtual === 1 || authData.loginid.startsWith('VRT'));
      const affCheck = await affiliateVerifier.verifyDerivAccount(authData, token).catch(() => ({ isAffiliated: false }));

      let acc = await DerivAccount.findOne({ user: user._id, loginId: authData.loginid }).select('+tokenEnc');
      if (!acc) {
        acc = new DerivAccount({
          user: user._id,
          label: isDemo ? `Compte Démo (${authData.loginid})` : `Compte Réel (${authData.loginid})`,
          loginId: authData.loginid,
          currency: authData.currency || cur || 'USD',
          balance: authData.balance !== undefined ? Number(authData.balance) : 0,
          isDemo,
          affiliateVerified: affCheck.isAffiliated,
          affiliateCheckedAt: new Date(),
          trialStartDate: new Date(),
          trialExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
      } else {
        acc.balance = authData.balance !== undefined ? Number(authData.balance) : acc.balance;
        acc.currency = authData.currency || acc.currency;
        if (affCheck.isAffiliated) acc.affiliateVerified = true;
      }

      acc.setToken(token);
      acc.lastCheck = new Date();
      await acc.save();

      const safe = acc.toObject();
      delete safe.tokenEnc;
      safe.isTrialValid = acc.isTrialValid();
      safe.trialDaysRemaining = acc.getTrialDaysRemaining();
      synced.push(safe);
    }

    const jwtToken = generateToken(user._id);
    res.json({
      success: true,
      token: jwtToken,
      user: user.toPublicJSON(),
      count: synced.length,
      accounts: synced,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 1. Comptes Deriv ────────────────────────────────────────────────────────
router.get('/accounts', authenticate, async (req, res) => {
  try {
    const rawAccounts = await DerivAccount.find({ user: req.user._id }).select('+tokenEnc');
    const forceRefresh = req.query.refresh === '1' || req.query.refresh === 'true';

    // Rafraîchir les soldes en direct depuis Deriv si demandé ou si dernier check > 15s
    await Promise.all(
      rawAccounts.map(async (acc) => {
        const ageMs = acc.lastCheck ? Date.now() - new Date(acc.lastCheck).getTime() : Infinity;
        if (!forceRefresh && ageMs < 15000) return;
        const token = acc.getToken();
        if (!token) return;
        const ds = new DerivService({ token, loginId: acc.loginId });
        try {
          const authData = await ds.authorize();
          if (authData && authData.balance !== undefined) {
            acc.balance = Number(authData.balance);
            acc.currency = authData.currency || acc.currency;
            acc.lastCheck = new Date();
            await acc.save();
          }
        } catch (_) {
        } finally {
          ds.close();
        }
      })
    );

    const accounts = rawAccounts.map(acc => {
      const obj = acc.toObject();
      delete obj.tokenEnc;
      obj.isTrialValid = acc.isTrialValid();
      obj.trialDaysRemaining = acc.getTrialDaysRemaining();
      return obj;
    });
    res.json({ accounts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/accounts/connect', authenticate, async (req, res) => {
  const ds = new DerivService({ token: req.body?.token });
  try {
    const { token, label } = req.body;
    if (!token) return res.status(400).json({ error: 'Token API Deriv requis.' });

    const authData = await ds.authorize();

    if (!authData || !authData.loginid) {
      return res.status(400).json({ error: 'Token Deriv invalide ou expiré.' });
    }

    // Vérifier si le compte est sous le lien de parrainage Deriv
    const affCheck = await affiliateVerifier.verifyDerivAccount(authData, token);

    const isDemo = Boolean(authData.is_virtual === 1 || authData.loginid.startsWith('VRT'));
    let acc = await DerivAccount.findOne({ user: req.user._id, loginId: authData.loginid }).select('+tokenEnc');
    if (!acc) {
      acc = new DerivAccount({
        user: req.user._id,
        label: label || (isDemo ? `Compte Démo (${authData.loginid})` : `Compte Réel (${authData.loginid})`),
        loginId: authData.loginid,
        currency: authData.currency || 'USD',
        balance: authData.balance !== undefined ? Number(authData.balance) : 0,
        isDemo,
        affiliateVerified: affCheck.isAffiliated,
        affiliateCheckedAt: new Date(),
        trialStartDate: new Date(),
        trialExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours d'essai offerts
      });
    } else {
      if (label) acc.label = label;
      acc.balance = authData.balance !== undefined ? Number(authData.balance) : acc.balance;
      acc.currency = authData.currency || acc.currency;
      if (affCheck.isAffiliated) acc.affiliateVerified = true;
    }

    acc.setToken(token);
    acc.lastCheck = new Date();
    await acc.save();

    const safe = acc.toObject();
    delete safe.tokenEnc;
    safe.isTrialValid = acc.isTrialValid();
    safe.trialDaysRemaining = acc.getTrialDaysRemaining();

    res.json({ success: true, account: safe, authData, affiliate: affCheck });
  } catch (err) {
    res.status(400).json({ error: err.message });
  } finally {
    ds.close();
  }
});

// Synchronisation multi-comptes Deriv issue de la redirection OAuth (Real + Démo)
router.post('/accounts/oauth-sync', authenticate, async (req, res) => {
  try {
    const { accounts = [] } = req.body;
    if (!Array.isArray(accounts) || accounts.length === 0) {
      return res.status(400).json({ error: 'Aucun compte Deriv transmis pour la synchronisation.' });
    }

    const synced = [];
    for (const item of accounts) {
      const token = item.token;
      if (!token) continue;

      const ds = new DerivService({ token, loginId: item.acct });
      try {
        const authData = await ds.authorize();
        if (!authData || !authData.loginid) continue;

        const isDemo = Boolean(authData.is_virtual === 1 || authData.loginid.startsWith('VRT'));
        const affCheck = await affiliateVerifier.verifyDerivAccount(authData, token).catch(() => ({ isAffiliated: false }));

        let acc = await DerivAccount.findOne({ user: req.user._id, loginId: authData.loginid }).select('+tokenEnc');
        if (!acc) {
          acc = new DerivAccount({
            user: req.user._id,
            label: isDemo ? `Compte Démo (${authData.loginid})` : `Compte Réel (${authData.loginid})`,
            loginId: authData.loginid,
            currency: authData.currency || item.cur || 'USD',
            balance: authData.balance !== undefined ? Number(authData.balance) : 0,
            isDemo,
            affiliateVerified: affCheck.isAffiliated,
            affiliateCheckedAt: new Date(),
            trialStartDate: new Date(),
            trialExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          });
        } else {
          acc.balance = authData.balance !== undefined ? Number(authData.balance) : acc.balance;
          acc.currency = authData.currency || acc.currency;
          if (affCheck.isAffiliated) acc.affiliateVerified = true;
        }

        acc.setToken(token);
        acc.lastCheck = new Date();
        await acc.save();

        const safe = acc.toObject();
        delete safe.tokenEnc;
        safe.isTrialValid = acc.isTrialValid();
        safe.trialDaysRemaining = acc.getTrialDaysRemaining();
        synced.push(safe);
      } catch (err) {
        console.warn(`Deriv OAuth sync item error for ${item.acct}:`, err.message);
      } finally {
        ds.close();
      }
    }

    if (synced.length === 0) {
      return res.status(400).json({ error: 'Impossible de synchroniser les comptes Deriv. Tokens invalides ou expirés.' });
    }

    res.json({ success: true, count: synced.length, accounts: synced });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/accounts/:id/test', authenticate, async (req, res) => {
  let ds = null;
  try {
    const acc = await DerivAccount.findOne({ _id: req.params.id, user: req.user._id }).select('+tokenEnc');
    if (!acc) return res.status(404).json({ error: 'Compte Deriv introuvable.' });

    const token = acc.getToken();
    ds = new DerivService({ token, loginId: acc.loginId });
    const authData = await ds.authorize();

    acc.balance = authData.balance !== undefined ? Number(authData.balance) : acc.balance;
    acc.lastCheck = new Date();
    await acc.save();

    res.json({
      success: true,
      balance: acc.balance,
      isTrialValid: acc.isTrialValid(),
      trialDaysRemaining: acc.getTrialDaysRemaining(),
      affiliateVerified: acc.affiliateVerified,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (ds) ds.close();
  }
});

router.delete('/accounts/:id', authenticate, async (req, res) => {
  try {
    const acc = await DerivAccount.findOne({ _id: req.params.id, user: req.user._id });
    if (!acc) return res.status(404).json({ error: 'Compte introuvable.' });

    // Arrêter sessions actives
    const sessions = await DerivSession.find({ derivAccount: acc._id, status: 'active' });
    for (const s of sessions) await derivEngine.stopSession(s._id, req.user._id);

    await DerivAccount.findByIdAndDelete(acc._id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 2. SmartTrader Manuel (Graphiques & Ordres) ──────────────────────────────
router.get('/symbols', async (req, res) => {
  try {
    const ds = new DerivService({ token: '' });
    const symbols = await ds.getActiveSymbols();
    res.json({ symbols });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/ticks/:symbol', async (req, res) => {
  try {
    const ds = new DerivService({ token: '' });
    const history = await ds.getTicksHistory(req.params.symbol, 100);
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/proposal', authenticate, async (req, res) => {
  try {
    const { accountId, symbol, contractType, amount, duration, durationUnit, barrier } = req.body;
    const acc = await DerivAccount.findOne({ _id: accountId, user: req.user._id }).select('+tokenEnc');
    if (!acc) return res.status(404).json({ error: 'Compte introuvable.' });

    const ds = new DerivService({ token: acc.getToken(), loginId: acc.loginId });
    const proposal = await ds.getProposal({
      symbol,
      contractType,
      amount,
      duration,
      durationUnit,
      barrier,
      currency: acc.currency,
    });
    res.json({ proposal });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/manual-trade', authenticate, async (req, res) => {
  try {
    const { accountId, symbol, contractType, amount, duration, durationUnit, barrier } = req.body;
    const acc = await DerivAccount.findOne({ _id: accountId, user: req.user._id }).select('+tokenEnc');
    if (!acc) return res.status(404).json({ error: 'Compte introuvable.' });

    const ds = new DerivService({ token: acc.getToken(), loginId: acc.loginId });
    const proposal = await ds.getProposal({
      symbol,
      contractType,
      amount,
      duration,
      durationUnit,
      barrier,
      currency: acc.currency,
    });

    if (!proposal?.id) return res.status(400).json({ error: 'Impossible d\'obtenir la proposition de contrat.' });

    const buyRes = await ds.buyContract(proposal.id, proposal.ask_price);
    if (!buyRes?.contract_id) return res.status(400).json({ error: 'Achat de contrat échoué.' });

    const trade = await DerivTrade.create({
      user: req.user._id,
      derivAccount: acc._id,
      isManual: true,
      contractId: String(buyRes.contract_id),
      transactionId: String(buyRes.transaction_id || ''),
      symbol,
      contractType,
      barrier: barrier || '',
      stake: Number(proposal.ask_price),
      payout: Number(proposal.payout || 0),
      status: 'open',
      openedAt: new Date(),
    });

    res.json({ success: true, trade, buyRes });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/contracts/:contractId/status', authenticate, async (req, res) => {
  try {
    const trade = await DerivTrade.findOne({ contractId: req.params.contractId, user: req.user._id });
    if (!trade) return res.status(404).json({ error: 'Contrat introuvable.' });

    const acc = await DerivAccount.findById(trade.derivAccount).select('+tokenEnc');
    if (!acc) return res.status(404).json({ error: 'Compte introuvable.' });

    const ds = new DerivService({ token: acc.getToken() });
    const status = await ds.getContractStatus(trade.contractId);

    if (status?.is_expired || status?.status === 'won' || status?.status === 'lost') {
      const isWon = status.status === 'won';
      trade.status = isWon ? 'won' : 'lost';
      trade.profit = Number(status.profit || (isWon ? (trade.payout - trade.stake) : -trade.stake));
      trade.closedAt = new Date();
      await trade.save();
    }

    res.json({ status, trade });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 3. Robots Automatiques Deriv ───────────────────────────────────────────
router.get('/bots', async (req, res) => {
  try {
    const bots = await DerivBot.find({ isActive: true }).sort({ order: 1 });
    res.json({ bots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sessions/start', authenticate, async (req, res) => {
  try {
    const { accountId, botId, settings } = req.body;
    if (!accountId || !botId) {
      return res.status(400).json({ error: 'accountId et botId requis.' });
    }

    const session = await derivEngine.startSession(req.user._id, accountId, botId, settings || {});
    res.json({ success: true, session });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/sessions/:id/stop', authenticate, async (req, res) => {
  try {
    res.json({ session: await derivEngine.stopSession(req.params.id, req.user._id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sessions/:id/pause', authenticate, async (req, res) => {
  try {
    res.json({ session: await derivEngine.pauseSession(req.params.id, req.user._id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sessions/:id/resume', authenticate, async (req, res) => {
  try {
    res.json({ session: await derivEngine.resumeSession(req.params.id, req.user._id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/sessions', authenticate, async (req, res) => {
  try {
    const sessions = await DerivSession.find({ user: req.user._id })
      .populate('derivAccount', 'label loginId isDemo')
      .populate('bot', 'name badge contractType')
      .sort({ createdAt: -1 });
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/trades', authenticate, async (req, res) => {
  try {
    const trades = await DerivTrade.find({ user: req.user._id }).sort({ openedAt: -1 }).limit(100);
    res.json({ trades });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
