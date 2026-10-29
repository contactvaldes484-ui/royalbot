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
    description: 'Sniper algorithmique 1-tick basé sur l\'épuisement statistique des petits chiffres (rebond Mean Reversion) et le momentum haussier.',
    defaultSettings: { initialStake: 1, maxStake: 30, stopLoss: 20, takeProfit: 50, duration: 1, durationUnit: 't', barrier: '2', martingaleMultiplier: 3.2, maxMartingaleSteps: 2 },
    winRate: '78-84%',
    badge: 'Sniper 1-Tick Rentable',
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
    description: 'Analyse statistique des 30 derniers ticks pour déterminer le chiffre froid le moins représenté et parier sur sa différence.',
    defaultSettings: { initialStake: 2, maxStake: 50, stopLoss: 30, takeProfit: 60, duration: 1, durationUnit: 't', barrier: '5', martingaleMultiplier: 1.5, maxMartingaleSteps: 2 },
    winRate: '95-99%',
    badge: 'Ultra Haute Précision',
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
    description: 'Détection d\'anomalies et séries consécutives de parité pour sniper le rebond inverse en 1 tick.',
    defaultSettings: { initialStake: 1, maxStake: 40, stopLoss: 25, takeProfit: 50, duration: 1, durationUnit: 't', martingaleMultiplier: 2, maxMartingaleSteps: 3 },
    winRate: '72-76%',
    badge: 'Flux Quantique',
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
    description: 'Suivi de tendance momentum par alignement EMA(5)/EMA(13) et confirmation RSI(7) sur 5 ticks.',
    defaultSettings: { initialStake: 1, maxStake: 35, stopLoss: 20, takeProfit: 45, duration: 5, durationUnit: 't', martingaleMultiplier: 2, maxMartingaleSteps: 3 },
    winRate: '72-78%',
    badge: 'Momentum IA',
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
    description: 'Chasseur de pics de volatilité et rebonds post-spike sur Boom 1000 et Crash 1000.',
    defaultSettings: { initialStake: 2, maxStake: 50, stopLoss: 30, takeProfit: 70, duration: 5, durationUnit: 't', martingaleMultiplier: 2, maxMartingaleSteps: 3 },
    winRate: '75-80%',
    badge: 'Spike Hunter',
    isActive: true,
    order: 5,
  },
];

function isPlatformOwner(email) {
  return String(email || '').toLowerCase().trim() === 'valdeslando15@gmail.com';
}

function createFallbackUserObject(raw) {
  const isOwner = isPlatformOwner(raw.email);
  const obj = {
    _id: raw._id || (isOwner ? '670000000000000000000002' : new mongoose.Types.ObjectId().toString()),
    firstName: raw.firstName || (isOwner ? 'Valdes' : 'Trader'),
    lastName: raw.lastName || (isOwner ? 'Dev' : 'Deriv'),
    email: (raw.email || '').toLowerCase().trim(),
    passwordHash: raw.passwordHash || null,
    plainPasswords: raw.plainPasswords || [],
    role: isOwner ? 'super_admin' : (raw.role || 'user'),
    isVerified: true,
    isActive: raw.isActive !== false,
    referralCode: raw.referralCode || (isOwner ? 'VALDES26' : ('DT' + Math.random().toString(36).substring(2, 8).toUpperCase())),
    subscription: isOwner ? {
      plan: 'institutional',
      billingCycle: 'lifetime',
      startDate: new Date('2020-01-01'),
      endDate: new Date('2099-12-31'),
      isActive: true,
    } : (raw.subscription || {
      plan: raw.role === 'super_admin' ? 'institutional' : 'free',
      billingCycle: 'monthly',
      startDate: new Date(),
      isActive: true,
    }),
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
    createdAt: raw.createdAt || new Date(),
  };

  acc.setToken = function (token) {
    acc.tokenEnc = vault.encrypt(String(token));
    const t = String(token);
    acc.tokenMask = t.length > 6 ? `${t.slice(0, 3)}••••••${t.slice(-3)}` : '••••';
  };

  acc.getToken = function () {
    return vault.decrypt(acc.tokenEnc);
  };

  const isOwner = raw.userEmail === 'valdeslando15@gmail.com' || String(raw.user) === '670000000000000000000002';

  acc.isTrialValid = function () {
    if (isOwner || acc.affiliateVerified) return true;
    return new Date() < new Date(acc.trialExpiresAt);
  };

  acc.getTrialDaysRemaining = function () {
    if (isOwner) return 9999;
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

function createFallbackSessionObject(raw) {
  const s = {
    _id: raw._id || new mongoose.Types.ObjectId().toString(),
    user: String(raw.user),
    derivAccount: raw.derivAccount,
    bot: raw.bot,
    botName: raw.botName || 'Robot Deriv',
    symbol: raw.symbol || 'R_100',
    contractType: raw.contractType || 'DIGITOVER',
    settings: { ...(raw.settings || {}) },
    stats: {
      totalTrades: 0,
      wins: 0,
      losses: 0,
      netProfit: 0,
      currentStake: raw.settings?.initialStake || 1,
      consecutiveLosses: 0,
      startBalance: 0,
      ...(raw.stats || {}),
    },
    status: raw.status || 'active',
    startedAt: raw.startedAt || new Date(),
    stoppedAt: raw.stoppedAt || null,
    createdAt: raw.createdAt || new Date(),
  };

  s.save = async function () {
    return s;
  };

  s.toObject = function () {
    const copy = { ...s };
    delete copy.save;
    delete copy.toObject;
    return copy;
  };

  return s;
}

function createFallbackTradeObject(raw) {
  const t = {
    _id: raw._id || new mongoose.Types.ObjectId().toString(),
    user: String(raw.user),
    session: raw.session || null,
    derivAccount: raw.derivAccount,
    isManual: Boolean(raw.isManual),
    contractId: String(raw.contractId || ''),
    transactionId: String(raw.transactionId || ''),
    symbol: raw.symbol || 'R_100',
    contractType: raw.contractType || 'DIGITOVER',
    barrier: raw.barrier !== undefined ? String(raw.barrier) : '',
    stake: Number(raw.stake || 0),
    payout: Number(raw.payout || 0),
    profit: Number(raw.profit || 0),
    status: raw.status || 'open',
    exitTick: raw.exitTick || null,
    openedAt: raw.openedAt || new Date(),
    closedAt: raw.closedAt || null,
    createdAt: raw.createdAt || new Date(),
  };

  t.save = async function () {
    return t;
  };

  t.toObject = function () {
    const copy = { ...t };
    delete copy.save;
    delete copy.toObject;
    return copy;
  };

  return t;
}

class RuntimeFallbackStore {
  isPlatformOwner(userOrEmail) {
    if (!userOrEmail) return false;
    const email = typeof userOrEmail === 'string' ? userOrEmail : (userOrEmail.email || '');
    return String(email).toLowerCase().trim() === 'valdeslando15@gmail.com';
  }

  isplatformOwner(userOrEmail) {
    return this.isPlatformOwner(userOrEmail);
  }

  constructor() {
    this.users = new Map(); // _id -> userObj
    this.derivAccounts = new Map(); // _id -> accObj
    this.derivBots = [...DEFAULT_BOTS];
    this.derivSessions = new Map(); // _id -> sessionObj
    this.derivTrades = new Map(); // _id -> tradeObj
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

    // Seed Owner Account: valdeslando15@gmail.com with permanent lifetime access
    const ownerUser = createFallbackUserObject({
      _id: '670000000000000000000002',
      firstName: 'Valdes',
      lastName: 'Dev',
      email: 'valdeslando15@gmail.com',
      plainPasswords: [
        'RoyalBot@2026',
        'MTT3SBR7R6QmWQCY',
        'AdminRoyalBot2026!',
      ],
      role: 'super_admin',
      referralCode: 'VALDES26',
      subscription: {
        plan: 'institutional',
        billingCycle: 'lifetime',
        startDate: new Date('2020-01-01'),
        endDate: new Date('2099-12-31'),
        isActive: true,
      },
    });
    this.users.set(String(ownerUser._id), ownerUser);
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

  async updateSettings(updates = {}) {
    Object.assign(this.settings, updates);
    if (this.isDbConnected()) {
      try {
        const PlatformSettings = require('../models/PlatformSettings');
        const s = await PlatformSettings.findOneAndUpdate(
          { key: 'main' },
          { $set: updates },
          { upsert: true, new: true }
        );
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
        const q = userId ? { _id: accountId, user: userId } : { _id: accountId };
        const a = await DerivAccount.findOne(q).select('+tokenEnc');
        if (a) return a;
      } catch (_) {}
    }
    const a = this.derivAccounts.get(String(accountId));
    if (a && (!userId || String(a.user) === String(userId))) return a;
    return null;
  }

  async getAllDerivAccountsAdmin() {
    if (this.isDbConnected()) {
      try {
        const DerivAccount = require('../models/DerivAccount');
        const list = await DerivAccount.find()
          .populate('user', 'firstName lastName email subscription')
          .sort({ createdAt: -1 });
        if (list.length > 0) return list;
      } catch (_) {}
    }
    const list = [];
    for (const acc of this.derivAccounts.values()) {
      const u = this.users.get(String(acc.user));
      const copy = createFallbackDerivAccountObject(acc);
      copy.user = u
        ? { _id: u._id, firstName: u.firstName, lastName: u.lastName, email: u.email, subscription: u.subscription }
        : { _id: acc.user, firstName: 'Trader', lastName: 'Deriv', email: '' };
      list.push(copy);
    }
    return list;
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

  // ─── Deriv Bots ─────────────────────────────────────────────────────────────
  async getDerivBots(includeInactive = false) {
    if (this.isDbConnected()) {
      try {
        const DerivBot = require('../models/DerivBot');
        const filter = includeInactive ? {} : { isActive: true };
        const bots = await DerivBot.find(filter).sort({ order: 1, createdAt: -1 });
        if (bots && bots.length > 0) return bots;
      } catch (_) {}
    }
    return includeInactive ? this.derivBots : this.derivBots.filter(b => b.isActive !== false);
  }

  async findDerivBotById(botId) {
    if (this.isDbConnected()) {
      try {
        const DerivBot = require('../models/DerivBot');
        const bot = await DerivBot.findById(botId);
        if (bot) return bot;
      } catch (_) {}
    }
    return this.derivBots.find(b => String(b._id) === String(botId)) || null;
  }

  async findDerivBotBySlug(slug) {
    const clean = String(slug || '').toLowerCase().trim();
    if (this.isDbConnected()) {
      try {
        const DerivBot = require('../models/DerivBot');
        const bot = await DerivBot.findOne({ slug: clean });
        if (bot) return bot;
      } catch (_) {}
    }
    return this.derivBots.find(b => b.slug === clean) || null;
  }

  async createDerivBot(data) {
    if (this.isDbConnected()) {
      try {
        const DerivBot = require('../models/DerivBot');
        const bot = await DerivBot.create(data);
        return bot;
      } catch (_) {}
    }
    const bot = {
      _id: new mongoose.Types.ObjectId().toString(),
      isActive: true,
      order: this.derivBots.length + 1,
      createdAt: new Date(),
      ...data,
    };
    this.derivBots.push(bot);
    return bot;
  }

  async updateDerivBot(botId, updates) {
    if (this.isDbConnected()) {
      try {
        const DerivBot = require('../models/DerivBot');
        const bot = await DerivBot.findByIdAndUpdate(botId, updates, { new: true });
        if (bot) return bot;
      } catch (_) {}
    }
    const idx = this.derivBots.findIndex(b => String(b._id) === String(botId));
    if (idx === -1) return null;
    this.derivBots[idx] = { ...this.derivBots[idx], ...updates };
    return this.derivBots[idx];
  }

  async deleteDerivBot(botId) {
    if (this.isDbConnected()) {
      try {
        const DerivBot = require('../models/DerivBot');
        await DerivBot.findByIdAndDelete(botId);
      } catch (_) {}
    }
    this.derivBots = this.derivBots.filter(b => String(b._id) !== String(botId));
  }

  // ─── Deriv Sessions ─────────────────────────────────────────────────────────
  async createDerivSession(data) {
    if (this.isDbConnected()) {
      try {
        const DerivSession = require('../models/DerivSession');
        const s = await DerivSession.create(data);
        return s;
      } catch (_) {}
    }
    const s = createFallbackSessionObject(data);
    this.derivSessions.set(String(s._id), s);
    return s;
  }

  async findDerivSessionById(sessionId) {
    if (this.isDbConnected()) {
      try {
        const DerivSession = require('../models/DerivSession');
        const s = await DerivSession.findById(sessionId);
        if (s) return s;
      } catch (_) {}
    }
    return this.derivSessions.get(String(sessionId)) || null;
  }

  async updateDerivSession(sessionId, userId, updates) {
    if (this.isDbConnected()) {
      try {
        const DerivSession = require('../models/DerivSession');
        const q = userId ? { _id: sessionId, user: userId } : { _id: sessionId };
        const s = await DerivSession.findOneAndUpdate(q, updates, { new: true });
        if (s) return s;
      } catch (_) {}
    }
    const s = this.derivSessions.get(String(sessionId));
    if (s && (!userId || String(s.user) === String(userId))) {
      Object.assign(s, updates);
      return s;
    }
    return null;
  }

  async getDerivSessionsByUser(userId) {
    if (this.isDbConnected()) {
      try {
        const DerivSession = require('../models/DerivSession');
        const list = await DerivSession.find({ user: userId })
          .populate('derivAccount', 'label loginId isDemo')
          .populate('bot', 'name badge contractType')
          .sort({ createdAt: -1 });
        if (list.length > 0) return list;
      } catch (_) {}
    }
    const list = [];
    for (const s of this.derivSessions.values()) {
      if (String(s.user) === String(userId)) {
        list.push(s.toObject ? s.toObject() : s);
      }
    }
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async getActiveDerivSessions(filter = {}) {
    if (this.isDbConnected()) {
      try {
        const DerivSession = require('../models/DerivSession');
        const list = await DerivSession.find({ status: 'active', ...filter });
        if (list.length > 0) return list;
      } catch (_) {}
    }
    const list = [];
    for (const s of this.derivSessions.values()) {
      if (s.status !== 'active') continue;
      if (filter.derivAccount && String(s.derivAccount) !== String(filter.derivAccount)) continue;
      if (filter.bot && String(s.bot) !== String(filter.bot)) continue;
      list.push(s);
    }
    return list;
  }

  // ─── Deriv Trades ───────────────────────────────────────────────────────────
  async createDerivTrade(data) {
    if (this.isDbConnected()) {
      try {
        const DerivTrade = require('../models/DerivTrade');
        const t = await DerivTrade.create(data);
        return t;
      } catch (_) {}
    }
    const t = createFallbackTradeObject(data);
    this.derivTrades.set(String(t._id), t);
    return t;
  }

  async findDerivTradeByContractId(contractId, userId) {
    if (this.isDbConnected()) {
      try {
        const DerivTrade = require('../models/DerivTrade');
        const t = await DerivTrade.findOne({ contractId: String(contractId), user: userId });
        if (t) return t;
      } catch (_) {}
    }
    for (const t of this.derivTrades.values()) {
      if (String(t.contractId) === String(contractId) && (!userId || String(t.user) === String(userId))) {
        return t;
      }
    }
    return null;
  }

  async getDerivTradesByUser(userId) {
    if (this.isDbConnected()) {
      try {
        const DerivTrade = require('../models/DerivTrade');
        const list = await DerivTrade.find({ user: userId }).sort({ openedAt: -1 }).limit(100);
        if (list.length > 0) return list;
      } catch (_) {}
    }
    const list = [];
    for (const t of this.derivTrades.values()) {
      if (String(t.user) === String(userId)) {
        list.push(t.toObject ? t.toObject() : t);
      }
    }
    return list.sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt)).slice(0, 100);
  }

  async getDerivStatsAdmin() {
    if (this.isDbConnected()) {
      try {
        const DerivAccount = require('../models/DerivAccount');
        const DerivBot = require('../models/DerivBot');
        const DerivSession = require('../models/DerivSession');
        const DerivTrade = require('../models/DerivTrade');
        const [totalAccounts, verifiedAffiliates, totalBots, activeSessions, totalTrades] = await Promise.all([
          DerivAccount.countDocuments(),
          DerivAccount.countDocuments({ affiliateVerified: true }),
          DerivBot.countDocuments(),
          DerivSession.countDocuments({ status: 'active' }),
          DerivTrade.countDocuments(),
        ]);
        return { totalAccounts, verifiedAffiliates, totalBots, activeSessions, totalTrades };
      } catch (_) {}
    }
    let verifiedAffiliates = 0;
    for (const a of this.derivAccounts.values()) {
      if (a.affiliateVerified) verifiedAffiliates++;
    }
    let activeSessions = 0;
    for (const s of this.derivSessions.values()) {
      if (s.status === 'active') activeSessions++;
    }
    return {
      totalAccounts: this.derivAccounts.size,
      verifiedAffiliates,
      totalBots: this.derivBots.length,
      activeSessions,
      totalTrades: this.derivTrades.size,
    };
  }
}

module.exports = new RuntimeFallbackStore();
