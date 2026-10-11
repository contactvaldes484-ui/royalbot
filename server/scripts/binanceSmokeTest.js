'use strict';
/**
 * Smoke-test Binance — vérifie le chiffrement + la connectivité TESTNET.
 * Endpoints PUBLICS uniquement (pas besoin de clés API).
 *
 *   node scripts/binanceSmokeTest.js
 *
 * Pour le test SIGNÉ (compte/ordres), fournir des clés testnet :
 *   BX_KEY=xxx BX_SECRET=yyy node scripts/binanceSmokeTest.js
 */
require('dotenv').config();
const vault = require('../src/lib/cryptoVault');
const BinanceService = require('../src/services/BinanceService');
const { _stepRound, normalizeOrder } = require('../src/lib/binanceFilters');

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log(`  \x1b[32m✓\x1b[0m ${m}`); };
const ko = (m, e) => { fail++; console.log(`  \x1b[31m✗\x1b[0m ${m}${e ? ' — ' + (e.message || e) : ''}`); };

async function main() {
  console.log('\n=== 1. Chiffrement AES-256-GCM (cryptoVault) ===');
  try {
    const secret = 'testnet-api-secret-ABC123';
    const enc = vault.encrypt(secret);
    if (enc.startsWith('v1:') && enc !== secret) ok('encrypt() produit un payload v1 chiffré');
    else ko('encrypt() format inattendu');
    const dec = vault.decrypt(enc);
    if (dec === secret) ok('decrypt() restitue le clair'); else ko('decrypt() != clair');
    try { vault.decrypt(enc.slice(0, -4) + 'AAAA'); ko('payload altéré accepté (authTag KO)'); }
    catch { ok('payload altéré rejeté (authTag GCM vérifié)'); }
  } catch (e) { ko('cryptoVault', e); }

  console.log('\n=== 2. Arrondi aux filtres (binanceFilters._stepRound) ===');
  try {
    const q = _stepRound(1.23456, 0.001);
    const p = _stepRound(27123.456, 0.01);
    if (q === 1.234) ok(`_stepRound(1.23456, 0.001) = ${q}`); else ko(`_stepRound qty inattendu: ${q}`);
    if (p === 27123.45) ok(`_stepRound(27123.456, 0.01) = ${p}`); else ko(`_stepRound price inattendu: ${p}`);
  } catch (e) { ko('binanceFilters._stepRound', e); }

  console.log('\n=== 3. Connectivité TESTNET (public, sans clés) ===');
  const bx = new BinanceService({ isTestnet: true });
  for (const market of ['spot', 'futures']) {
    console.log(`  — marché ${market} —`);
    try { await bx.ping(market); ok(`ping ${market}`); } catch (e) { ko(`ping ${market}`, e); }
    try { const off = await bx.syncTime(market); ok(`syncTime ${market} (offset ${off}ms)`); } catch (e) { ko(`syncTime ${market}`, e); }
    try {
      const k = await bx.getKlines(market, 'BTCUSDT', '5m', 5);
      if (Array.isArray(k) && k.length) ok(`getKlines ${market} BTCUSDT → ${k.length} bougies (close=${k[k.length-1][4]})`);
      else ko(`getKlines ${market} vide`);
    } catch (e) { ko(`getKlines ${market}`, e); }
    try { const pr = await bx.getPrice(market, 'BTCUSDT'); ok(`getPrice ${market} BTCUSDT = ${pr.price}`); } catch (e) { ko(`getPrice ${market}`, e); }
    try {
      const info = await bx.getExchangeInfo(market, 'BTCUSDT');
      const sym = info.symbols?.[0];
      ok(`getExchangeInfo ${market} BTCUSDT (${sym?.filters?.length || 0} filtres)`);
    } catch (e) { ko(`getExchangeInfo ${market}`, e); }
  }

  console.log('\n=== 4. Test SIGNÉ (compte) — nécessite des clés testnet ===');
  const KEY = process.env.BX_KEY, SECRET = process.env.BX_SECRET;
  if (!KEY || !SECRET) {
    console.log('  \x1b[33m⊘ ignoré\x1b[0m — fournis BX_KEY et BX_SECRET (clés testnet.binance.vision / testnet.binancefuture.com)');
  } else {
    const sbx = new BinanceService({ apiKey: KEY, apiSecret: SECRET, isTestnet: true });
    try {
      const t = await sbx.testConnection('both');
      ok(`testConnection: reading=${t.reading} spot=${t.spot} futures=${t.futures} withdraw=${t.withdraw}`);
      ok(`soldes: spotUSDT=${t.spotUSDT} futuresUSDT=${t.futuresUSDT}`);
      if (t.withdraw) ko('⚠ permission RETRAIT activée — à désactiver côté Binance');
      if (t.errors.length) t.errors.forEach(e => console.log(`    note: ${e}`));
    } catch (e) { ko('testConnection', e); }
  }

  console.log(`\n=== RÉSULTAT : ${pass} OK, ${fail} échec(s) ===\n`);
  process.exit(fail ? 1 : 0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
