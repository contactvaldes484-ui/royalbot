/**
 * Candle Provider — fetches OHLC bars for any symbol/timeframe.
 *
 * Sources (in fallback order):
 *   1. Yahoo Finance (free, no API key, query1.finance.yahoo.com)
 *   2. Twelve Data (free tier, requires key)
 *   3. Synthetic random walk (dev fallback)
 *
 * Normalized output: array of { t, open, high, low, close, volume }
 * where t is a UNIX timestamp in seconds.
 */

const TF_TO_YAHOO = {
  '1m':  { interval: '1m',  range: '1d' },
  '5m':  { interval: '5m',  range: '5d' },
  '15m': { interval: '15m', range: '5d' },
  '30m': { interval: '30m', range: '1mo' },
  '1h':  { interval: '60m', range: '1mo' },
  '4h':  { interval: '1h',  range: '3mo' },   // 4h not native — we resample
  '1d':  { interval: '1d',  range: '1y' },
};

const TF_TO_TWELVE = {
  '1m': '1min', '5m': '5min', '15m': '15min', '30m': '30min',
  '1h': '1h', '4h': '4h', '1d': '1day',
};

// Yahoo expects FX symbols as "EURUSD=X", crypto as "BTC-USD"
function yahooSymbol(sym) {
  const s = String(sym).toUpperCase().replace(/[/]/g, '');
  if (s === 'XAUUSD') return 'GC=F';        // Gold futures (close proxy)
  if (s === 'XAGUSD') return 'SI=F';        // Silver futures
  if (s === 'BTCUSD' || s === 'BTCUSDT') return 'BTC-USD';
  if (s === 'ETHUSD' || s === 'ETHUSDT') return 'ETH-USD';
  if (/^[A-Z]{6}$/.test(s)) return `${s}=X`;  // forex 6-letter
  return s;
}

class CandleProvider {
  constructor() {
    this.cache = new Map();           // key=symbol|tf  → { ts, bars }
    this.cacheTtlMs = 60_000;          // 60s cache to avoid hammering Yahoo
  }

  _cacheKey(symbol, tf) { return `${symbol}|${tf}`; }
  _hit(key) {
    const c = this.cache.get(key);
    if (!c) return null;
    if (Date.now() - c.ts > this.cacheTtlMs) return null;
    return c.bars;
  }
  _store(key, bars) { this.cache.set(key, { ts: Date.now(), bars }); }

  async getCandles(symbol, timeframe, { provider = 'yahoo', apiKey = '', count = 200 } = {}) {
    const key = this._cacheKey(symbol, timeframe);
    const hit = this._hit(key);
    if (hit && hit.length >= Math.min(count, 50)) return hit.slice(-count);

    let bars = [];
    try {
      if (provider === 'twelvedata' && apiKey) {
        bars = await this._fetchTwelveData(symbol, timeframe, count, apiKey);
      } else if (provider === 'synthetic') {
        bars = this._synthetic(symbol, timeframe, count);
      } else {
        bars = await this._fetchYahoo(symbol, timeframe);
        // 4h needs resampling from 1h
        if (timeframe === '4h' && bars.length) bars = this._resample(bars, 4);
      }
    } catch (err) {
      console.warn(`[candleProvider] ${symbol} ${timeframe} fetch failed: ${err.message} — falling back to synthetic`);
      bars = this._synthetic(symbol, timeframe, count);
    }

    if (!bars.length) bars = this._synthetic(symbol, timeframe, count);
    this._store(key, bars);
    return bars.slice(-count);
  }

  // ─── Yahoo Finance ─────────────────────────────────────────────────────────
  async _fetchYahoo(symbol, tf) {
    const map = TF_TO_YAHOO[tf] || TF_TO_YAHOO['1h'];
    const ySym = yahooSymbol(symbol);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ySym}?interval=${map.interval}&range=${map.range}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 UltimateBot/1.0' },
    });
    if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
    const json = await res.json();
    const r = json?.chart?.result?.[0];
    if (!r) throw new Error('Yahoo: no result');
    const ts = r.timestamp || [];
    const q = r.indicators?.quote?.[0] || {};
    const bars = [];
    for (let i = 0; i < ts.length; i++) {
      const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i], v = q.volume?.[i] || 0;
      if (o == null || h == null || l == null || c == null) continue;
      bars.push({ t: ts[i], open: +o, high: +h, low: +l, close: +c, volume: +v });
    }
    return bars;
  }

  // ─── Twelve Data ───────────────────────────────────────────────────────────
  async _fetchTwelveData(symbol, tf, count, apiKey) {
    const interval = TF_TO_TWELVE[tf] || '1h';
    // Twelve Data wants "EUR/USD" format for forex
    const tdSym = /^[A-Z]{6}$/.test(symbol)
      ? `${symbol.slice(0, 3)}/${symbol.slice(3, 6)}`
      : symbol;
    const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(tdSym)}&interval=${interval}&outputsize=${count}&apikey=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TwelveData HTTP ${res.status}`);
    const json = await res.json();
    if (!Array.isArray(json.values)) throw new Error(json.message || 'TwelveData empty');
    return json.values.reverse().map(v => ({
      t: Math.floor(new Date(v.datetime).getTime() / 1000),
      open: +v.open, high: +v.high, low: +v.low, close: +v.close, volume: +(v.volume || 0),
    }));
  }

  // ─── Resample N→M timeframe ────────────────────────────────────────────────
  _resample(bars, factor) {
    const out = [];
    for (let i = 0; i + factor <= bars.length; i += factor) {
      const slice = bars.slice(i, i + factor);
      out.push({
        t: slice[0].t,
        open: slice[0].open,
        close: slice[slice.length - 1].close,
        high: Math.max(...slice.map(b => b.high)),
        low: Math.min(...slice.map(b => b.low)),
        volume: slice.reduce((s, b) => s + (b.volume || 0), 0),
      });
    }
    return out;
  }

  // ─── Synthetic OHLC (dev fallback / on Yahoo failure) ──────────────────────
  _synthetic(symbol, tf, count) {
    // Seed from symbol so bars are deterministic per pair
    let seed = 0;
    for (const ch of symbol) seed = (seed * 31 + ch.charCodeAt(0)) % 1e9;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const tfSeconds = { '1m': 60, '5m': 300, '15m': 900, '30m': 1800, '1h': 3600, '4h': 14400, '1d': 86400 }[tf] || 3600;
    const startPrice = symbol.startsWith('XAU') ? 2000 : symbol.startsWith('BTC') ? 60000 : symbol.includes('JPY') ? 150 : 1.10;
    const bars = [];
    let price = startPrice;
    const now = Math.floor(Date.now() / 1000);
    for (let i = count - 1; i >= 0; i--) {
      const drift = (rand() - 0.5) * startPrice * 0.003;
      const noise = startPrice * 0.0015;
      const open = price;
      const close = price + drift;
      const high = Math.max(open, close) + rand() * noise;
      const low  = Math.min(open, close) - rand() * noise;
      bars.push({
        t: now - i * tfSeconds, open, high, low, close,
        volume: Math.floor(rand() * 10000),
      });
      price = close;
    }
    return bars;
  }
}

module.exports = new CandleProvider();
