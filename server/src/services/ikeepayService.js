/**
 * ikeepayService — Intégration iKeePay (https://ikeepay.com)
 * Inline Checkout + Webhook + Vérification de transaction
 */
'use strict';
const fallbackStore = require('./RuntimeFallbackStore');

async function getCredentials() {
  let pub = process.env.IKEEPAY_PUBLIC_KEY;
  let sec = process.env.IKEEPAY_SECRET_KEY;
  let enabled = process.env.IKEEPAY_ENABLED === 'true';
  let currency = process.env.IKEEPAY_CURRENCY || 'USD';

  try {
    const s = await fallbackStore.getSettings();
    if (s) {
      if (!pub) pub = s.ikeepayPublicKey;
      if (!sec) sec = s.ikeepaySecretKey;
      if (s.ikeepayEnabled !== undefined) enabled = Boolean(s.ikeepayEnabled);
      if (s.ikeepayCurrency) currency = s.ikeepayCurrency;
    }
  } catch (_) {}

  return {
    publicKey: String(pub || '').trim(),
    secretKey: String(sec || '').trim(),
    enabled: Boolean(enabled && pub),
    currency: currency || 'USD',
  };
}

async function isConfigured() {
  const creds = await getCredentials();
  return Boolean(creds.enabled && creds.publicKey);
}

function buildCheckoutUrl({ publicKey, amount, currency = 'USD', orderId, redirectUrl = '' }) {
  const params = new URLSearchParams({
    pk: String(publicKey),
    amount: String(amount),
    currency: String(currency).toUpperCase(),
    order_id: String(orderId),
  });
  if (redirectUrl) params.set('redirect_url', redirectUrl);
  return `https://ikeepay.com/checkout/v1/inline?${params.toString()}`;
}

async function verifyTransaction(reference) {
  if (!reference) return { ok: false, error: 'Référence iKeePay ou order_id requise.' };
  const creds = await getCredentials();

  try {
    const url = `https://api.ikeepay.com/checkout-verify/${encodeURIComponent(reference)}`;
    const headers = { 'Accept': 'application/json' };
    if (creds.secretKey) {
      headers['Authorization'] = `Bearer ${creds.secretKey}`;
      headers['x-api-key'] = creds.secretKey;
    }
    const resp = await fetch(url, { method: 'GET', headers, signal: AbortSignal.timeout(10000) });
    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      return { ok: false, status: resp.status, error: data.message || data.error || 'Erreur vérification iKeePay', data };
    }

    const isCompleted = data.status === 'completed' || data.event === 'payment.success' || data.success === true;
    return {
      ok: isCompleted,
      status: data.status || (isCompleted ? 'completed' : 'pending'),
      amount: data.amount,
      currency: data.currency,
      orderId: data.order_id,
      ikeepayRef: data.ikeepay_ref,
      data,
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = {
  getCredentials,
  isConfigured,
  buildCheckoutUrl,
  verifyTransaction,
};
