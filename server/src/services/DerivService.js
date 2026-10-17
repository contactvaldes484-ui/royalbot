'use strict';
const WebSocket = require('ws');

class DerivService {
  constructor({ token, loginId, appId, wsUrl } = {}) {
    this.token = token;
    this.loginId = loginId || '';
    this.appId = appId || process.env.DERIV_APP_ID || '34HkkJSIK047dAEWEgXML';
    this.customWsUrl = wsUrl || process.env.DERIV_WS_URL || '';
    this._ws = null;
    this._connectingPromise = null;
    this._isAuthorized = false;
    this._authData = null;
    this._reqCounter = 1;
    this._pending = new Map(); // req_id -> { resolve, reject, timeout }
    this._idleTimer = null;
  }

  _resetIdleTimer() {
    if (this._idleTimer) clearTimeout(this._idleTimer);
    this._idleTimer = setTimeout(() => {
      this.close();
    }, 30000);
  }

  close() {
    if (this._idleTimer) {
      clearTimeout(this._idleTimer);
      this._idleTimer = null;
    }
    if (this._ws) {
      try {
        this._ws.close();
      } catch (_) {}
      this._ws = null;
    }
    this._connectingPromise = null;
    this._isAuthorized = false;
  }

  async _resolveConfig() {
    if (this._resolved) return;
    try {
      const fallbackStore = require('./RuntimeFallbackStore');
      const s = await fallbackStore.getSettings();
      if (s && s.derivAppId && String(s.derivAppId).trim()) {
        this.appId = String(s.derivAppId).trim();
      }
      if (s && s.derivWsUrl && String(s.derivWsUrl).trim()) {
        this.customWsUrl = String(s.derivWsUrl).trim();
      }
    } catch (_) {}
    this._resolved = true;
  }

  /**
   * Récupère les comptes Options v1 via REST (GET https://api.derivws.com/trading/v1/options/accounts)
   * Compatible avec les tokens OAuth 2.0 (ory_at_...) et les PATs Deriv v2
   */
  async fetchV2Accounts() {
    await this._resolveConfig();
    if (!this.token) return null;

    const headers = {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/json',
    };
    // Selon la doc officielle Deriv: Deriv-App-ID est requis pour les PATs, pas pour les tokens OAuth 2.0 (ory_at_...)
    if (!String(this.token).startsWith('ory_at_') && this.appId) {
      headers['Deriv-App-ID'] = String(this.appId);
    }

    try {
      const resp = await fetch('https://api.derivws.com/trading/v1/options/accounts', {
        method: 'GET',
        headers,
      });
      if (!resp.ok) return null;
      const json = await resp.json();
      if (Array.isArray(json?.data) && json.data.length > 0) {
        return json.data;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /**
   * Génère une URL WebSocket OTP authentifiée pour un compte Deriv v2 (ex: DOT90004580)
   * POST https://api.derivws.com/trading/v1/options/accounts/{accountId}/otp
   */
  async _fetchOtpWsUrl(accountId) {
    await this._resolveConfig();
    if (!this.token || !accountId) return null;

    const headers = {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/json',
    };
    if (!String(this.token).startsWith('ory_at_') && this.appId) {
      headers['Deriv-App-ID'] = String(this.appId);
    }

    try {
      const resp = await fetch(
        `https://api.derivws.com/trading/v1/options/accounts/${encodeURIComponent(accountId)}/otp`,
        { method: 'POST', headers }
      );
      if (!resp.ok) return null;
      const json = await resp.json();
      return json?.data?.url || json?.url || null;
    } catch (_) {
      return null;
    }
  }

  async _ensureSocket() {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._resetIdleTimer();
      return this._ws;
    }
    if (this._connectingPromise) {
      return this._connectingPromise;
    }

    this._connectingPromise = (async () => {
      await this._resolveConfig();

      let targetWsUrl = null;
      let preAuthorizedByOtp = false;

      // Si on a un compte Deriv v2 (DOT...) ou un token OAuth2 v2 (ory_at_...), tenter l'OTP WebSocket officiel
      if (this.token && (String(this.loginId).startsWith('DOT') || String(this.token).startsWith('ory_at_'))) {
        let acctId = this.loginId;
        if (!acctId) {
          const v2Accs = await this.fetchV2Accounts();
          if (v2Accs && v2Accs.length > 0) {
            acctId = v2Accs[0].account_id;
            this.loginId = acctId;
          }
        }
        if (acctId) {
          const otpUrl = await this._fetchOtpWsUrl(acctId);
          if (otpUrl) {
            targetWsUrl = otpUrl;
            preAuthorizedByOtp = true;
          }
        }
      }

      // Fallback sur le WebSocket v3 standard (note: /websockets/v3 requiert un app_id numérique, ex: 1089)
      if (!targetWsUrl) {
        const numericAppId = /^\d+$/.test(String(this.appId)) ? String(this.appId) : '1089';
        const baseWs = this.customWsUrl || 'wss://ws.derivws.com/websockets/v3';
        targetWsUrl = baseWs.includes('app_id=')
          ? baseWs
          : `${baseWs.replace(/\/$/, '')}?app_id=${numericAppId}`;
      }

      return new Promise((resolve, reject) => {
        const ws = new WebSocket(targetWsUrl);
        const connectTimeout = setTimeout(() => {
          try { ws.close(); } catch (_) {}
          this._connectingPromise = null;
          reject(new Error('Deriv WebSocket connection timeout'));
        }, 12000);

        ws.on('open', () => {
          clearTimeout(connectTimeout);
          this._ws = ws;
          this._connectingPromise = null;
          this._isAuthorized = preAuthorizedByOtp;
          this._resetIdleTimer();
          resolve(ws);
        });

        ws.on('message', (raw) => {
          try {
            const data = JSON.parse(raw);
            const reqId = data.req_id;
            if (reqId && this._pending.has(reqId)) {
              const entry = this._pending.get(reqId);
              this._pending.delete(reqId);
              clearTimeout(entry.timeout);
              if (data.error) {
                const err = new Error(data.error.message || 'Erreur Deriv API');
                err.code = data.error.code;
                entry.reject(err);
              } else {
                entry.resolve(data);
              }
            }
          } catch (_) {}
        });

        ws.on('close', () => {
          this._ws = null;
          this._connectingPromise = null;
          this._isAuthorized = false;
          for (const [, entry] of this._pending.entries()) {
            clearTimeout(entry.timeout);
            entry.reject(new Error('Connexion Deriv fermée'));
          }
          this._pending.clear();
        });

        ws.on('error', (err) => {
          clearTimeout(connectTimeout);
          this._connectingPromise = null;
          reject(err);
        });
      });
    })();

    return this._connectingPromise;
  }

  async _sendRaw(payload) {
    const ws = await this._ensureSocket();
    const reqId = this._reqCounter++;
    const body = { ...payload, req_id: reqId };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this._pending.delete(reqId);
        reject(new Error('Deriv API timeout'));
      }, 15000);

      this._pending.set(reqId, { resolve, reject, timeout });
      this._resetIdleTimer();
      ws.send(JSON.stringify(body));
    });
  }

  async _send(payload, { requireAuth = false } = {}) {
    if (requireAuth && this.token && !this._isAuthorized) {
      await this.authorize();
    }
    return this._sendRaw(payload);
  }

  /**
   * Vérifie le token Deriv et récupère les informations du compte (compatible v2 REST + v1 WebSocket).
   */
  async authorize() {
    if (!this.token) throw new Error('Token Deriv manquant');

    // 1. Tester d'abord l'API REST Deriv v2 (/trading/v1/options/accounts)
    const v2Accounts = await this.fetchV2Accounts();
    if (v2Accounts && v2Accounts.length > 0) {
      const matched = (this.loginId && v2Accounts.find(a => a.account_id === this.loginId)) || v2Accounts[0];
      this.loginId = matched.account_id;
      this._isAuthorized = true;
      const authObj = {
        loginid: matched.account_id,
        balance: matched.balance !== undefined ? Number(matched.balance) : 0,
        currency: matched.currency || 'USD',
        is_virtual: matched.account_type === 'demo' ? 1 : 0,
        account_list: v2Accounts.map(a => ({
          loginid: a.account_id,
          currency: a.currency || 'USD',
          is_virtual: a.account_type === 'demo' ? 1 : 0,
          balance: a.balance !== undefined ? Number(a.balance) : 0,
        })),
      };
      this._authData = authObj;
      return authObj;
    }

    // 2. Fallback sur WebSocket v3 standard ({ authorize: token })
    const res = await this._sendRaw({ authorize: this.token });
    this._isAuthorized = true;
    this._authData = res.authorize;
    if (res.authorize?.loginid) this.loginId = res.authorize.loginid;
    return res.authorize;
  }

  /**
   * Récupère le solde en temps réel de tous les comptes ou du compte actif
   */
  async getBalance(account = 'current') {
    const res = await this._send({ balance: 1, account }, { requireAuth: true });
    return res.balance;
  }

  /**
   * Liste des symboles actifs (Volatility, Crash/Boom, Forex...)
   */
  async getActiveSymbols() {
    const res = await this._send({ active_symbols: 'brief', product_type: 'basic' });
    return res.active_symbols || [];
  }

  /**
   * Historique des derniers ticks
   */
  async getTicksHistory(symbol, count = 100) {
    const res = await this._send({
      ticks_history: symbol,
      end: 'latest',
      count,
      style: 'ticks',
    });
    return res.history || {};
  }

  /**
   * Demande de proposition de contrat (calcul de payout et vérification)
   */
  async getProposal({ symbol, contractType, amount, duration = 5, durationUnit = 't', barrier, currency = 'USD' }) {
    const payload = {
      proposal: 1,
      amount: Number(amount),
      basis: 'stake',
      contract_type: contractType,
      currency,
      duration: Number(duration),
      duration_unit: durationUnit,
      symbol,
    };
    if (barrier !== undefined && barrier !== null && barrier !== '') {
      payload.barrier = String(barrier);
    }
    const res = await this._send(payload, { requireAuth: Boolean(this.token) });
    return res.proposal;
  }

  /**
   * Achat / exécution du contrat (manuel ou automatique) sur la même connexion WebSocket autorisée
   */
  async buyContract(proposalId, price) {
    const res = await this._send({
      buy: proposalId,
      price: Number(price),
    }, { requireAuth: true });
    return res.buy;
  }

  /**
   * Vérifier le statut d'un contrat en cours
   */
  async getContractStatus(contractId) {
    const res = await this._send({
      proposal_open_contract: 1,
      contract_id: Number(contractId),
    }, { requireAuth: true });
    return res.proposal_open_contract;
  }
}

module.exports = DerivService;


