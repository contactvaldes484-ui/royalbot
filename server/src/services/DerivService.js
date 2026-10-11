'use strict';
const WebSocket = require('ws');

class DerivService {
  constructor({ token, appId, wsUrl } = {}) {
    this.token = token;
    this.appId = appId || process.env.DERIV_APP_ID || '1089';
    const baseWs = wsUrl || process.env.DERIV_WS_URL || 'wss://ws.binaryws.com/websockets/v3';
    this.wsUrl = baseWs.includes('app_id') ? baseWs : `${baseWs.replace(/\/$/, '')}?app_id=${this.appId}`;
  }

  async _connect() {
    if (!this._resolved) {
      if (!this.appId || this.appId === '1089') {
        try {
          const PlatformSettings = require('../models/PlatformSettings');
          const s = await PlatformSettings.findOne({ key: 'main' });
          if (s && s.derivAppId && s.derivAppId !== '1089') {
            this.appId = s.derivAppId;
            const baseWs = s.derivWsUrl || process.env.DERIV_WS_URL || 'wss://ws.binaryws.com/websockets/v3';
            this.wsUrl = baseWs.includes('app_id') ? baseWs : `${baseWs.replace(/\/$/, '')}?app_id=${this.appId}`;
          }
        } catch (_) {}
      }
      this._resolved = true;
    }
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl);
      ws.on('open', () => resolve(ws));
      ws.on('error', (err) => reject(err));
    });
  }

  async _send(payload) {
    const ws = await this._connect();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Deriv API timeout'));
      }, 15000);

      ws.on('message', (raw) => {
        try {
          const data = JSON.parse(raw);
          if (data.error) {
            clearTimeout(timeout);
            ws.close();
            const err = new Error(data.error.message || 'Erreur Deriv API');
            err.code = data.error.code;
            return reject(err);
          }
          clearTimeout(timeout);
          ws.close();
          resolve(data);
        } catch (e) {
          clearTimeout(timeout);
          ws.close();
          reject(e);
        }
      });

      ws.send(JSON.stringify(payload));
    });
  }

  /**
   * Vérifie le token Deriv et récupère les informations du compte.
   */
  async authorize() {
    const res = await this._send({ authorize: this.token });
    return res.authorize;
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
    const res = await this._send(payload);
    return res.proposal;
  }

  /**
   * Achat / exécution du contrat (manuel ou automatique)
   */
  async buyContract(proposalId, price) {
    const res = await this._send({
      buy: proposalId,
      price: Number(price),
    });
    return res.buy;
  }

  /**
   * Vérifier le statut d'un contrat en cours
   */
  async getContractStatus(contractId) {
    const res = await this._send({
      proposal_open_contract: 1,
      contract_id: Number(contractId),
    });
    return res.proposal_open_contract;
  }
}

module.exports = DerivService;
