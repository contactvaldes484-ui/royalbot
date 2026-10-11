#!/usr/bin/env node
/**
 * set-metaapi-token.js — Injecte ton token MetaApi dans server/.env
 * sans avoir à le coller dans le chat ni à éditer .env à la main.
 *
 * UTILISATION (2 options) :
 *
 *  Option A — depuis un fichier token.txt :
 *    1. Crée un fichier  server/token.txt  et colle SEULEMENT le token dedans.
 *    2. Lance :  node scripts/set-metaapi-token.js
 *    3. Le script met le token dans .env puis SUPPRIME token.txt.
 *
 *  Option B — en argument :
 *    node scripts/set-metaapi-token.js "TON_TOKEN_ICI"
 */
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '..', 'server', '.env');
const TOKEN_FILE = path.join(__dirname, '..', 'server', 'token.txt');

function readToken() {
  const arg = process.argv[2];
  if (arg && arg.trim()) return arg.trim();
  if (fs.existsSync(TOKEN_FILE)) {
    const t = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
    if (t) return { token: t, fromFile: true };
  }
  return null;
}

function decodeExp(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
    if (payload.exp) {
      const d = new Date(payload.exp * 1000);
      return `Token valide jusqu'au ${d.toISOString().slice(0, 10)}`;
    }
  } catch (_) {}
  return null;
}

const res = readToken();
if (!res) {
  console.error('❌ Aucun token fourni.\n   → Crée server/token.txt avec le token dedans, puis relance ;\n   → ou : node scripts/set-metaapi-token.js "TON_TOKEN"');
  process.exit(1);
}
const token = typeof res === 'string' ? res : res.token;
const fromFile = typeof res === 'object' && res.fromFile;

if (!fs.existsSync(ENV_PATH)) {
  console.error('❌ server/.env introuvable. Crée-le d\'abord (copie de .env.example).');
  process.exit(1);
}

let env = fs.readFileSync(ENV_PATH, 'utf8');
if (/^METAAPI_TOKEN=.*$/m.test(env)) {
  env = env.replace(/^METAAPI_TOKEN=.*$/m, `METAAPI_TOKEN=${token}`);
} else {
  env += `\nMETAAPI_TOKEN=${token}\n`;
}
fs.writeFileSync(ENV_PATH, env);

if (fromFile) {
  fs.unlinkSync(TOKEN_FILE);
  console.log('🧹 token.txt supprimé.');
}

const exp = decodeExp(token);
console.log('✅ METAAPI_TOKEN écrit dans server/.env');
console.log(`   Longueur du token : ${token.length} caractères`);
if (exp) console.log('   ' + exp);
console.log('\n➡️  Redémarre le serveur ; tu dois voir : "✅ MetaApi MT5/MT4 Manager initialized"');
