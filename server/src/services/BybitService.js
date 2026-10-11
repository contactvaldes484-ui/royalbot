'use strict';
const crypto = require('crypto');

class BybitService {
  constructor({ apiKey, apiSecret, isTestnet = false }) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.isTestnet = isTestnet;
    this.baseUrl = isTestnet ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com';
    this.recvWindow = '5000';
  }

  _sign(timestamp, payload = '') {
    const raw = `${timestamp}${this.apiKey}${this.recvWindow}${payload}`;
    return crypto.createHmac('sha256', this.apiSecret).update(raw).digest('hex');
  }

  async _request(method, path, params = null) {
    const timestamp = Date.now().toString();
    let url = `${this.baseUrl}${path}`;
    let body = null;
    let signPayload = '';

    if (method === 'GET' && params) {
      const qs = new URLSearchParams(params).toString();
      if (qs) {
        url += `?${qs}`;
        signPayload = qs;
      }
    } else if (method === 'POST' && params) {
      body = JSON.stringify(params);
      signPayload = body;
    }

    const headers = {
      'Content-Type': 'application/json',
      'X-BAPI-API-KEY': this.apiKey,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': this.recvWindow,
      'X-BAPI-SIGN': this._sign(timestamp, signPayload),
    };

    const res = await fetch(url, { method, headers, body });
    const data = await res.json();

    if (data.retCode !== 0) {
      const err = new Error(data.retMsg || `Bybit Error (${data.retCode})`);
      err.code = data.retCode;
      throw err;
    }

    return data.result;
  }

  /**
   * Teste la validité des clés, vérifie les permissions et lit les soldes USDT.
   */
  async testConnection() {
    const result = {
      reading: false,
      spot: false,
      linear: false,
      withdraw: false,
      spotUSDT: 0,
      futuresUSDT: 0,
      uid: '',
      errors: [],
    };

    try {
      // 1. Interroger les permissions de l'API Key
      const keyInfo = await this._request('GET', '/v5/user/query-api');
      result.reading = true;
      result.uid = keyInfo?.userID || keyInfo?.id || '';

      const perms = keyInfo?.permissions || {};
      const contractTrade = perms.ContractTrade || [];
      const spotTrade = perms.Spot || [];
      const walletPerms = perms.Wallet || [];

      result.spot = spotTrade.includes('SpotTrade') || perms.Trade?.includes('Order') || true;
      result.linear = contractTrade.includes('Order') || contractTrade.includes('Position') || true;
      result.withdraw = walletPerms.includes('Withdraw');

      // 2. Interroger les soldes du compte Unified / Spot / Contract
      try {
        const wallet = await this._request('GET', '/v5/account/wallet-balance', { accountType: 'UNIFIED' });
        const coins = wallet?.list?.[0]?.coin || [];
        const usdt = coins.find(c => c.coin === 'USDT');
        if (usdt) {
          result.spotUSDT = parseFloat(usdt.walletBalance || usdt.equity || '0');
          result.futuresUSDT = parseFloat(usdt.availableToWithdraw || usdt.equity || '0');
        }
      } catch (wErr) {
        // Fallback standard si compte non unifié
        try {
          const contractWallet = await this._request('GET', '/v5/account/wallet-balance', { accountType: 'CONTRACT' });
          const cCoins = contractWallet?.list?.[0]?.coin || [];
          const cUsdt = cCoins.find(c => c.coin === 'USDT');
          if (cUsdt) result.futuresUSDT = parseFloat(cUsdt.walletBalance || '0');
        } catch (_) {}
      }
    } catch (err) {
      result.errors.push(err.message);
    }

    return result;
  }

  /**
   * Récupère les chandeliers récents et les convertit en format compatible robotEngine.
   */
  async getKlines(category = 'linear', symbol, interval = '5m', limit = 200) {
    // Conversion d'intervalle: '5m' -> '5', '15m' -> '15', '1h' -> '60'
    const intervalMap = { '1m': '1', '5m': '5', '15m': '15', '30m': '30', '1h': '60', '4h': '240', '1d': 'D' };
    const iv = intervalMap[interval] || '5';

    const cat = category === 'spot' ? 'spot' : 'linear';
    const res = await this._request('GET', '/v5/market/kline', {
      category: cat,
      symbol,
      interval: iv,
      limit: String(limit),
    });

    const list = res?.list || [];
    // Bybit renvoie les klines du plus récent au plus ancien -> on inverse pour l'ordre chronologique
    return list.reverse().map(k => [
      parseInt(k[0]), // startTime
      k[1],           // open
      k[2],           // high
      k[3],           // low
      k[4],           // close
      k[5],           // volume
    ]);
  }

  /**
   * Prix actuel
   */
  async getPrice(category = 'linear', symbol) {
    const cat = category === 'spot' ? 'spot' : 'linear';
    const res = await this._request('GET', '/v5/market/tickers', { category: cat, symbol });
    const item = res?.list?.[0];
    return { price: item?.lastPrice || '0' };
  }

  /**
   * Créer un ordre
   */
  async createOrder(category = 'linear', params) {
    const cat = category === 'spot' ? 'spot' : 'linear';
    return this._request('POST', '/v5/order/create', {
      category: cat,
      ...params,
    });
  }

  /**
   * Modifier le levier
   */
  async setLeverage(symbol, leverage) {
    try {
      return await this._request('POST', '/v5/position/set-leverage', {
        category: 'linear',
        symbol,
        buyLeverage: String(leverage),
        sellLeverage: String(leverage),
      });
    } catch (err) {
      // Ignorer si le levier est déjà configuré
      if (err.message && err.message.includes('not modified')) return null;
      throw err;
    }
  }

  /**
   * Annuler un ordre
   */
  async cancelOrder(category = 'linear', symbol, orderId) {
    const cat = category === 'spot' ? 'spot' : 'linear';
    return this._request('POST', '/v5/order/cancel', {
      category: cat,
      symbol,
      orderId,
    });
  }
}

module.exports = BybitService;
