'use strict';
const WebSocket = require('ws');

class DerivService {
  constructor({ token, appId, wsUrl } = {}) {
    this.token = token;
    this.appId = appId || process.env.DERIV_APP_ID || '1089';
    const baseWs = wsUrl || process.env.DERIV_WS_URL || 'wss://ws.derivws.com/websockets/v3';
    this.wsUrl = baseWs.includes('app_id') ? baseWs : `${baseWs.replace(/\/$/, '')}?app_id=${this.appId}`;
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

  async _ensureSocket() {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._resetIdleTimer();
      return this._ws;
    }
    if (this._connectingPromise) {
      return this._connectingPromise;
    }

    this._connectingPromise = (async () => {
      if (!this._resolved) {
        if (!this.appId || this.appId === '1089') {
          try {
            const PlatformSettings = require('../models/PlatformSettings');
            const s = await PlatformSettings.findOne({ key: 'main' });
            if (s && s.derivAppId && String(s.derivAppId).trim()) {
              this.appId = String(s.derivAppId).trim();
              const baseWs = s.derivWsUrl || process.env.DERIV_WS_URL || 'wss://ws.derivws.com/websockets/v3';
              this.wsUrl = baseWs.includes('app_id') ? baseWs : `${baseWs.replace(/\/$/, '')}?app_id=${this.appId}`;
            }
          } catch (_) {}
        }
        this._resolved = true;
      }

      return new Promise((resolve, reject) => {
        const ws = new WebSocket(this.wsUrl);
        const connectTimeout = setTimeout(() => {
          try { ws.close(); } catch (_) {}
          this._connectingPromise = null;
          reject(new Error('Deriv WebSocket connection timeout'));
        }, 12000);

        ws.on('open', () => {
          clearTimeout(connectTimeout);
          this._ws = ws;
          this._connectingPromise = null;
          this._isAuthorized = false;
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
   * Vérifie le token Deriv et récupère les informations du compte (solde, email, account_list...).
   */
  async authorize() {
    if (!this.token) throw new Error('Token Deriv manquant');
    const res = await this._sendRaw({ authorize: this.token });
    this._isAuthorized = true;
    this._authData = res.authorize;
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

