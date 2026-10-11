/**
 * Forex AI Analyzer — pure-JS technical analysis with SMC/ICT concepts.
 *
 * Implements (on a candle array of {t, open, high, low, close, volume}):
 *   - Swing points (pivots) via N-bar lookback
 *   - Market structure & trend (HH/HL/LH/LL)
 *   - Support / Resistance clustering
 *   - Order Blocks (last opposite-color candle before strong impulse breaking structure)
 *   - Fair Value Gaps (3-candle imbalance)
 *   - Break of Structure (BOS)
 *   - Change of Character (CHoCH)
 *   - Liquidity zones (equal highs/lows clusters)
 *   - Breakouts / Fake breakouts
 *   - Trade plan: entry, SL, TP1, TP2, RR
 *   - Confidence/probability scoring with multi-factor weighting
 *   - Human-readable explanations
 */

const candleProvider = require('./candleProvider');

// ─── Helpers ─────────────────────────────────────────────────────────────────
const round = (v, d = 5) => +(+v).toFixed(d);
const pipSize = (symbol) => {
  const s = String(symbol).toUpperCase();
  if (s.includes('JPY')) return 0.01;
  if (s.startsWith('XAU')) return 0.1;
  if (s.startsWith('XAG')) return 0.001;
  if (s.startsWith('BTC')) return 1;
  return 0.0001;
};

function findSwings(bars, lookback = 3) {
  const highs = [], lows = [];
  for (let i = lookback; i < bars.length - lookback; i++) {
    let isHigh = true, isLow = true;
    for (let j = 1; j <= lookback; j++) {
      if (bars[i].high <= bars[i - j].high || bars[i].high <= bars[i + j].high) isHigh = false;
      if (bars[i].low  >= bars[i - j].low  || bars[i].low  >= bars[i + j].low ) isLow  = false;
    }
    if (isHigh) highs.push({ index: i, time: bars[i].t, price: bars[i].high });
    if (isLow)  lows.push ({ index: i, time: bars[i].t, price: bars[i].low  });
  }
  return { highs, lows };
}

function detectTrend(swings) {
  const { highs, lows } = swings;
  if (highs.length < 2 || lows.length < 2) return { trend: 'ranging', strength: 30 };
  const h1 = highs[highs.length - 1], h2 = highs[highs.length - 2];
  const l1 = lows [lows .length - 1], l2 = lows [lows .length - 2];
  const HH = h1.price > h2.price;
  const HL = l1.price > l2.price;
  const LH = h1.price < h2.price;
  const LL = l1.price < l2.price;
  if (HH && HL) return { trend: 'bullish', strength: Math.min(100, 50 + Math.abs(h1.price - h2.price) / h2.price * 2000) };
  if (LH && LL) return { trend: 'bearish', strength: Math.min(100, 50 + Math.abs(h2.price - h1.price) / h2.price * 2000) };
  return { trend: 'ranging', strength: 30 };
}

// Cluster S/R from swing points (any swings within ~0.3% considered the same level)
function clusterLevels(points, atrPct = 0.003) {
  if (!points.length) return [];
  const sorted = [...points].sort((a, b) => a.price - b.price);
  const clusters = [];
  let current = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const avg = current.reduce((s, p) => s + p.price, 0) / current.length;
    if (Math.abs(sorted[i].price - avg) / avg < atrPct) current.push(sorted[i]);
    else { clusters.push(current); current = [sorted[i]]; }
  }
  clusters.push(current);
  return clusters.map(c => ({
    price: round(c.reduce((s, p) => s + p.price, 0) / c.length, 5),
    touches: c.length,
    strength: Math.min(100, c.length * 25),
  })).sort((a, b) => b.touches - a.touches).slice(0, 6);
}

// Order Blocks: last opposite-color candle before a strong impulsive move that breaks structure
function detectOrderBlocks(bars, swings) {
  const obs = [];
  const lookahead = 10;
  for (let i = 5; i < bars.length - lookahead; i++) {
    const c = bars[i];
    const range = c.high - c.low;
    if (!range) continue;
    // Look forward for an impulsive move
    let maxUp = 0, maxDown = 0;
    for (let k = 1; k <= lookahead; k++) {
      const move = bars[i + k].close - c.close;
      if (move > maxUp) maxUp = move;
      if (move < maxDown) maxDown = move;
    }
    const isBearishCandle = c.close < c.open;
    const isBullishCandle = c.close > c.open;
    // Bullish OB: last bearish candle before strong up move
    if (isBearishCandle && maxUp > range * 2.5 && maxUp > Math.abs(maxDown) * 2) {
      obs.push({ side: 'bullish', top: round(c.high, 5), bottom: round(c.low, 5), time: c.t, index: i, mitigated: false });
    }
    // Bearish OB
    if (isBullishCandle && Math.abs(maxDown) > range * 2.5 && Math.abs(maxDown) > maxUp * 2) {
      obs.push({ side: 'bearish', top: round(c.high, 5), bottom: round(c.low, 5), time: c.t, index: i, mitigated: false });
    }
  }
  // Mark mitigated if price has since returned through the zone
  const lastPrice = bars[bars.length - 1].close;
  for (const ob of obs) {
    for (let i = ob.index + 1; i < bars.length; i++) {
      if (ob.side === 'bullish' && bars[i].low <= ob.top) { ob.mitigated = true; break; }
      if (ob.side === 'bearish' && bars[i].high >= ob.bottom) { ob.mitigated = true; break; }
    }
  }
  // Keep only most recent 4 unmitigated + 2 mitigated
  const unmit = obs.filter(o => !o.mitigated).slice(-4);
  const mit   = obs.filter(o =>  o.mitigated).slice(-2);
  return [...mit, ...unmit];
}

// Fair Value Gap: 3-bar imbalance — candle1.high < candle3.low (bullish) or candle1.low > candle3.high (bearish)
function detectFVGs(bars) {
  const fvgs = [];
  for (let i = 2; i < bars.length; i++) {
    const c1 = bars[i - 2], c3 = bars[i];
    if (c1.high < c3.low) {
      fvgs.push({ side: 'bullish', top: round(c3.low, 5), bottom: round(c1.high, 5), time: c3.t, index: i, mitigated: false });
    } else if (c1.low > c3.high) {
      fvgs.push({ side: 'bearish', top: round(c1.low, 5), bottom: round(c3.high, 5), time: c3.t, index: i, mitigated: false });
    }
  }
  // Mark mitigated
  for (const f of fvgs) {
    for (let i = f.index + 1; i < bars.length; i++) {
      if (f.side === 'bullish' && bars[i].low <= f.bottom) { f.mitigated = true; break; }
      if (f.side === 'bearish' && bars[i].high >= f.top) { f.mitigated = true; break; }
    }
  }
  const unmit = fvgs.filter(f => !f.mitigated).slice(-4);
  const mit   = fvgs.filter(f =>  f.mitigated).slice(-2);
  return [...mit, ...unmit];
}

// BOS & CHoCH: scan price action against last swing levels in trend context
function detectBOSandCHoCH(bars, swings, trend) {
  const bos = [], choch = [];
  const allSwings = [
    ...swings.highs.map(s => ({ ...s, type: 'high' })),
    ...swings.lows .map(s => ({ ...s, type: 'low'  })),
  ].sort((a, b) => a.index - b.index);

  for (let i = 1; i < allSwings.length; i++) {
    const swing = allSwings[i];
    // Scan bars AFTER this swing
    for (let j = swing.index + 1; j < bars.length; j++) {
      const b = bars[j];
      if (swing.type === 'high' && b.close > swing.price) {
        // Up-break of swing high
        if (trend.trend === 'bullish') bos.push({ time: b.t, price: swing.price, side: 'bullish' });
        else                            choch.push({ time: b.t, price: swing.price, side: 'bullish' });
        break;
      }
      if (swing.type === 'low' && b.close < swing.price) {
        if (trend.trend === 'bearish') bos.push({ time: b.t, price: swing.price, side: 'bearish' });
        else                            choch.push({ time: b.t, price: swing.price, side: 'bearish' });
        break;
      }
    }
  }
  return { bos: bos.slice(-3), choch: choch.slice(-3) };
}

// Liquidity zones: clusters of equal highs / equal lows
function detectLiquidity(swings) {
  const eqHighsClusters = clusterLevels(swings.highs, 0.0015).filter(c => c.touches >= 2);
  const eqLowsClusters  = clusterLevels(swings.lows,  0.0015).filter(c => c.touches >= 2);
  return [
    ...eqHighsClusters.map(c => ({ side: 'sell_side', price: c.price, touches: c.touches })),
    ...eqLowsClusters .map(c => ({ side: 'buy_side',  price: c.price, touches: c.touches })),
  ];
}

// Breakouts / fake breakouts on last ~10 bars
function detectBreakouts(bars, supports, resistances) {
  const breakouts = [];
  const recent = bars.slice(-12);
  for (const lvl of [...supports.map(s => ({ ...s, side: 'support' })), ...resistances.map(r => ({ ...r, side: 'resistance' }))]) {
    for (let i = 1; i < recent.length; i++) {
      const b = recent[i];
      if (lvl.side === 'resistance' && b.close > lvl.price && bars[bars.length - recent.length + i - 1].close <= lvl.price) {
        // Check next bars for fake (return below)
        let fake = false;
        for (let j = i + 1; j < recent.length; j++) {
          if (recent[j].close < lvl.price) { fake = true; break; }
        }
        breakouts.push({ time: b.t, price: lvl.price, side: 'bullish', fake });
      }
      if (lvl.side === 'support' && b.close < lvl.price && bars[bars.length - recent.length + i - 1].close >= lvl.price) {
        let fake = false;
        for (let j = i + 1; j < recent.length; j++) {
          if (recent[j].close > lvl.price) { fake = true; break; }
        }
        breakouts.push({ time: b.t, price: lvl.price, side: 'bearish', fake });
      }
    }
  }
  return breakouts.slice(-3);
}

// ATR for SL sizing
function atr(bars, period = 14) {
  if (bars.length < period + 1) return null;
  let sum = 0;
  for (let i = bars.length - period; i < bars.length; i++) {
    const prev = bars[i - 1];
    const tr = Math.max(
      bars[i].high - bars[i].low,
      Math.abs(bars[i].high - prev.close),
      Math.abs(bars[i].low  - prev.close),
    );
    sum += tr;
  }
  return sum / period;
}

// ─── Momentum indicators (EMA / RSI) ─────────────────────────────────────────
function ema(values, period) {
  if (!values || values.length < period) return null;
  const k = 2 / (period + 1);
  let e = values.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = period; i < values.length; i++) e = values[i] * k + e * (1 - k);
  return e;
}

function rsi(values, period = 14) {
  if (!values || values.length < period + 1) return null;
  const slice = values.slice(-(period + 1));
  let gains = 0, losses = 0;
  for (let i = 1; i < slice.length; i++) {
    const d = slice[i] - slice[i - 1];
    if (d >= 0) gains += d; else losses -= d;
  }
  const avgGain = gains / period, avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

// ─── Strategy catalog ─────────────────────────────────────────────────────────
// Each strategy re-weights the same detected factors so the AI signal genuinely
// adapts to the user's chosen trading style.
const STRATEGIES = {
  smc: {
    label: 'SMC / ICT',
    description: 'Smart Money Concepts : Order Blocks, FVG, liquidité, BOS/CHoCH.',
    weights: { trend: 25, bos: 18, choch: 12, ob: 15, fvg: 10, breakout: 8, fakeBreakout: 10, sr: 6, ema: 0, rsi: 0, momentum: 0 },
    entryThreshold: 20,
  },
  scalping: {
    label: 'Scalping',
    description: 'Momentum court terme : EMA rapides, RSI, volatilité. Idéal M1/M5.',
    weights: { trend: 10, bos: 8, choch: 6, ob: 6, fvg: 6, breakout: 14, fakeBreakout: 8, sr: 10, ema: 22, rsi: 18, momentum: 16 },
    entryThreshold: 16,
    preferredTFs: ['1m', '5m', '15m'],
  },
  trend: {
    label: 'Suivi de tendance',
    description: 'Trend-following : alignement HTF, EMA 50/200, structure de marché.',
    weights: { trend: 34, bos: 20, choch: 6, ob: 8, fvg: 6, breakout: 10, fakeBreakout: 6, sr: 6, ema: 24, rsi: 6, momentum: 10 },
    entryThreshold: 22,
  },
  breakout: {
    label: 'Breakout',
    description: 'Cassures de S/R + volatilité ATR, filtre les faux breakouts.',
    weights: { trend: 14, bos: 16, choch: 6, ob: 6, fvg: 6, breakout: 30, fakeBreakout: 22, sr: 16, ema: 6, rsi: 6, momentum: 12 },
    entryThreshold: 20,
  },
  support_resistance: {
    label: 'Support / Résistance',
    description: 'Rebonds sur niveaux de confluence et zones clés.',
    weights: { trend: 12, bos: 8, choch: 10, ob: 12, fvg: 8, breakout: 6, fakeBreakout: 8, sr: 30, ema: 6, rsi: 14, momentum: 6 },
    entryThreshold: 18,
  },
  reversal: {
    label: 'Retournement',
    description: 'Détecte les retournements : CHoCH, divergences RSI, extrêmes.',
    weights: { trend: 10, bos: 6, choch: 26, ob: 12, fvg: 10, breakout: 8, fakeBreakout: 16, sr: 14, ema: 4, rsi: 22, momentum: 8 },
    entryThreshold: 18,
  },
};

function getStrategy(key) {
  return STRATEGIES[key] || STRATEGIES.smc;
}

function listStrategies() {
  return Object.entries(STRATEGIES).map(([key, s]) => ({
    key, label: s.label, description: s.description,
    preferredTFs: s.preferredTFs || null,
  }));
}

// ─── Main analyze ─────────────────────────────────────────────────────────────
async function analyze(symbol, timeframe, opts = {}) {
  const { swingLookback = 3, candleCount = 200, dataProvider = 'yahoo', apiKey = '', strategy = 'smc' } = opts;
  const strat = getStrategy(strategy);
  const W = strat.weights;
  const bars = await candleProvider.getCandles(symbol, timeframe, { provider: dataProvider, apiKey, count: candleCount });
  if (!bars || bars.length < 30) {
    return null;
  }

  const lastPrice = bars[bars.length - 1].close;
  const closes = bars.map(b => b.close);
  const swings = findSwings(bars, swingLookback);
  const trend = detectTrend(swings);
  const supports    = clusterLevels(swings.lows);
  const resistances = clusterLevels(swings.highs);
  const orderBlocks = detectOrderBlocks(bars, swings);
  const fvgs        = detectFVGs(bars);
  const { bos, choch } = detectBOSandCHoCH(bars, swings, trend);
  const liquidity   = detectLiquidity(swings);
  const breakouts   = detectBreakouts(bars, supports, resistances);
  const atrVal      = atr(bars) || (lastPrice * 0.002);

  // Momentum indicators
  const emaFast = ema(closes, 9);
  const emaMid  = ema(closes, 50);
  const emaSlow = ema(closes, 200);
  const rsiVal  = rsi(closes, 14);

  // ─── Compute confidence & signal (weighted by chosen strategy) ───
  const reasonsBull = [], reasonsBear = [];
  let bullScore = 0, bearScore = 0;

  if (trend.trend === 'bullish') { bullScore += W.trend; reasonsBull.push(`Tendance HTF haussière (force ${Math.round(trend.strength)})`); }
  if (trend.trend === 'bearish') { bearScore += W.trend; reasonsBear.push(`Tendance HTF baissière (force ${Math.round(trend.strength)})`); }

  // Recent BOS
  const lastBOS = bos[bos.length - 1];
  if (lastBOS?.side === 'bullish') { bullScore += W.bos; reasonsBull.push('Break of Structure haussier récent confirme la continuation'); }
  if (lastBOS?.side === 'bearish') { bearScore += W.bos; reasonsBear.push('Break of Structure baissier récent confirme la continuation'); }

  // Recent CHoCH (early reversal warning)
  const lastCHoCH = choch[choch.length - 1];
  if (lastCHoCH?.side === 'bullish') { bullScore += W.choch; reasonsBull.push('Change of Character haussier — possible retournement'); }
  if (lastCHoCH?.side === 'bearish') { bearScore += W.choch; reasonsBear.push('Change of Character baissier — possible retournement'); }

  // Price inside unmitigated bullish OB → buy bias
  const activeBullOB = orderBlocks.filter(o => o.side === 'bullish' && !o.mitigated)
    .find(o => lastPrice >= o.bottom && lastPrice <= o.top * 1.001);
  const activeBearOB = orderBlocks.filter(o => o.side === 'bearish' && !o.mitigated)
    .find(o => lastPrice >= o.bottom * 0.999 && lastPrice <= o.top);
  if (activeBullOB) { bullScore += W.ob; reasonsBull.push(`Prix dans un Order Block haussier (${activeBullOB.bottom}–${activeBullOB.top})`); }
  if (activeBearOB) { bearScore += W.ob; reasonsBear.push(`Prix dans un Order Block baissier (${activeBearOB.bottom}–${activeBearOB.top})`); }

  // FVG proximity
  const activeBullFVG = fvgs.filter(f => f.side === 'bullish' && !f.mitigated)
    .find(f => lastPrice >= f.bottom * 0.999 && lastPrice <= f.top * 1.001);
  const activeBearFVG = fvgs.filter(f => f.side === 'bearish' && !f.mitigated)
    .find(f => lastPrice >= f.bottom * 0.999 && lastPrice <= f.top * 1.001);
  if (activeBullFVG) { bullScore += W.fvg; reasonsBull.push(`Fair Value Gap haussier non comblé proche (${activeBullFVG.bottom}–${activeBullFVG.top})`); }
  if (activeBearFVG) { bearScore += W.fvg; reasonsBear.push(`Fair Value Gap baissier non comblé proche (${activeBearFVG.bottom}–${activeBearFVG.top})`); }

  // Recent breakout
  const lastBreakout = breakouts[breakouts.length - 1];
  if (lastBreakout && !lastBreakout.fake) {
    if (lastBreakout.side === 'bullish') { bullScore += W.breakout; reasonsBull.push(`Cassure haussière confirmée à ${lastBreakout.price}`); }
    if (lastBreakout.side === 'bearish') { bearScore += W.breakout; reasonsBear.push(`Cassure baissière confirmée à ${lastBreakout.price}`); }
  }
  if (lastBreakout?.fake) {
    if (lastBreakout.side === 'bullish') { bearScore += W.fakeBreakout; reasonsBear.push(`Faux breakout haussier — piège à acheteurs détecté`); }
    if (lastBreakout.side === 'bearish') { bullScore += W.fakeBreakout; reasonsBull.push(`Faux breakout baissier — piège à vendeurs détecté`); }
  }

  // Proximity to S/R
  const nearestSupport    = supports   .find(s => Math.abs(s.price - lastPrice) / lastPrice < 0.005);
  const nearestResistance = resistances.find(r => Math.abs(r.price - lastPrice) / lastPrice < 0.005);
  if (nearestSupport)    { bullScore += W.sr; reasonsBull.push(`Prix proche d'un support fort (${nearestSupport.price}, ${nearestSupport.touches} touches)`); }
  if (nearestResistance) { bearScore += W.sr; reasonsBear.push(`Prix proche d'une résistance forte (${nearestResistance.price}, ${nearestResistance.touches} touches)`); }

  // EMA alignment (momentum / trend strategies)
  if (W.ema && emaFast != null && emaMid != null) {
    if (emaFast > emaMid && lastPrice > emaMid) { bullScore += W.ema; reasonsBull.push(`Prix > EMA50 et EMA9 > EMA50 — momentum haussier`); }
    if (emaFast < emaMid && lastPrice < emaMid) { bearScore += W.ema; reasonsBear.push(`Prix < EMA50 et EMA9 < EMA50 — momentum baissier`); }
    if (emaSlow != null) {
      if (emaMid > emaSlow) { bullScore += W.ema * 0.4; reasonsBull.push('EMA50 > EMA200 — biais structurel haussier'); }
      if (emaMid < emaSlow) { bearScore += W.ema * 0.4; reasonsBear.push('EMA50 < EMA200 — biais structurel baissier'); }
    }
  }

  // RSI (overbought/oversold + divergence-ish extremes)
  if (W.rsi && rsiVal != null) {
    if (rsiVal < 30) { bullScore += W.rsi; reasonsBull.push(`RSI survendu (${Math.round(rsiVal)}) — rebond probable`); }
    else if (rsiVal > 70) { bearScore += W.rsi; reasonsBear.push(`RSI suracheté (${Math.round(rsiVal)}) — correction probable`); }
    else if (rsiVal >= 50 && rsiVal <= 65) { bullScore += W.rsi * 0.5; reasonsBull.push(`RSI haussier (${Math.round(rsiVal)})`); }
    else if (rsiVal >= 35 && rsiVal < 50) { bearScore += W.rsi * 0.5; reasonsBear.push(`RSI baissier (${Math.round(rsiVal)})`); }
  }

  // Raw momentum (last N closes slope)
  if (W.momentum && closes.length >= 6) {
    const mom = (lastPrice - closes[closes.length - 6]) / closes[closes.length - 6];
    if (mom > 0.0008) { bullScore += W.momentum; reasonsBull.push('Momentum court terme positif'); }
    if (mom < -0.0008) { bearScore += W.momentum; reasonsBear.push('Momentum court terme négatif'); }
  }

  // ─── Final signal (threshold depends on strategy) ───
  const diff = bullScore - bearScore;
  const threshold = strat.entryThreshold;
  let signal = 'wait';
  if (diff >= threshold) signal = 'buy';
  else if (diff <= -threshold) signal = 'sell';

  const confidence = Math.min(100, Math.max(bullScore, bearScore));
  const probability = signal === 'wait' ? 50 : Math.min(92, 50 + Math.abs(diff) * 0.8);

  // ─── Trade plan ───
  const sl = signal === 'buy'  ? lastPrice - atrVal * 1.5 : lastPrice + atrVal * 1.5;
  const tp1 = signal === 'buy' ? lastPrice + atrVal * 2.5 : lastPrice - atrVal * 2.5;
  const tp2 = signal === 'buy' ? lastPrice + atrVal * 4   : lastPrice - atrVal * 4;
  const rr = Math.abs(tp1 - lastPrice) / Math.abs(sl - lastPrice);

  // ─── Scenarios ───
  const scenarioBullish = trend.trend === 'bullish'
    ? `Continuation: si ${round(lastPrice, 5)} tient au-dessus du dernier swing low, attendre ré-entrée sur OB/FVG pour viser ${round(tp1, 5)} puis ${round(tp2, 5)}.`
    : `Retournement: clôture > dernière résistance ${resistances[0]?.price || ''} + CHoCH haussier confirmerait un changement de structure.`;
  const scenarioBearish = trend.trend === 'bearish'
    ? `Continuation: rejet sur résistance ${resistances[0]?.price || ''} + cassure du dernier swing low cible ${round(tp1 < lastPrice ? tp1 : sl, 5)}.`
    : `Retournement: clôture < dernier support ${supports[0]?.price || ''} + CHoCH baissier ouvrirait le scénario short.`;

  const aiSummary = signal === 'buy'
    ? `[${strat.label}] Setup ACHAT (confiance ${Math.round(confidence)}%) sur ${symbol} ${timeframe}. Bias ${trend.trend}, ${reasonsBull.length} confluences haussières.`
    : signal === 'sell'
    ? `[${strat.label}] Setup VENTE (confiance ${Math.round(confidence)}%) sur ${symbol} ${timeframe}. Bias ${trend.trend}, ${reasonsBear.length} confluences baissières.`
    : `[${strat.label}] Pas de setup clair sur ${symbol} ${timeframe} — attendre confirmation (bias ${trend.trend}, ${Math.round(confidence)}% scor.).`;

  return {
    symbol, timeframe,
    strategy, strategyLabel: strat.label,
    lastPrice: round(lastPrice, 5),
    computedAt: new Date(),
    trend: trend.trend, trendStrength: Math.round(trend.strength),
    bias: signal === 'buy' ? 'long' : signal === 'sell' ? 'short' : 'neutral',
    indicators: {
      emaFast: emaFast != null ? round(emaFast, 5) : null,
      emaMid:  emaMid  != null ? round(emaMid, 5)  : null,
      emaSlow: emaSlow != null ? round(emaSlow, 5) : null,
      rsi:     rsiVal  != null ? Math.round(rsiVal) : null,
      atr:     round(atrVal, 5),
    },
    swingHighs: swings.highs.slice(-8),
    swingLows: swings.lows.slice(-8),
    supportLevels: supports,
    resistanceLevels: resistances,
    orderBlocks, fvgs, liquidityZones: liquidity, bos, choch, breakouts,
    signal, confidence: Math.round(confidence), probability: Math.round(probability),
    entry: signal === 'wait' ? null : round(lastPrice, 5),
    stopLoss:   signal === 'wait' ? null : round(sl, 5),
    takeProfit1: signal === 'wait' ? null : round(tp1, 5),
    takeProfit2: signal === 'wait' ? null : round(tp2, 5),
    riskReward: signal === 'wait' ? null : +rr.toFixed(2),
    reasonsBullish: reasonsBull,
    reasonsBearish: reasonsBear,
    scenarioBullish, scenarioBearish, aiSummary,
    bars,  // also return raw bars for chart drawing (caller may strip)
  };
}

// Multi-timeframe combined analysis with HTF alignment scoring
async function analyzeMultiTF(symbol, timeframes, opts = {}) {
  const results = {};
  for (const tf of timeframes) {
    try { results[tf] = await analyze(symbol, tf, opts); }
    catch (err) { results[tf] = null; }
  }

  // HTF alignment: weight D1 > H4 > H1 > M15 > M5
  const weights = { '1d': 5, '4h': 4, '1h': 3, '15m': 2, '5m': 1, '1m': 0.5 };
  let weightedSum = 0, totalWeight = 0;
  for (const [tf, r] of Object.entries(results)) {
    if (!r) continue;
    const w = weights[tf] || 1;
    const score = r.signal === 'buy' ? 1 : r.signal === 'sell' ? -1 : 0;
    weightedSum += score * w * (r.confidence / 100);
    totalWeight += w;
  }
  const htfAlignment = totalWeight ? Math.round((weightedSum / totalWeight) * 100) : 0;
  for (const r of Object.values(results)) if (r) r.htfAlignment = htfAlignment;

  return results;
}

module.exports = { analyze, analyzeMultiTF, findSwings, detectTrend, atr, listStrategies, STRATEGIES };
