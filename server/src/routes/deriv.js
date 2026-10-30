'use strict';
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { authenticate } = require('../middleware/auth');
const DerivSession = require('../models/DerivSession');
const DerivTrade = require('../models/DerivTrade');
const DerivService = require('../services/DerivService');
const derivEngine = require('../services/DerivRobotEngine');
const affiliateVerifier = require('../services/AffiliateVerificationService');
const fallbackStore = require('../services/RuntimeFallbackStore');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || '1b38d6a0db1247e468332213f2bb0e74f0e55bc2e676701cecbf15543fc45ba8', {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// ─── 0. Configuration publique OAuth Deriv ────────────────────────────────────
router.get('/oauth-config', async (req, res) => {
  try {
    const s = await fallbackStore.getSettings();
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
      const s = await fallbackStore.getSettings();
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
      const tokenData = await tokenResp.json().catch(() => ({}));
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
        const decoded = jwt.verify(authHeader, process.env.JWT_SECRET || '1b38d6a0db1247e468332213f2bb0e74f0e55bc2e676701cecbf15543fc45ba8');
        user = await fallbackStore.findUserById(decoded.userId);
      } catch (_) {}
    }

    const primaryAuth = verifiedItems[0].authData;
    const loginIds = verifiedItems.map(v => v.authData.loginid);

    if (!user) {
      user = await fallbackStore.findOrCreateDerivUser({ loginIds, primaryAuth });
    }

    // 3. Synchroniser tous les comptes Deriv (Réel + Démo) et leurs soldes en direct
    const synced = [];
    for (const { token, cur, authData } of verifiedItems) {
      const isDemo = Boolean(authData.is_virtual === 1 || authData.loginid.startsWith('VRT') || String(authData.loginid).startsWith('DOT'));
      const affCheck = await affiliateVerifier.verifyDerivAccount(authData, token).catch(() => ({ isAffiliated: true }));

      const acc = await fallbackStore.upsertDerivAccount({
        userId: user._id,
        loginId: authData.loginid,
        label: isDemo ? `Compte Démo (${authData.loginid})` : `Compte Réel (${authData.loginid})`,
        currency: authData.currency || cur || 'USD',
        balance: authData.balance !== undefined ? Number(authData.balance) : 0,
        isDemo,
        affiliateVerified: affCheck.isAffiliated,
        token,
      });

      const safe = acc.toObject ? acc.toObject() : { ...acc };
      delete safe.tokenEnc;
      safe.isTrialValid = acc.isTrialValid ? acc.isTrialValid() : true;
      safe.trialDaysRemaining = acc.getTrialDaysRemaining ? acc.getTrialDaysRemaining() : 7;
      synced.push(safe);
    }

    const jwtToken = generateToken(user._id);
    res.json({
      success: true,
      token: jwtToken,
      user: user.toPublicJSON ? user.toPublicJSON() : user,
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
    const rawAccounts = await fallbackStore.getDerivAccountsByUser(req.user._id);
    const forceRefresh = req.query.refresh === '1' || req.query.refresh === 'true';

    // Rafraîchir les soldes en direct depuis Deriv si demandé ou si dernier check > 15s
    await Promise.all(
      rawAccounts.map(async (acc) => {
        const ageMs = acc.lastCheck ? Date.now() - new Date(acc.lastCheck).getTime() : Infinity;
        if (!forceRefresh && ageMs < 15000) return;
        const token = acc.getToken ? acc.getToken() : '';
        if (!token) return;
        const ds = new DerivService({ token, loginId: acc.loginId });
        try {
          const authData = await ds.authorize();
          if (authData && authData.balance !== undefined) {
            acc.balance = Number(authData.balance);
            acc.currency = authData.currency || acc.currency;
            acc.lastCheck = new Date();
            if (acc.save) await acc.save();
          }
        } catch (_) {
        } finally {
          ds.close();
        }
      })
    );

    const accounts = rawAccounts.map(acc => {
      const obj = acc.toObject ? acc.toObject() : { ...acc };
      delete obj.tokenEnc;
      obj.isTrialValid = acc.isTrialValid ? acc.isTrialValid() : true;
      obj.trialDaysRemaining = acc.getTrialDaysRemaining ? acc.getTrialDaysRemaining() : 7;
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

    const affCheck = await affiliateVerifier.verifyDerivAccount(authData, token);
    const isDemo = Boolean(authData.is_virtual === 1 || authData.loginid.startsWith('VRT'));

    const acc = await fallbackStore.upsertDerivAccount({
      userId: req.user._id,
      loginId: authData.loginid,
      label: label || (isDemo ? `Compte Démo (${authData.loginid})` : `Compte Réel (${authData.loginid})`),
      currency: authData.currency || 'USD',
      balance: authData.balance !== undefined ? Number(authData.balance) : 0,
      isDemo,
      affiliateVerified: affCheck.isAffiliated,
      token,
    });

    const safe = acc.toObject ? acc.toObject() : { ...acc };
    delete safe.tokenEnc;
    safe.isTrialValid = acc.isTrialValid ? acc.isTrialValid() : true;
    safe.trialDaysRemaining = acc.getTrialDaysRemaining ? acc.getTrialDaysRemaining() : 7;

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
        const affCheck = await affiliateVerifier.verifyDerivAccount(authData, token).catch(() => ({ isAffiliated: true }));

        const acc = await fallbackStore.upsertDerivAccount({
          userId: req.user._id,
          loginId: authData.loginid,
          label: isDemo ? `Compte Démo (${authData.loginid})` : `Compte Réel (${authData.loginid})`,
          currency: authData.currency || item.cur || 'USD',
          balance: authData.balance !== undefined ? Number(authData.balance) : 0,
          isDemo,
          affiliateVerified: affCheck.isAffiliated,
          token,
        });

        const safe = acc.toObject ? acc.toObject() : { ...acc };
        delete safe.tokenEnc;
        safe.isTrialValid = acc.isTrialValid ? acc.isTrialValid() : true;
        safe.trialDaysRemaining = acc.getTrialDaysRemaining ? acc.getTrialDaysRemaining() : 7;
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
    const acc = await fallbackStore.getDerivAccountById(req.params.id, req.user._id);
    if (!acc) return res.status(404).json({ error: 'Compte Deriv introuvable.' });

    const token = acc.getToken ? acc.getToken() : '';
    ds = new DerivService({ token, loginId: acc.loginId });
    const authData = await ds.authorize();

    acc.balance = authData.balance !== undefined ? Number(authData.balance) : acc.balance;
    acc.lastCheck = new Date();
    if (acc.save) await acc.save();

    res.json({
      success: true,
      balance: acc.balance,
      isTrialValid: acc.isTrialValid ? acc.isTrialValid() : true,
      trialDaysRemaining: acc.getTrialDaysRemaining ? acc.getTrialDaysRemaining() : 7,
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
    const acc = await fallbackStore.getDerivAccountById(req.params.id, req.user._id);
    if (!acc) return res.status(404).json({ error: 'Compte introuvable.' });

    try {
      const sessions = await fallbackStore.getActiveDerivSessions({ derivAccount: acc._id });
      for (const s of sessions) await derivEngine.stopSession(s._id, req.user._id);
    } catch (_) {}

    await fallbackStore.deleteDerivAccount(acc._id, req.user._id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 2. SmartTrader Manuel (Graphiques & Ordres) ──────────────────────────────
router.get('/symbols', async (req, res) => {
  const ds = new DerivService({ token: '' });
  try {
    const symbols = await ds.getActiveSymbols();
    res.json({ symbols });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    ds.close();
  }
});

router.get('/ticks/:symbol', async (req, res) => {
  const ds = new DerivService({ token: '' });
  try {
    const history = await ds.getTicksHistory(req.params.symbol, 100);
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    ds.close();
  }
});

router.post('/proposal', authenticate, async (req, res) => {
  let ds = null;
  try {
    const { accountId, symbol, contractType, amount, duration, durationUnit, barrier } = req.body;
    const acc = await fallbackStore.getDerivAccountById(accountId, req.user._id);
    if (!acc) return res.status(404).json({ error: 'Compte introuvable.' });

    ds = new DerivService({ token: acc.getToken(), loginId: acc.loginId });
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
  } finally {
    if (ds) ds.close();
  }
});

router.post('/manual-trade', authenticate, async (req, res) => {
  let ds = null;
  try {
    const { accountId, symbol, contractType, amount, duration, durationUnit, barrier } = req.body;
    const acc = await fallbackStore.getDerivAccountById(accountId, req.user._id);
    if (!acc) return res.status(404).json({ error: 'Compte introuvable.' });

    ds = new DerivService({ token: acc.getToken(), loginId: acc.loginId });
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

    if (buyRes.balance_after !== undefined) {
      acc.balance = Number(buyRes.balance_after);
      acc.lastCheck = new Date();
      if (acc.save) await acc.save().catch(() => {});
    }

    const trade = await fallbackStore.createDerivTrade({
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

    // Vérifier automatiquement le résultat du contrat après expiration
    const waitSeconds = Math.max(3, (Number(duration) || 5) + 2);
    const activeDs = ds;
    ds = null;
    setTimeout(async () => {
      try {
        const status = await activeDs.getContractStatus(buyRes.contract_id).catch(() => null);
        if (status) {
          const isWon = status.status === 'won' || Number(status.profit) > 0;
          trade.status = isWon ? 'won' : 'lost';
          trade.profit =
            status.profit !== undefined
              ? Number(status.profit)
              : isWon
              ? +(trade.payout - trade.stake).toFixed(2)
              : -trade.stake;
          trade.closedAt = new Date();
          if (trade.save) await trade.save().catch(() => {});
        }
        const authAfter = await activeDs.authorize().catch(() => null);
        if (authAfter?.balance !== undefined) {
          acc.balance = Number(authAfter.balance);
          acc.lastCheck = new Date();
          if (acc.save) await acc.save().catch(() => {});
        }
      } catch (_) {
      } finally {
        activeDs.close();
      }
    }, waitSeconds * 1000);

    res.json({ success: true, trade, buyRes });
  } catch (err) {
    res.status(400).json({ error: err.message });
  } finally {
    if (ds) ds.close();
  }
});

router.get('/contracts/:contractId/status', authenticate, async (req, res) => {
  let ds = null;
  try {
    const trade = await fallbackStore.findDerivTradeByContractId(req.params.contractId, req.user._id);
    if (!trade) return res.status(404).json({ error: 'Contrat introuvable.' });

    const acc = await fallbackStore.getDerivAccountById(trade.derivAccount, req.user._id);
    if (!acc) return res.status(404).json({ error: 'Compte introuvable.' });

    ds = new DerivService({ token: acc.getToken(), loginId: acc.loginId });
    const status = await ds.getContractStatus(trade.contractId);

    if (status?.is_expired || status?.status === 'won' || status?.status === 'lost') {
      const isWon = status.status === 'won';
      trade.status = isWon ? 'won' : 'lost';
      trade.profit = Number(status.profit || (isWon ? (trade.payout - trade.stake) : -trade.stake));
      trade.closedAt = new Date();
      if (trade.save) await trade.save().catch(() => {});
    }

    res.json({ status, trade });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (ds) ds.close();
  }
});

// ─── 3. Robots Automatiques Deriv ───────────────────────────────────────────
router.get('/bots', async (req, res) => {
  try {
    const bots = await fallbackStore.getDerivBots();
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
    const sessions = await fallbackStore.getDerivSessionsByUser(req.user._id);
    res.json({ sessions });
  } catch (err) {
    res.json({ sessions: [] });
  }
});

router.get('/trades', authenticate, async (req, res) => {
  try {
    const trades = await fallbackStore.getDerivTradesByUser(req.user._id);
    res.json({ trades });
  } catch (err) {
    res.json({ trades: [] });
  }
});

router.delete('/trades', authenticate, async (req, res) => {
  try {
    await fallbackStore.clearTrades(req.user._id, 'deriv');
    res.json({ success: true, message: 'Flux des contrats Deriv vidé avec succès.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
