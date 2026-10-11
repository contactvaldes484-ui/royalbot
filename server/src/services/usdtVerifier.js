/**
 * usdtVerifier — vérification on-chain automatique des paiements USDT TRC-20 (réseau TRON).
 *
 * Interroge TronGrid pour retrouver un transfert USDT vers notre adresse de réception,
 * d'un montant suffisant, confirmé, et dont le hash n'a pas déjà été consommé.
 *
 * Config (env) :
 *   USDT_TRON_ADDRESS  — adresse TRON de réception (T...)
 *   TRONGRID_API_KEY   — clé TronGrid (gratuite). Sans clé → mode fallback (auto=false).
 *   TRONGRID_BASE_URL  — override optionnel (défaut https://api.trongrid.io)
 */

// Contrat officiel USDT sur TRON (TRC-20), 6 décimales.
const USDT_TRC20_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const USDT_DECIMALS = 6;

function baseUrl() {
  return (process.env.TRONGRID_BASE_URL || 'https://api.trongrid.io').replace(/\/$/, '');
}

async function getConfig() {
  let address = process.env.USDT_TRON_ADDRESS || '';
  let apiKey = process.env.TRONGRID_API_KEY || '';
  if (!address || !apiKey) {
    try {
      const PlatformSettings = require('../models/PlatformSettings');
      const s = await PlatformSettings.findOne({ key: 'main' });
      if (s) {
        address = address || s.usdtTronAddress || '';
        apiKey = apiKey || s.trongridApiKey || '';
      }
    } catch (_) {}
  }
  return { address, apiKey };
}

function receivingAddress() {
  return process.env.USDT_TRON_ADDRESS || '';
}

/**
 * L'auto-vérif est possible si on a une adresse de réception ET une clé TronGrid.
 */
async function isConfigured() {
  const { address, apiKey } = await getConfig();
  return !!(address && apiKey);
}

/**
 * Vérifie un paiement USDT TRC-20.
 * @returns {Promise<{ ok:boolean, auto:boolean, reason?:string, amount?:number, txHash?:string }>}
 */
async function verifyPayment({ txHash, expectedUsd, toAddress } = {}) {
  const { address: defAddress, apiKey } = await getConfig();
  const to = (toAddress || defAddress);
  if (!to || !apiKey) {
    return { ok: false, auto: false, reason: 'USDT auto-verification not configured (missing address or TronGrid key).' };
  }
  if (!txHash || typeof txHash !== 'string' || txHash.length < 20) {
    return { ok: false, auto: true, reason: 'txHash invalide.' };
  }
  if (!(expectedUsd > 0)) {
    return { ok: false, auto: true, reason: 'Montant attendu invalide.' };
  }

  const url = `${baseUrl()}/v1/accounts/${to}/transactions/trc20`
    + `?only_to=true&limit=100&contract_address=${USDT_TRC20_CONTRACT}`;

  let json;
  try {
    const resp = await fetch(url, {
      headers: { 'TRON-PRO-API-KEY': apiKey, 'Accept': 'application/json' },
    });
    if (!resp.ok) {
      return { ok: false, auto: true, reason: `TronGrid HTTP ${resp.status}` };
    }
    json = await resp.json();
  } catch (err) {
    return { ok: false, auto: true, reason: `TronGrid injoignable: ${err.message}` };
  }

  const txs = Array.isArray(json?.data) ? json.data : [];
  const hash = txHash.trim().toLowerCase().replace(/^0x/, '');
  const match = txs.find((t) => String(t.transaction_id || '').toLowerCase() === hash);

  if (!match) {
    return { ok: false, auto: true, reason: 'Transaction introuvable vers l\'adresse de réception (ou pas encore indexée).' };
  }
  if (String(match.to).toLowerCase() !== String(to).toLowerCase()) {
    return { ok: false, auto: true, reason: 'Destinataire de la transaction incorrect.' };
  }

  // Montant : value est un entier (string) en plus petite unité (6 décimales).
  const decimals = match.token_info?.decimals ?? USDT_DECIMALS;
  const paid = Number(match.value) / Math.pow(10, decimals);
  // Tolérance de 1% pour les frais/écarts de conversion.
  if (!(paid >= expectedUsd * 0.99)) {
    return { ok: false, auto: true, reason: `Montant insuffisant: ${paid} USDT reçus, ${expectedUsd} attendus.`, amount: paid };
  }

  return { ok: true, auto: true, amount: paid, txHash: match.transaction_id };
}

module.exports = {
  verifyPayment,
  isConfigured,
  receivingAddress,
  USDT_TRC20_CONTRACT,
};
