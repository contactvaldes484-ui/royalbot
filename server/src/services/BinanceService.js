'use strict';
const crypto = require('crypto');

const BASES = {
  spot:    { live: 'https://api.binance.com',  test: 'https://testnet.binance.vision' },
  futures: { live: 'https://fapi.binance.com', test: 'https://testnet.binancefuture.com' },
};

class BinanceService {
  /** @param {{apiKey,apiSecret,isTestnet}} creds */
  constructor({ apiKey, apiSecret, isTestnet = false } = {}) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.isTestnet = isTestnet;
    this.recvWindow = 5000;
    this._timeOffset = 0;
  }

  _base(market) { return BASES[market][this.isTestnet ? 'test' : 'live']; }

  _sign(query) {
    return crypto.createHmac('sha256', this.apiSecret).update(query).digest('hex');
  }

  async _request(market, method, path, params = {}, signed = false) {
    const base = this._base(market);
    let url = `${base}${path}`;
    const headers = {};
    let body;

    if (signed) {
      params.timestamp = Date.now() + this._timeOffset;
      params.recvWindow = this.recvWindow;
    }
    const qs = new URLSearchParams(
      Object.entries(params)
        .filter(([k, v]) => v !== undefined && v !== null && k !== '__retried')
        .map(([k, v]) => [k, String(v)])
    ).toString();

    if (signed) {
      const sig = this._sign(qs);
      headers['X-MBX-APIKEY'] = this.apiKey;
      url += `?${qs}&signature=${sig}`;
    } else if (qs && method === 'GET') {
      url += `?${qs}`;
    } else if (qs) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      body = qs;
      if (this.apiKey) headers['X-MBX-APIKEY'] = this.apiKey;
    } else if (this.apiKey && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
      headers['X-MBX-APIKEY'] = this.apiKey;
    }

    const res = await fetch(url, { method, headers, body });
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch { data = text; }

    if (!res.ok) {
      const code = data && data.code;
      if (code === -1021 && !params.__retried) {
        await this.syncTime(market);
        return this._request(market, method, path, { ...params, __retried: true }, signed);
      }
      const msg = (data && data.msg) || res.statusText;
      const err = new Error(`Binance ${code || res.status}: ${msg}`);
      err.code = code; err.httpStatus = res.status;
      throw err;
    }
    return data;
  }

  // ── Connexion / temps ──────────────────────────────────────
  async syncTime(market = 'spot') {
    const path = market === 'futures' ? '/fapi/v1/time' : '/api/v3/time';
    const data = await this._request(market, 'GET', path);
    this._timeOffset = data.serverTime - Date.now();
    return this._timeOffset;
  }

  ping(market = 'spot') {
    const path = market === 'futures' ? '/fapi/v1/ping' : '/api/v3/ping';
    return this._request(market, 'GET', path);
  }

  // ── Compte / soldes / permissions ─────────────────────────
  getSpotAccount()    { return this._request('spot', 'GET', '/api/v3/account', {}, true); }
  getFuturesAccount() { return this._request('futures', 'GET', '/fapi/v2/account', {}, true); }
  getApiPermissions() { return this._request('spot', 'GET', '/sapi/v1/account/apiRestrictions', {}, true); }

  // ── Données marché ─────────────────────────────────────────
  getExchangeInfo(market, symbol) {
    const path = market === 'futures' ? '/fapi/v1/exchangeInfo' : '/api/v3/exchangeInfo';
    return this._request(market, 'GET', path, symbol ? { symbol } : {});
  }
  getKlines(market, symbol, interval = '5m', limit = 200) {
    const path = market === 'futures' ? '/fapi/v1/klines' : '/api/v3/klines';
    return this._request(market, 'GET', path, { symbol, interval, limit });
  }
  getPrice(market, symbol) {
    const path = market === 'futures' ? '/fapi/v1/ticker/price' : '/api/v3/ticker/price';
    return this._request(market, 'GET', path, { symbol });
  }

  // ── Ordres ─────────────────────────────────────────────────
  createOrder(market, params) {
    const path = market === 'futures' ? '/fapi/v1/order' : '/api/v3/order';
    return this._request(market, 'POST', path, params, true);
  }
  cancelOrder(market, symbol, orderId) {
    const path = market === 'futures' ? '/fapi/v1/order' : '/api/v3/order';
    return this._request(market, 'DELETE', path, { symbol, orderId }, true);
  }
  getOpenOrders(market, symbol) {
    const path = market === 'futures' ? '/fapi/v1/openOrders' : '/api/v3/openOrders';
    return this._request(market, 'GET', path, symbol ? { symbol } : {}, true);
  }

  // ── Futures spécifique ─────────────────────────────────────
  getFuturesPositions() { return this._request('futures', 'GET', '/fapi/v2/positionRisk', {}, true); }
  setLeverage(symbol, leverage) {
    return this._request('futures', 'POST', '/fapi/v1/leverage', { symbol, leverage }, true);
  }
  setMarginType(symbol, type = 'ISOLATED') {
    return this._request('futures', 'POST', '/fapi/v1/marginType', { symbol, marginType: type }, true)
      .catch(e => { if (e.code === -4046) return { ok: true }; throw e; });
  }

  // ── User data stream (listenKey) ───────────────────────────
  createListenKey(market = 'spot') {
    const path = market === 'futures' ? '/fapi/v1/listenKey' : '/api/v3/userDataStream';
    return this._request(market, 'POST', path, {}, false);
  }
  keepAliveListenKey(market, listenKey) {
    const path = market === 'futures' ? '/fapi/v1/listenKey' : '/api/v3/userDataStream';
    return this._request(market, 'PUT', path, market === 'spot' ? { listenKey } : {}, false);
  }

  // ── Test connexion + permissions (à l'ajout d'un compte) ───
  async testConnection(market = 'both') {
    const result = { spot: false, futures: false, reading: false, withdraw: false, spotUSDT: 0, futuresUSDT: 0, errors: [] };
    try {
      await this.syncTime('spot');
      const acc = await this.getSpotAccount();
      result.reading = true;
      result.spot = acc.canTrade === true;
      result.spotUSDT = Number((acc.balances || []).find(b => b.asset === 'USDT')?.free || 0);
    } catch (e) { result.errors.push(`spot: ${e.message}`); }

    if (market === 'futures' || market === 'both') {
      try {
        await this.syncTime('futures');
        const f = await this.getFuturesAccount();
        result.futures = f.canTrade !== false;
        result.futuresUSDT = Number(f.availableBalance || 0);
      } catch (e) { result.errors.push(`futures: ${e.message}`); }
    }
    try {
      const perms = await this.getApiPermissions();
      result.withdraw = perms.enableWithdrawals === true;
    } catch (_) { /* sapi indispo sur testnet */ }
    return result;
  }
}

module.exports = BinanceService;
