/**
 * ikeepayService — Intégration H2H officielle iKeePay (https://api.ikeepay.com)
 * Payin (POST /h2h-payin), Payout (POST /h2h-payout), Verify (GET /h2h-verify/:reference) & Webhooks HMAC SHA-256
 */
'use strict';
const crypto = require('crypto');
const fallbackStore = require('./RuntimeFallbackStore');

const IKEEPAY_BASE_URL = 'https://api.ikeepay.com';

async function getCredentials() {
  let pub = process.env.IKEEPAY_PUBLIC_KEY;
  let sec = process.env.IKEEPAY_SECRET_KEY;
  let enabled = process.env.IKEEPAY_ENABLED === 'true';
  let currency = process.env.IKEEPAY_CURRENCY || 'XOF';

  try {
    const s = await fallbackStore.getSettings();
    if (s) {
      if (s.ikeepayPublicKey) pub = s.ikeepayPublicKey;
      if (s.ikeepaySecretKey) sec = s.ikeepaySecretKey;
      if (s.ikeepayEnabled !== undefined) enabled = Boolean(s.ikeepayEnabled);
      if (s.ikeepayCurrency) currency = s.ikeepayCurrency;
    }
  } catch (_) {}

  return {
    publicKey: String(pub || '').trim(),
    secretKey: String(sec || '').trim(),
    enabled: Boolean(enabled && (sec || pub)),
    currency: currency || 'XOF',
  };
}

async function isConfigured() {
  const creds = await getCredentials();
  return Boolean(creds.enabled && creds.secretKey);
}

function buildCheckoutUrl({ publicKey, amount, currency = 'XOF', orderId, redirectUrl = '' }) {
  const params = new URLSearchParams({
    pk: String(publicKey),
    amount: String(amount),
    currency: String(currency).toUpperCase(),
    order_id: String(orderId),
  });
  if (redirectUrl) params.set('redirect_url', redirectUrl);
  return `https://ikeepay.com/checkout/v1/inline?${params.toString()}`;
}

/**
 * 1. Encaissement H2H (Payin) — POST /h2h-payin
 */
async function initPayin({
  amount,
  currency = 'XOF',
  country = 'CI',
  phoneNumber,
  operator,
  externalReference,
  customerEmail,
  otp,
}) {
  const creds = await getCredentials();
  if (!creds.secretKey) {
    throw new Error('Clé secrète iKeePay (SECRET_KEY) non configurée dans les paramètres Admin.');
  }

  const payload = {
    amount: Number(amount),
    currency: String(currency || creds.currency || 'XOF').toUpperCase(),
    country: String(country || 'CI').toUpperCase(),
    phoneNumber: String(phoneNumber || '').replace(/[^\d]/g, ''),
    operator: String(operator || 'ORANGE').toUpperCase(),
    external_reference: String(externalReference),
    customer_email: customerEmail || 'client@royal-bot.online',
  };
  if (otp) payload.otp = String(otp).trim();

  const resp = await fetch(`${IKEEPAY_BASE_URL}/h2h-payin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-api-key': creds.secretKey,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data.status === 'error' || data.success === false) {
    throw new Error(data.message || data.error || `Erreur iKeePay Payin (${resp.status})`);
  }

  const txData = data.data || data;
  return {
    ok: true,
    externalReference: txData.external_reference || payload.external_reference,
    providerReference: txData.provider_reference || txData.reference || '',
    paymentLink: txData.payment_link || data.payment_link || '',
    status: txData.status || 'pending',
    raw: data,
  };
}

/**
 * 2. Retrait H2H (Payout) — POST /h2h-payout
 */
async function initPayout({
  amount,
  currency = 'XOF',
  country = 'CI',
  phoneNumber,
  operator,
  externalReference,
}) {
  const creds = await getCredentials();
  if (!creds.secretKey) {
    throw new Error('Clé secrète iKeePay (SECRET_KEY) non configurée dans les paramètres Admin.');
  }

  const payload = {
    amount: Number(amount),
    currency: String(currency || creds.currency || 'XOF').toUpperCase(),
    country: String(country || 'CI').toUpperCase(),
    phoneNumber: String(phoneNumber || '').replace(/[^\d]/g, ''),
    operator: String(operator || 'ORANGE').toUpperCase(),
    external_reference: String(externalReference),
  };

  const resp = await fetch(`${IKEEPAY_BASE_URL}/h2h-payout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-api-key': creds.secretKey,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data.status === 'error' || data.success === false) {
    throw new Error(data.message || data.error || `Erreur iKeePay Payout (${resp.status})`);
  }

  const txData = data.data || data;
  return {
    ok: true,
    externalReference: txData.external_reference || payload.external_reference,
    providerReference: txData.provider_reference || txData.reference || '',
    status: txData.status || 'pending',
    raw: data,
  };
}

/**
 * 3. Vérification de transaction — GET /h2h-verify/:reference
 */
async function verifyTransaction(reference) {
  if (!reference) return { ok: false, error: 'Référence requise.' };
  const creds = await getCredentials();
  if (!creds.secretKey) return { ok: false, error: 'Clé secrète iKeePay non configurée.' };

  try {
    const url = `${IKEEPAY_BASE_URL}/h2h-verify/${encodeURIComponent(reference)}`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'x-api-key': creds.secretKey,
      },
      signal: AbortSignal.timeout(12000),
    });
    const json = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      return { ok: false, status: resp.status, error: json.message || json.error || 'Erreur vérification iKeePay', data: json };
    }

    const tx = json.data || json;
    const isCompleted = tx.status === 'completed' || tx.status === 'success';
    return {
      ok: isCompleted,
      status: tx.status || (isCompleted ? 'completed' : 'pending'),
      type: tx.type,
      amount: tx.amount,
      currency: tx.currency,
      externalReference: tx.external_reference,
      providerReference: tx.provider_reference,
      operator: tx.operator,
      data: tx,
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * 4. Vérification HMAC SHA-256 du Webhook (X-Ikeepay-Signature)
 */
async function verifyWebhookSignature(rawBody, signature) {
  if (!signature || !rawBody) return false;
  const creds = await getCredentials();
  if (!creds.secretKey) return false;

  try {
    const expectedSignature = crypto
      .createHmac('sha256', creds.secretKey)
      .update(rawBody)
      .digest('hex');

    const sigBuf = Buffer.from(String(signature), 'utf8');
    const expBuf = Buffer.from(expectedSignature, 'utf8');
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch (_) {
    return false;
  }
}

module.exports = {
  getCredentials,
  isConfigured,
  buildCheckoutUrl,
  initPayin,
  initPayout,
  verifyTransaction,
  verifyWebhookSignature,
};
