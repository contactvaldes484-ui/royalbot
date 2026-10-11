'use strict';
// Catalogue d'affichage des robots Binance + plan minimum requis.
// Les stratégies réelles sont dans services/strategyEngine.js (export `strategies`),
// la config d'exécution (symbols/tf/poll) dans services/RobotEngine.js (ROBOT_CONFIG).

const ROBOT_CATALOG = [
  { key: 'free_trend', name: 'Trend Scalper', tier: 'free', planRequired: 'free', markets: ['spot', 'futures'],
    symbols: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'], strategy: 'Trend Following EMA + RSI + ATR',
    winRate: '60-63%', timeframe: '5m', minCapital: 10, badge: 'Gratuit' },

  { key: 'starter_smc', name: 'SMC Intraday', tier: 'starter', planRequired: 'starter', markets: ['spot', 'futures'],
    symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'], strategy: 'SMC: BOS + CHoCH + Order Blocks + FVG',
    winRate: '64-67%', timeframe: '15m', minCapital: 10, badge: 'Starter' },
  { key: 'starter_scalper', name: 'Momentum Scalper', tier: 'starter', planRequired: 'starter', markets: ['spot', 'futures'],
    symbols: ['BTCUSDT', 'ETHUSDT'], strategy: 'VWAP + EMA Cross + Volume + BB',
    winRate: '62-65%', timeframe: '5m', minCapital: 10, badge: 'Starter' },
  { key: 'starter_swing', name: 'AI Swing Trend', tier: 'starter', planRequired: 'starter', markets: ['spot', 'futures'],
    symbols: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'], strategy: 'Trend D1 + Fibonacci + MACD',
    winRate: '66-70%', timeframe: '1h', minCapital: 10, badge: 'Starter' },

  { key: 'pro_institutional', name: 'AI SMC Institutional', tier: 'pro', planRequired: 'pro', markets: ['spot', 'futures'],
    symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'], strategy: 'AI SMC Multi-TF + Liquidity Sweep',
    winRate: '68-72%', timeframe: '15m', minCapital: 10, badge: 'Pro' },
  { key: 'pro_scalper', name: 'Advanced AI Scalper', tier: 'pro', planRequired: 'pro', markets: ['spot', 'futures'],
    symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'], strategy: 'MACD + BB + Stoch + EMA alignment',
    winRate: '66-69%', timeframe: '5m', minCapital: 10, badge: 'Pro' },

  { key: 'vip_quantum', name: 'Quantum AI Multi-TF', tier: 'vip', planRequired: 'vip', markets: ['spot', 'futures'],
    symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'], strategy: 'Fib + RSI Divergence + Kelly',
    winRate: '72-76%', timeframe: '5m', minCapital: 10, badge: 'VIP' },
  { key: 'vip_smc', name: 'Elite SMC Pro', tier: 'vip', planRequired: 'vip', markets: ['spot', 'futures'],
    symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'AVAXUSDT'], strategy: 'Sweep + MSS + OB + Imbalance',
    winRate: '70-74%', timeframe: '15m', minCapital: 10, badge: 'VIP' },
  { key: 'vip_scalper', name: 'Ultra Rapid Scalper', tier: 'vip', planRequired: 'vip', markets: ['futures'],
    symbols: ['BTCUSDT', 'ETHUSDT'], strategy: 'EMA(5/13) + RSI(7) + Momentum',
    winRate: '63-66%', timeframe: '1m', minCapital: 10, badge: 'VIP' },
  { key: 'vip_hedge', name: 'AI Hedge Smart', tier: 'vip', planRequired: 'vip', markets: ['futures'],
    symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'], strategy: 'Volatilité + Corrélation + Momentum',
    winRate: '73-77%', timeframe: '15m', minCapital: 10, badge: 'VIP' },
  { key: 'vip_precision_smc', name: 'AI Precision SMC', tier: 'vip', planRequired: 'vip', markets: ['spot', 'futures'],
    symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'], strategy: 'Sweep + BOS + OB + AI Probability ≥70%',
    winRate: '74-78%', timeframe: '15m', minCapital: 10, badge: 'VIP' },

  { key: 'inst_correlation', name: 'Corrélation Multi-Paires', tier: 'institutional', planRequired: 'institutional', markets: ['spot', 'futures'],
    symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT'], strategy: 'Corrélation + Mean Reversion BB',
    winRate: '74-78%', timeframe: '15m', minCapital: 10, badge: 'Institutional' },
  { key: 'inst_arbitrage', name: 'Arbitrage Statistique', tier: 'institutional', planRequired: 'institutional', markets: ['spot', 'futures'],
    symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'], strategy: 'Z-Score + MACD/Stoch confluence',
    winRate: '76-80%', timeframe: '5m', minCapital: 10, badge: 'Institutional' },
  { key: 'inst_quant', name: 'Quant AI Engine', tier: 'institutional', planRequired: 'institutional', markets: ['spot', 'futures'],
    symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'], strategy: 'Z-Score + EMA Cascade + Vol Prediction',
    winRate: '78-82%', timeframe: '15m', minCapital: 10, badge: 'Institutional' },
  { key: 'inst_flow', name: 'Institutional Flow', tier: 'institutional', planRequired: 'institutional', markets: ['futures'],
    symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'AVAXUSDT'], strategy: 'Sweep + BOS + CHoCH + HTF + AI Filter',
    winRate: '79-83%', timeframe: '15m', minCapital: 10, badge: 'Institutional' },
];

const ROBOT_MIN_PLAN = ROBOT_CATALOG.reduce((acc, r) => { acc[r.key] = r.planRequired; return acc; }, {});

// Dépôt minimum requis pour lancer un robot (USDT). Les robots tradent dès 10$.
const MIN_DEPOSIT_USDT = 10;

module.exports = { ROBOT_CATALOG, ROBOT_MIN_PLAN, MIN_DEPOSIT_USDT };
