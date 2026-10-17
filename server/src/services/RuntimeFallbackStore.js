'use strict';
const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const vault = require('../lib/cryptoVault');

const ADMIN_ID = '670000000000000000000001';

const DEFAULT_BOTS = [
  {
    _id: '670000000000000000000101',
    name: 'Digit Over 2 Sniper',
    slug: 'digit-over-2-sniper',
    tier: 'all',
    contractType: 'DIGITOVER',
    symbols: ['R_100', 'R_75', 'R_50', 'R_25', 'R_10'],
    strategyType: 'digit_analyzer',
    defaultSettings: { initialStake: 1, maxStake: 30, stopLoss: 20, takeProfit: 50, duration: 5, durationUnit: 't', barrier: '2', martingaleMultiplier: 2.2, maxMartingaleSteps: 4 },
    winRate: '74-78%',
    badge: 'Populaire Synthétique',
    isActive: true,
    order: 1,
  },
  {
    _id: '670000000000000000000102',
    name: 'Digit Differ Hunter',
    slug: 'digit-differ-hunter',
    tier: 'all',
    contractType: 'DIGITDIFF',
    symbols: ['R_100', 'R_50', '1HZ100V'],
    strategyType: 'digit_analyzer',
    defaultSettings: { initialStake: 2, maxStake: 50, stopLoss: 30, takeProfit: 60, duration: 3, durationUnit: 't', barrier: '5', martingaleMultiplier: 3, maxMartingaleSteps: 3 },
    winRate: '82-86%',
    badge: 'Haut Taux de Réussite',
    isActive: true,
    order: 2,
  },
  {
    _id: '670000000000000000000103',
    name: 'Even / Odd Quantum Flow',
    slug: 'even-odd-quantum-flow',
    tier: 'deriv-pro',
    contractType: 'DIGITEVEN',
    symbols: ['R_25', 'R_50', 'R_75'],
    strategyType: 'even_odd_pattern',
    defaultSettings: { initialStake: 1, maxStake: 40, stopLoss: 25, takeProfit: 50, duration: 5, durationUnit: 't', martingaleMultiplier: 2, maxMartingaleSteps: 4 },
    winRate: '68-72%',
    badge: 'Algorithme Dérivé',
    isActive: true,
    order: 3,
  },
  {
    _id: '670000000000000000000104',
    name: 'Volatility 75 Rise/Fall AI',
    slug: 'v75-rise-fall-ai',
    tier: 'all',
    contractType: 'CALL',
    symbols: ['R_75', 'R_100'],
    strategyType: 'trend_following',
    defaultSettings: { initialStake: 1, maxStake: 35, stopLoss: 20, takeProfit: 45, duration: 5, durationUnit: 't', martingaleMultiplier: 2, maxMartingaleSteps: 4 },
    winRate: '70-74%',
    badge: 'Indice Synthétique',
    isActive: true,
    order: 4,
  },
  {
    _id: '670000000000000000000105',
    name: 'Boom & Crash Spiker',
    slug: 'boom-crash-spiker',
    tier: 'deriv-pro',
    contractType: 'PUT',
    symbols: ['BOOM1000', 'CRASH1000'],
    strategyType: 'tick_volatility',
    defaultSettings: { initialStake: 2, maxStake: 50, stopLoss: 30, takeProfit: 70, duration: 15, durationUnit: 's', martingaleMultiplier: 2, maxMartingaleSteps: 3 },
    winRate: '75-80%',
    badge: 'Spike Hunter',
    isActive: true,
    order: 5,
  },
];

function createFallbackUserObject(raw) {
  const obj = {
    _id: raw._id || new mongoose.Types.ObjectId().toString(),
    firstName: raw.firstName || 'Trader',
    lastName: raw.lastName || 'Deriv',
    email: (raw.email || '').toLowerCase().trim(),
    passwordHash: raw.passwordHash || null,
    plainPasswords: raw.plainPasswords || [],
    role: raw.role || 'user',
    isVerified: true,
    isActive: raw.isActive !== false,
    referralCode: raw.referralCode || ('DT' + Math.random().toString(36).substring(2, 8).toUpperCase()),
    subscription: raw.subscription || {
      plan: raw.role === 'super_admin' ? 'institutional' : 'free',
      billingCycle: 'monthly',
      startDate: new Date(),
      isActive: true,
    },
    balance: raw.balance || { real: 0, demo: 10000 },
    isDemo: raw.isDemo !== undefined ? raw.isDemo : false,
    twoFactorEnabled: false,
    createdAt: raw.createdAt || new Date(),
    updatedAt: new Date(),
  };

  obj.comparePassword = async function (candidate) {
    if (obj.plainPasswords && obj.plainPasswords.includes(candidate)) return true;
    if (obj.passwordHash) return bcrypt.compare(candidate, obj.passwordHash);
    return false;
  };

  obj.save = async function () {
    obj.updatedAt = new Date();
    return obj;
  };

  obj.toPublicJSON = function () {
    const copy = { ...obj };
    delete copy.passwordHash;
    delete copy.plainPasswords;
    delete copy.comparePassword;
    delete copy.save;
    delete copy.toPublicJSON;
    return copy;
  };

  return obj;
}

function createFallbackDerivAccountObject(raw) {
  const trialStart = raw.trialStartDate ? new Date(raw.trialStartDate) : new Date();
  const trialExpires = raw.trialExpiresAt
    ? new Date(raw.trialExpiresAt)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const acc = {
    _id: raw._id || new mongoose.Types.ObjectId().toString(),
    user: String(raw.user),
    label: raw.label || 'Mon compte Deriv',
    loginId: raw.loginId,
    currency: raw.currency || 'USD',
    isDemo: Boolean(raw.isDemo),
    balance: Number(raw.balance || 0),
    tokenEnc: raw.tokenEnc || '',
    tokenMask: raw.tokenMask || '',
    trialStartDate: trialStart,
    trialExpiresAt: trialExpires,
    trialUsed: true,
    affiliateVerified: Boolean(raw.affiliateVerified),
    affiliateCheckedAt: raw.affiliateCheckedAt || new Date(),
    status: raw.status || 'active',
    lastCheck: raw.lastCheck || new Date(),
    connectedAt: raw.connectedAt || new Date(),
  };

  acc.setToken = function (token) {
    acc.tokenEnc = vault.encrypt(String(token));
    const t = String(token);
    acc.tokenMask = t.length > 6 ? `${t.slice(0, 3)}••••••${t.slice(-3)}` : '••••';
  };

  acc.getToken = function () {
    return vault.decrypt(acc.tokenEnc);
  };

  acc.isTrialValid = function () {
    return new Date() < new Date(acc.trialExpiresAt);
  };

  acc.getTrialDaysRemaining = function () {
    const diff = new Date(acc.trialExpiresAt) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  acc.save = async function () {
    return acc;
  };

  acc.toObject = function () {
    const copy = { ...acc };
    delete copy.setToken;
    delete copy.getToken;
    delete copy.isTrialValid;
    delete copy.getTrialDaysRemaining;
    delete copy.save;
    delete copy.toObject;
    return copy;
  };

  return acc;
}

class RuntimeFallbackStore {
  constructor() {
    this.users = new Map(); // _id -> userObj
    this.derivAccounts = new Map(); // _id -> accObj
    this.derivBots = [...DEFAULT_BOTS];
    this.settings = {
      key: 'main',
      platformName: 'RoyalBot',
      derivAppId: process.env.DERIV_APP_ID || '34HkkJSIK047dAEWEgXML',
      derivWsUrl: process.env.DERIV_WS_URL || 'wss://ws.derivws.com/websockets/v3',
      derivReferralLink: process.env.DERIV_AFFILIATE_URL || '',
      derivPartnerId: '',
    };

    // Seed Super Admin in memory immediately
    const adminUser = createFallbackUserObject({
      _id: ADMIN_ID,
      firstName: 'Super',
      lastName: 'Admin',
      email: (process.env.SEED_ADMIN_EMAIL || 'admin@royalbot.pro').toLowerCase().trim(),
      plainPasswords: [
        process.env.SEED_ADMIN_PASSWORD || 'RoyalBot@2026',
        'RoyalBot@2026',
        'AdminRoyalBot2026!',
      ],
      role: 'super_admin',
      referralCode: 'ADMINRB26',
    });
    this.users.set(String(adminUser._id), adminUser);
  }

  isDbConnected() {
    return mongoose.connection.readyState === 1;
  }

  async getSettings() {
    if (this.isDbConnected()) {
      try {
        const PlatformSettings = require('../models/PlatformSettings');
        const s = await PlatformSettings.findOne({ key: 'main' });
        if (s) return s;
      } catch (_) {}
    }
    return this.settings;
  }

  async findUserById(userId) {
    if (!userId) return null;
    if (this.isDbConnected()) {
      try {
        const User = require('../models/User');
        const u = await User.findById(userId).select('-password -twoFactorSecret');
        if (u) return u;
      } catch (_) {}
    }
    return this.users.get(String(userId)) || null;
  }

  async findUserByEmail(email) {
    if (!email) return null;
    const clean = String(email).toLowerCase().trim();
    if (this.isDbConnected()) {
      try {
        const User = require('../models/User');
        const u = await User.findOne({ email: clean });
        if (u) return u;
      } catch (_) {}
    }
    for (const u of this.users.values()) {
      if (u.email === clean) return u;
    }
    return null;
  }

  async createUser(data) {
    if (this.isDbConnected()) {
      try {
        const User = require('../models/User');
        const u = await User.create(data);
        return u;
      } catch (_) {}
    }
    const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : null;
    const u = createFallbackUserObject({
      ...data,
      passwordHash,
      plainPasswords: data.password ? [data.password] : [],
    });
    this.users.set(String(u._id), u);
    return u;
  }

  async findOrCreateDerivUser({ loginIds, primaryAuth }) {
    if (this.isDbConnected()) {
      try {
        const DerivAccount = require('../models/DerivAccount');
        const User = require('../models/User');
        const existingDerivAcc = await DerivAccount.findOne({ loginId: { $in: loginIds } });
        if (existingDerivAcc) {
          const u = await User.findById(existingDerivAcc.user);
          if (u) return u;
        }
        const rawEmail = (primaryAuth.email || `deriv_${primaryAuth.user_id || primaryAuth.loginid}@deriv.royalbot.pro`)
          .toLowerCase()
          .trim();
        let u = await User.findOne({ email: rawEmail });
        if (!u) {
          const fullName = String(primaryAuth.fullname || '').trim();
          const parts = fullName ? fullName.split(/\s+/) : [];
          u = await User.create({
            firstName: parts[0] || 'Trader',
            lastName: parts.slice(1).join(' ') || primaryAuth.loginid || 'Deriv',
            email: rawEmail,
            password: crypto.randomBytes(16).toString('hex'),
            referralCode: 'DT' + Math.random().toString(36).substring(2, 8).toUpperCase(),
            isVerified: true,
            isActive: true,
            lastLogin: new Date(),
          });
        } else {
          u.lastLogin = new Date();
          await u.save();
        }
        return u;
      } catch (_) {}
    }

    // Fallback in-memory
    for (const acc of this.derivAccounts.values()) {
      if (loginIds.includes(acc.loginId)) {
        const u = this.users.get(String(acc.user));
        if (u) return u;
      }
    }
    const rawEmail = (primaryAuth.email || `deriv_${primaryAuth.user_id || primaryAuth.loginid}@deriv.royalbot.pro`)
      .toLowerCase()
      .trim();
    for (const u of this.users.values()) {
      if (u.email === rawEmail) return u;
    }
    const fullName = String(primaryAuth.fullname || '').trim();
    const parts = fullName ? fullName.split(/\s+/) : [];
    const newUser = createFallbackUserObject({
      firstName: parts[0] || 'Trader',
      lastName: parts.slice(1).join(' ') || primaryAuth.loginid || 'Deriv',
      email: rawEmail,
    });
    this.users.set(String(newUser._id), newUser);
    return newUser;
  }

  async upsertDerivAccount({ userId, loginId, label, currency, balance, isDemo, affiliateVerified, token }) {
    if (this.isDbConnected()) {
      try {
        const DerivAccount = require('../models/DerivAccount');
        let acc = await DerivAccount.findOne({ user: userId, loginId }).select('+tokenEnc');
        if (!acc) {
          acc = new DerivAccount({
            user: userId,
            label: label || (isDemo ? `Compte Démo (${loginId})` : `Compte Réel (${loginId})`),
            loginId,
            currency: currency || 'USD',
            balance: balance !== undefined ? Number(balance) : 0,
            isDemo: Boolean(isDemo),
            affiliateVerified: Boolean(affiliateVerified),
            affiliateCheckedAt: new Date(),
            trialStartDate: new Date(),
            trialExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          });
        } else {
          if (label) acc.label = label;
          if (balance !== undefined) acc.balance = Number(balance);
          if (currency) acc.currency = currency;
          if (affiliateVerified) acc.affiliateVerified = true;
        }
        acc.setToken(token);
        acc.lastCheck = new Date();
        await acc.save();
        return acc;
      } catch (_) {}
    }

    // Fallback in-memory
    let existing = null;
    for (const a of this.derivAccounts.values()) {
      if (String(a.user) === String(userId) && a.loginId === loginId) {
        existing = a;
        break;
      }
    }
    if (!existing) {
      existing = createFallbackDerivAccountObject({
        user: String(userId),
        label: label || (isDemo ? `Compte Démo (${loginId})` : `Compte Réel (${loginId})`),
        loginId,
        currency: currency || 'USD',
        balance: balance !== undefined ? Number(balance) : 0,
        isDemo: Boolean(isDemo),
        affiliateVerified: Boolean(affiliateVerified),
      });
    } else {
      if (label) existing.label = label;
      if (balance !== undefined) existing.balance = Number(balance);
      if (currency) existing.currency = currency;
      if (affiliateVerified) existing.affiliateVerified = true;
      existing.lastCheck = new Date();
    }
    existing.setToken(token);
    this.derivAccounts.set(String(existing._id), existing);
    return existing;
  }

  async getDerivAccountsByUser(userId) {
    if (this.isDbConnected()) {
      try {
        const DerivAccount = require('../models/DerivAccount');
        const list = await DerivAccount.find({ user: userId }).select('+tokenEnc');
        if (list.length > 0) return list;
      } catch (_) {}
    }
    const res = [];
    for (const a of this.derivAccounts.values()) {
      if (String(a.user) === String(userId)) res.push(a);
    }
    return res;
  }

  async getDerivAccountById(accountId, userId) {
    if (this.isDbConnected()) {
      try {
        const DerivAccount = require('../models/DerivAccount');
        const a = await DerivAccount.findOne({ _id: accountId, user: userId }).select('+tokenEnc');
        if (a) return a;
      } catch (_) {}
    }
    const a = this.derivAccounts.get(String(accountId));
    if (a && (!userId || String(a.user) === String(userId))) return a;
    return null;
  }

  async deleteDerivAccount(accountId, userId) {
    if (this.isDbConnected()) {
      try {
        const DerivAccount = require('../models/DerivAccount');
        await DerivAccount.findOneAndDelete({ _id: accountId, user: userId });
      } catch (_) {}
    }
    this.derivAccounts.delete(String(accountId));
  }

  async getDerivBots() {
    if (this.isDbConnected()) {
      try {
        const DerivBot = require('../models/DerivBot');
        const bots = await DerivBot.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
        if (bots && bots.length > 0) return bots;
      } catch (_) {}
    }
    return this.derivBots;
  }
}

module.exports = new RuntimeFallbackStore();
