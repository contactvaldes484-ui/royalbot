/**
 * sebpayService — intégration Mobile Money via SebPay (https://new.sebpay.bj/fr/docs).
 *
 * Encaissement (collection) Mobile Money + vérification par webhook signé HMAC-SHA256.
 *
 * Config (env) :
 *   SEBPAY_BASE_URL     — défaut https://newapi.sebpay.bj/api/v1
 *   SEBPAY_PUBLIC_KEY   — pk_live_... / pk_test_...
 *   SEBPAY_SECRET_KEY   — sk_live_... / sk_test_...  (jamais exposé au front)
 *   XOF_PER_USD         — taux de conversion USD→XOF (défaut 600)
 *   PUBLIC_URL          — base URL publique du serveur (pour le callback webhook)
 */
const crypto = require('crypto');

async function getCredentials() {
  let url = process.env.SEBPAY_BASE_URL;
  let pub = process.env.SEBPAY_PUBLIC_KEY;
  let sec = process.env.SEBPAY_SECRET_KEY;
  if (!pub || !sec) {
    try {
      const PlatformSettings = require('../models/PlatformSettings');
      const s = await PlatformSettings.findOne({ key: 'main' });
      if (s) {
        url = url || s.sebpayBaseUrl;
        pub = pub || s.sebpayPublicKey;
        sec = sec || s.sebpaySecretKey;
      }
    } catch (_) {}
  }
  return {
    baseUrl: (url || 'https://newapi.sebpay.bj/api/v1').replace(/\/$/, ''),
    publicKey: pub || '',
    secretKey: sec || ''
  };
}

function baseUrl() {
  return (process.env.SEBPAY_BASE_URL || 'https://newapi.sebpay.bj/api/v1').replace(/\/$/, '');
}

async function isConfigured() {
  const creds = await getCredentials();
  return !!(creds.publicKey && creds.secretKey);
}

async function authHeaders() {
  const creds = await getCredentials();
  return {
    'X-Public-Key': creds.publicKey,
    'X-Secret-Key': creds.secretKey,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

/** Taux USD→XOF (config, défaut 600). */
function xofPerUsd() {
  const v = parseFloat(process.env.XOF_PER_USD);
  return Number.isFinite(v) && v > 0 ? v : 600;
}

/** Convertit un montant USD en XOF (entier). */
function usdToXof(usd) {
  return Math.round(Number(usd) * xofPerUsd());
}

/** URL de callback webhook exposée à SebPay. */
function callbackUrl() {
  const base = (process.env.PUBLIC_URL || process.env.BACKEND_URL || '').replace(/\/$/, '');
  return base ? `${base}/api/webhooks/sebpay` : undefined;
}

async function apiGet(path) {
  const creds = await getCredentials();
  const headers = await authHeaders();
  const resp = await fetch(`${creds.baseUrl}${path}`, { headers });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok || json?.success === false) {
    throw new Error(json?.message || `SebPay GET ${path} → HTTP ${resp.status}`);
  }
  return json?.data ?? json;
}

/** Liste les opérateurs Mobile Money (optionnellement filtrés par pays). */
async function listOperators(country) {
  const q = country ? `?country=${encodeURIComponent(country)}` : '';
  return apiGet(`/operators${q}`);
}

/** Liste les pays supportés. */
async function listCountries() {
  return apiGet('/countries');
}

/**
 * Initie une collecte Mobile Money.
 * @param {{ amountUsd?:number, amountXof?:number, currency?:string, phone:string,
 *           operator:string, country:string, externalRef:string, otpCode?:string }} p
 * @returns {Promise<{ transactionId:string, status:string, providerLink?:string, amount:number, currency:string, raw:object }>}
 */
async function initCollection(p) {
  const creds = await getCredentials();
  if (!creds.publicKey || !creds.secretKey) throw new Error('SebPay non configuré (clés manquantes).');
  if (!p.phone || !p.operator || !p.country || !p.externalRef) {
    throw new Error('phone, operator, country et externalRef sont requis.');
  }

  const currency = p.currency || 'XOF';
  const amount = p.amountXof != null
    ? Math.round(p.amountXof)
    : usdToXof(p.amountUsd);

  const body = {
    amount,
    currency,
    phone: String(p.phone).replace(/[^0-9]/g, ''), // format international sans +
    operator: p.operator,
    country: p.country,
    external_reference: p.externalRef,
  };
  const cb = callbackUrl();
  if (cb) body.callback_url = cb;
  if (p.otpCode) body.otp_code = p.otpCode;

  const headers = await authHeaders();
  const resp = await fetch(`${creds.baseUrl}/collections`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok || json?.success === false) {
    throw new Error(json?.message || `SebPay collection échouée (HTTP ${resp.status}).`);
  }

  const data = json?.data || json;
  return {
    transactionId: data.transaction_id,
    status: data.status || 'pending',
    providerLink: data.provider_link || null,
    amount,
    currency,
    raw: data,
  };
}

/**
 * Vérifie la signature HMAC-SHA256 d'un webhook SebPay.
 * @param {Buffer|string} rawBody — corps brut de la requête (avant parsing JSON)
 * @param {string} signature — header X-SebPay-Signature
 */
async function verifySignature(rawBody, signature) {
  const creds = await getCredentials();
  const sec = creds.secretKey;
  if (!signature || !sec) return false;
  const payload = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody), 'utf8');
  const expected = crypto
    .createHmac('sha256', sec)
    .update(payload)
    .digest('hex');
  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(String(signature).trim(), 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

module.exports = {
  isConfigured,
  listOperators,
  listCountries,
  initCollection,
  verifySignature,
  usdToXof,
  xofPerUsd,
  callbackUrl,
};
