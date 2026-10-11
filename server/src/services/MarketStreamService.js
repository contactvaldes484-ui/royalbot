'use strict';
const WebSocket = require('ws');

const WS_BASE = {
  spot:    { live: 'wss://stream.binance.com:9443', test: 'wss://stream.testnet.binance.vision' },
  futures: { live: 'wss://fstream.binance.com',     test: 'wss://stream.binancefuture.com' },
};
function useTestnet() { return process.env.BINANCE_USE_TESTNET === 'true'; }

class MarketStreamService {
  constructor() {
    this.streams = new Map(); // "market:symbol:tf" -> { ws, subscribers:Set(userId) }
  }

  subscribe(market, symbol, tf, userId) {
    const key = `${market}:${symbol}:${tf}`;
    let s = this.streams.get(key);
    if (s) { s.subscribers.add(userId); return; }

    const base = WS_BASE[market][useTestnet() ? 'test' : 'live'];
    const stream = `${symbol.toLowerCase()}@kline_${tf}`;
    const ws = new WebSocket(`${base}/ws/${stream}`);
    s = { ws, subscribers: new Set([userId]) };
    this.streams.set(key, s);

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw);
        const k = msg.k; if (!k) return;
        const payload = {
          type: 'kline', market, symbol,
          candle: { time: Math.floor(k.t / 1000), open: +k.o, high: +k.h, low: +k.l, close: +k.c, volume: +k.v, closed: k.x },
          price: +k.c,
        };
        for (const uid of s.subscribers) {
          if (global.broadcastToUser) global.broadcastToUser(uid, payload);
        }
      } catch (_) {}
    });
    ws.on('close', () => { setTimeout(() => this._reconnect(key, market, symbol, tf), 3000); });
    ws.on('error', () => { try { ws.close(); } catch (_) {} });
  }

  unsubscribe(market, symbol, tf, userId) {
    const key = `${market}:${symbol}:${tf}`;
    const s = this.streams.get(key);
    if (!s) return;
    s.subscribers.delete(userId);
    if (s.subscribers.size === 0) { try { s.ws.close(); } catch (_) {} this.streams.delete(key); }
  }

  _reconnect(key, market, symbol, tf) {
    const s = this.streams.get(key);
    if (!s || s.subscribers.size === 0) return;
    const subs = [...s.subscribers];
    this.streams.delete(key);
    for (const uid of subs) this.subscribe(market, symbol, tf, uid);
  }
}

module.exports = new MarketStreamService();
