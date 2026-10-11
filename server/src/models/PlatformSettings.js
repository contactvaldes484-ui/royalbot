const mongoose = require('mongoose');

const platformSettingsSchema = new mongoose.Schema({
  // There should only be ONE document — use a fixed key
  key: { type: String, default: 'main', unique: true },

  // Branding
  platformName: { type: String, default: 'RoyalBot' },
  logoUrl: { type: String, default: '' },       // URL or base64
  faviconUrl: { type: String, default: '' },
  tagline: { type: String, default: 'Plateforme SaaS de robots de trading automatisés multi-marchés : Deriv, Binance & Bybit' },
  description: { type: String, default: 'Des robots de trading algorithmiques et IA pour Deriv, Binance et Bybit. Crypto, Forex, Indices Synthétiques — exécution automatique, analytics avancés, copy trading.' },

  // Colors
  primaryColor: { type: String, default: '#8b5cf6' },
  secondaryColor: { type: String, default: '#3b82f6' },
  gradientFrom: { type: String, default: '#3b82f6' },
  gradientTo: { type: String, default: '#7c3aed' },

  // Hero section
  heroTitle: { type: String, default: 'Le Trading Automatisé & Manuel Réinventé : Binance, Bybit & Deriv' },
  heroHighlight: { type: String, default: 'Binance, Bybit & Deriv' },
  heroSubtitle: { type: String, default: 'La seule plateforme qui combine robots crypto Binance & Bybit, trading manuel SmartTrader, et robots illimités sur Deriv avec 7 jours d\'essai offerts.' },
  heroBadge: { type: String, default: 'Plateforme Multi-Marchés : Binance, Bybit & Deriv' },

  // Stats (landing page counters)
  stats: [{
    value: String,
    label: String,
    suffix: { type: String, default: '' },
    prefix: { type: String, default: '' },
  }],

  // Footer
  footerText: { type: String, default: 'Le trading comporte des risques. Les performances passées ne garantissent pas les résultats futurs.' },
  copyrightName: { type: String, default: 'RoyalBot' },

  // Contact & Social
  contactEmail: { type: String, default: '' },
  contactPhone: { type: String, default: '' },
  whatsappLink: { type: String, default: '' },
  telegramLink: { type: String, default: '' },
  twitterLink: { type: String, default: '' },
  facebookLink: { type: String, default: '' },
  instagramLink: { type: String, default: '' },
  youtubeLink: { type: String, default: '' },

  // Broker & Exchange Referrals & Gateway (Configured by Admin)
  binanceReferralLink: { type: String, default: '' },
  binanceAffiliateCode: { type: String, default: '' },
  bybitReferralLink: { type: String, default: '' },
  bybitAffiliateCode: { type: String, default: '' },
  derivReferralLink: { type: String, default: '' },
  derivPartnerId: { type: String, default: '' },
  derivAppId: { type: String, default: '1089' },
  derivWsUrl: { type: String, default: 'wss://ws.binaryws.com/websockets/v3' },
  derivTrialDays: { type: Number, default: 7 }, // 7 days free trial for Deriv robots

  // Broker Integration (Legacy)
  brokerSignupUrl: { type: String, default: '' },

  // Payment gateways & Crypto settings (Configured by Admin)
  usdtTronAddress: { type: String, default: '' },      // USDT TRC-20 wallet address
  trongridApiKey: { type: String, default: '' },       // TronGrid API key for auto on-chain verification
  binancePayId: { type: String, default: '' },          // Binance Pay ID
  binancePayMerchantId: { type: String, default: '' },  // Binance Pay Merchant ID
  binancePayApiKey: { type: String, default: '' },      // Binance Pay API Key
  binancePaySecretKey: { type: String, default: '' },   // Binance Pay Secret Key
  binancePayEmail: { type: String, default: '' },       // Binance email for payments
  sebpayBaseUrl: { type: String, default: 'https://newapi.sebpay.bj/api/v1' }, // SebPay API endpoint
  sebpayPublicKey: { type: String, default: '' },       // SebPay Public Key (pk_live_...)
  sebpaySecretKey: { type: String, default: '' },       // SebPay Secret Key (sk_live_...)

  // SEO
  metaTitle: { type: String, default: 'RoyalBot — Trading Automatisé' },
  metaDescription: { type: String, default: 'Plateforme de robots de trading automatisés multi-marchés pour Deriv, Binance et Bybit.' },

}, { timestamps: true });

module.exports = mongoose.model('PlatformSettings', platformSettingsSchema);
