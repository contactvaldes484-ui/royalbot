'use strict';
const crypto = require('crypto');

// ENCRYPTION_KEY: 32 octets. Accepte 64 hex, 44 base64, ou string brute (hashée SHA-256).
function getKey() {
  const raw = process.env.ENCRYPTION_KEY || '';
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
  try {
    const b = Buffer.from(raw, 'base64');
    if (b.length === 32) return b;
  } catch (_) {}
  return crypto.createHash('sha256').update(raw, 'utf8').digest();
}

const ALG = 'aes-256-gcm';

function encrypt(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALG, getKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

function decrypt(payload) {
  if (!payload || typeof payload !== 'string') throw new Error('cryptoVault: payload invalide');
  const [v, ivB64, tagB64, dataB64] = payload.split(':');
  if (v !== 'v1') throw new Error('cryptoVault: version inconnue');
  const decipher = crypto.createDecipheriv(ALG, getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}

module.exports = { encrypt, decrypt };
